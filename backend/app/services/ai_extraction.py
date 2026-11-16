"""Evidence-bound financial extraction with an optional provider-independent LLM."""
from __future__ import annotations
import hashlib
import json
import os
import re
import urllib.request
import urllib.error
import time
from typing import Any, Callable, Dict, List, Optional, Tuple
from .clause_classifier import CATEGORIES, classify_clause

CURRENCY_SYMBOLS = {"$": "USD", "€": "EUR", "£": "GBP", "₺": "TRY", "₹": "INR"}
MONEY_RE = re.compile(r"(?P<symbol>[$€£₺₹])?\s*(?P<amount>\d{1,3}(?:,\d{3})+(?:\.\d+)?|\d+(?:\.\d+)?)\s*(?P<code>USD|EUR|GBP|TRY|INR|AUD|CAD|JPY|CHF)?", re.I)
PERCENT_RE = re.compile(r"(\d+(?:\.\d+)?)\s*(?:%|per\s+cent|percent)", re.I)
PREFIX_MONEY_RE = re.compile(r"(?P<code>USD|EUR|GBP|TRY|INR|AUD|CAD|JPY|CHF)\s*(?P<amount>\d{1,3}(?:,\d{3})+(?:\.\d+)?|\d+(?:\.\d+)?)", re.I)


def _number(raw: str) -> float:
    return float(raw.replace(",", ""))


def _money(match: re.Match[str]) -> Tuple[float, Optional[str]]:
    symbol, code = match.group("symbol"), match.group("code")
    currency = CURRENCY_SYMBOLS.get(symbol or "", code.upper() if code else None)
    return _number(match.group("amount")), currency


def _search_number(patterns: List[str], text: str) -> Optional[float]:
    for pattern in patterns:
        match = re.search(pattern, text, re.I)
        if match:
            try:
                return _number(match.group(1))
            except (ValueError, IndexError):
                pass
    return None


def split_clauses(text: str) -> List[Dict[str, Any]]:
    """Split page-aware text into source-preserving clauses."""
    clauses = []
    for page_number, page in enumerate(text.split("\f"), start=1):
        page = page.replace("\r", "\n")
        candidates = re.split(r"\n\s*\n|(?<=[.!?])\s+(?=[A-Z0-9])|\n(?=\s*(?:\d+[.)]|[A-Z][A-Za-z /-]{2,45}:))", page)
        for candidate in candidates:
            quote = re.sub(r"\s+", " ", candidate).strip()
            if 12 <= len(quote) <= 1800:
                clauses.append({"text": quote, "page": page_number})
    return clauses[:700]


def extract_general(text: str, clauses: List[Dict[str, Any]]) -> Dict[str, Any]:
    lower = text.lower()
    currency = None
    for code in ("USD", "EUR", "GBP", "TRY", "INR", "AUD", "CAD", "JPY", "CHF"):
        if re.search(rf"\b{code}\b", text, re.I):
            currency = code
            break
    if currency is None:
        for symbol, code in CURRENCY_SYMBOLS.items():
            if symbol in text:
                currency = code
                break

    principal = None
    money_prefix = r"(?:[$€£₺₹]\s*|(?:USD|EUR|GBP|TRY|INR|AUD|CAD|JPY|CHF)\s+)?"
    principal_patterns = [
        rf"(?:loan\s+)?principal(?:\s+amount)?\s*(?:of|is|:)?\s*{money_prefix}(\d[\d,]*(?:\.\d+)?)",
        rf"(?:loan|credit|financing)\s+amount\s*(?:of|is|:)?\s*{money_prefix}(\d[\d,]*(?:\.\d+)?)",
        rf"amount\s+financed\s*(?:of|is|:)?\s*{money_prefix}(\d[\d,]*(?:\.\d+)?)",
        rf"credit\s+limit\s*(?:of|is|:)?\s*{money_prefix}(\d[\d,]*(?:\.\d+)?)",
    ]
    principal = _search_number(principal_patterns, text)
    duration = _search_number([r"(?:loan\s+)?(?:term|duration|repayment\s+period)\s*(?:of|is|:)?\s*(\d+)\s*(?:months|month)\b"], text)
    if duration is None:
        years = _search_number([r"(?:loan\s+)?(?:term|duration|repayment\s+period)\s*(?:of|is|:)?\s*(\d+)\s*(?:years|year)\b"], text)
        duration = years * 12 if years is not None else None
    duration = int(duration) if duration is not None else None

    interest_clauses = " ".join(c["text"] for c in clauses if any(k in c["text"].lower() for k in ("interest rate", "interest accrues", "nominal rate")))
    rate_text = interest_clauses or text
    annual = _search_number([
        r"(?:annual|yearly)\s+(?:nominal\s+)?interest\s+rate\s*(?:of|is|:)?\s*(\d+(?:\.\d+)?)\s*%",
        r"interest\s+rate\s*(?:of|is|:)?\s*(\d+(?:\.\d+)?)\s*%\s*(?:per\s+annum|annually|annual|p\.a\.)",
        r"annual\s+rate\s*(?:of|is|:)?\s*(\d+(?:\.\d+)?)\s*%",
    ], rate_text)
    monthly = _search_number([
        r"monthly\s+interest\s+rate\s*(?:of|is|:)?\s*(\d+(?:\.\d+)?)\s*%",
        r"interest\s+rate\s*(?:of|is|:)?\s*(\d+(?:\.\d+)?)\s*%\s*(?:per\s+month|monthly)",
    ], rate_text)
    if annual is None and monthly is not None:
        # Derived values are explicitly identified in assumptions, not presented as quoted.
        annual = round(monthly * 12, 6)
    effective = _search_number([
        r"(?:effective\s+annual\s+rate|effective\s+apr|apr)\s*(?:of|is|:)?\s*(\d+(?:\.\d+)?)\s*%"
    ], text)
    variable = any(k in lower for k in ("variable rate", "variable interest", "rate may change", "rate may be adjusted", "reference rate", "benchmark rate"))
    fixed = any(k in lower for k in ("fixed rate", "fixed interest", "rate is fixed", "interest rate is fixed"))
    rate_type = "variable" if variable else ("fixed" if fixed else "unknown")
    frequency = None
    for candidate in ("monthly", "weekly", "biweekly", "quarterly", "annually"):
        if re.search(rf"(?:repayment|instalments?|installments?|payments?).{{0,45}}\b{candidate}\b|\b{candidate}\b.{{0,35}}(?:repayment|instalments?|installments?)", lower):
            frequency = candidate
            break
    if frequency is None and re.search(r"\bmonthly\s+(?:instalments?|installments?|payments?)\b", lower):
        frequency = "monthly"

    if "credit card" in lower:
        contract_type = "Credit card agreement"
    elif "mortgage" in lower or "home loan" in lower:
        contract_type = "Mortgage / home loan"
    elif "personal loan" in lower:
        contract_type = "Personal loan agreement"
    elif "student loan" in lower:
        contract_type = "Student loan agreement"
    elif "account" in lower and any(k in lower for k in ("maintenance", "account agreement", "banking services")):
        contract_type = "Bank account agreement"
    elif "loan" in lower or "credit agreement" in lower:
        contract_type = "Loan / credit agreement"
    else:
        contract_type = "Financial services agreement"

    institution = None
    patterns = [
        r"(?:between|by and between)\s+([A-Z][A-Za-z0-9&.' -]{2,70}?(?:Bank|Finance|Credit|Financial|Capital)[A-Za-z0-9&.' -]*)\s*(?:,|\n|and)",
        r"^([A-Z][A-Za-z0-9&.' -]{2,70}(?:Bank|Finance|Credit Union|Financial Services))$",
    ]
    for pattern in patterns:
        match = re.search(pattern, text, re.M)
        if match:
            institution = match.group(1).strip()
            break
    if institution is None:
        for line in text.splitlines()[:12]:
            if re.search(r"\b(?:Bank|Finance|Credit Union|Financial Services)\b", line) and 4 < len(line.strip()) < 90:
                institution = line.strip(" :-")
                break
    return {
        "institution": institution, "contractType": contract_type, "currency": currency,
        "principal": principal, "durationMonths": duration, "repaymentFrequency": frequency,
        "annualInterestRate": annual, "monthlyInterestRate": monthly,
        "interestRateType": rate_type, "effectiveAnnualRate": effective,
    }


LABELS = {
    "Interest": "Interest charge", "Maintenance Fee": "Account maintenance fee",
    "Processing Fee": "Loan processing fee", "Administrative Fee": "Administrative fee",
    "Insurance": "Insurance charge", "Late Payment Penalty": "Late-payment penalty",
    "Early Repayment Penalty": "Early-repayment penalty", "Transaction Commission": "Transaction commission",
    "Variable Interest Condition": "Variable interest condition", "Repayment Condition": "Repayment condition",
    "Other Financial Charge": "Other financial charge", "Unclear or Ambiguous Clause": "Ambiguous financial clause",
}
EXPLANATIONS = {
    "Interest": "This is the cost charged for borrowing, separate from fees and penalties.",
    "Maintenance Fee": "This charge relates to keeping or servicing the account and can add up over time.",
    "Processing Fee": "This is a charge for arranging or processing the agreement.",
    "Administrative Fee": "This is an administrative or documentation charge in addition to interest.",
    "Insurance": "This is an insurance or payment-protection cost associated with the agreement.",
    "Late Payment Penalty": "This charge may apply when a payment is not made by its due date.",
    "Early Repayment Penalty": "This charge may apply if you repay some or all of the balance before schedule.",
    "Transaction Commission": "This cost depends on transactions such as transfers or withdrawals.",
    "Variable Interest Condition": "The interest rate is not fixed and may change under the conditions described.",
    "Repayment Condition": "This wording affects when or how repayments must be made.",
    "Other Financial Charge": "This is an additional financial obligation identified in the document.",
    "Unclear or Ambiguous Clause": "The wording leaves a financial obligation or provider power unclear and needs clarification.",
}


def _recurrence(text: str, category: str) -> str:
    lower = text.lower()
    if category in ("Late Payment Penalty", "Early Repayment Penalty"):
        return "conditional"
    if any(x in lower for x in ("per month", "monthly", "each month", "every month")):
        return "monthly"
    if any(x in lower for x in ("per year", "annually", "annual fee", "each year", "per annum")) and "interest" not in lower:
        return "annual"
    if any(x in lower for x in ("per transaction", "each transaction", "per transfer", "each transfer", "per withdrawal")):
        return "per-transaction"
    if any(x in lower for x in ("one-time", "one time", "upfront", "at signing", "at origination", "deducted from")):
        return "one-time"
    return "unknown"


def _term_value(text: str, category: str) -> Tuple[Optional[float], Optional[str], Optional[str], str]:
    percent = PERCENT_RE.search(text)
    money_matches = list(MONEY_RE.finditer(text))
    money = next((m for m in money_matches if m.group("symbol") or m.group("code")), None)
    if category in ("Interest", "Variable Interest Condition", "Late Payment Penalty", "Early Repayment Penalty", "Transaction Commission") and percent:
        value = _number(percent.group(1))
        return value, "percent", None, percent.group(0)
    if money:
        value, currency = _money(money)
        return value, "currency", currency, money.group(0).strip()
    prefixed = PREFIX_MONEY_RE.search(text)
    if prefixed:
        return _number(prefixed.group("amount")), "currency", prefixed.group("code").upper(), prefixed.group(0).strip()
    if percent:
        value = _number(percent.group(1))
        return value, "percent", None, percent.group(0)
    days = re.search(r"(\d+)\s*(calendar\s+)?days", text, re.I)
    if days and category == "Repayment Condition":
        return _number(days.group(1)), "days", None, days.group(0)
    return None, None, None, "Value not explicitly stated"


def extract_terms_rule_based(text: str, progress: Optional[Callable[[str, str], None]] = None) -> Tuple[Dict[str, Any], List[Dict[str, Any]], int]:
    clauses = split_clauses(text)
    if progress: progress("identifying", f"Scanning {len(clauses)} candidate clauses for financial obligations")
    general = extract_general(text, clauses)
    terms = []
    for index, clause in enumerate(clauses):
        quote = clause["text"]
        category, confidence, matched = classify_clause(quote)
        financial_signal = bool(PERCENT_RE.search(quote) or PREFIX_MONEY_RE.search(quote) or re.search(r"[$€£₺₹]\s*\d|\b\d+(?:\.\d+)?\s*(?:USD|EUR|GBP)\b", quote, re.I))
        relevant = bool(matched) and (financial_signal or category in ("Variable Interest Condition", "Repayment Condition", "Unclear or Ambiguous Clause"))
        if not relevant:
            continue
        value, unit, term_currency, display = _term_value(quote, category)
        recurrence = _recurrence(quote, category)
        term_id = "t-" + hashlib.sha1(f"{clause['page']}:{index}:{quote[:90]}".encode()).hexdigest()[:10]
        terms.append({
            "id": term_id, "category": category, "label": LABELS[category], "value": value,
            "displayValue": display, "unit": unit, "currency": term_currency or general.get("currency"),
            "recurrence": recurrence, "quote": quote, "page": clause["page"],
            "confidence": confidence if value is not None else round(confidence * 0.86, 2),
            "explanation": EXPLANATIONS[category], "evidenceType": "explicit" if value is not None else "inferred",
        })
    if progress: progress("classifying", f"Assigned {len(terms)} clauses to financial categories")
    return general, terms, len(clauses)


def _call_openai_compatible_once(text: str) -> Dict[str, Any]:
    """Single structured provider request; the public wrapper handles retries."""
    api_key = os.getenv("AI_API_KEY")
    if not api_key:
        raise RuntimeError("AI_API_KEY is not configured")
    base = os.getenv("AI_BASE_URL", "https://api.openai.com/v1").rstrip("/")
    model = os.getenv("AI_MODEL", "gpt-4o-mini")
    schema_hint = {"terms": [{"category": "|".join(CATEGORIES), "label": "string", "value": "number|null", "unit": "percent|currency|months|days|null", "recurrence": "one-time|monthly|annual|per-transaction|conditional|unknown", "quote": "exact source substring", "confidence": "0..1", "explanation": "simple language"}]}
    prompt = "Extract only explicitly evidenced financial clauses. Never guess missing values. Return JSON with a terms array. Quotes must be exact substrings of the source. Use null when no numeric value is stated. Source:\n" + text[:60000]
    body = json.dumps({"model": model, "temperature": 0, "response_format": {"type": "json_object"}, "messages": [{"role": "system", "content": "You are a cautious financial-contract extraction engine. Output valid JSON only. Expected shape: " + json.dumps(schema_hint)}, {"role": "user", "content": prompt}]}).encode()
    request = urllib.request.Request(base + "/chat/completions", data=body, headers={"Authorization": f"Bearer {api_key}", "Content-Type": "application/json"})
    with urllib.request.urlopen(request, timeout=float(os.getenv("AI_TIMEOUT_SECONDS", "25"))) as response:
        payload = json.loads(response.read().decode())
    content = payload["choices"][0]["message"]["content"]
    try:
        return json.loads(content)
    except json.JSONDecodeError:
        match = re.search(r"\{.*\}", content, re.S)
        if not match:
            raise ValueError("AI response did not contain valid JSON")
        return json.loads(match.group(0))


def _call_openai_compatible(text: str) -> Dict[str, Any]:
    """Retry one transient provider/JSON failure, then disclose fallback mode."""
    last_error: Exception | None = None
    for attempt in range(2):
        try:
            return _call_openai_compatible_once(text)
        except urllib.error.HTTPError as exc:
            if exc.code not in (408, 429) and exc.code < 500:
                raise
            last_error = exc
        except (urllib.error.URLError, TimeoutError, json.JSONDecodeError, KeyError, ValueError) as exc:
            last_error = exc
        if attempt == 0:
            time.sleep(0.6)
    assert last_error is not None
    raise last_error


def _validate_ai_terms(payload: Dict[str, Any], source: str) -> List[Dict[str, Any]]:
    validated = []
    for index, item in enumerate(payload.get("terms", [])):
        if not isinstance(item, dict) or item.get("category") not in CATEGORIES:
            continue
        quote = item.get("quote")
        if not isinstance(quote, str) or quote not in source:
            continue
        value = item.get("value")
        if value is not None and (not isinstance(value, (int, float)) or isinstance(value, bool)):
            continue
        unit = item.get("unit") if item.get("unit") in ("percent", "currency", "months", "days") else None
        recurrence = item.get("recurrence") if item.get("recurrence") in ("one-time", "monthly", "annual", "per-transaction", "conditional", "unknown") else "unknown"
        confidence = item.get("confidence", 0.75)
        confidence = max(0.0, min(1.0, float(confidence))) if isinstance(confidence, (int, float)) else 0.75
        page = next((c["page"] for c in split_clauses(source) if c["text"] == quote), None)
        validated.append({
            "id": f"ai-{index}-" + hashlib.sha1(quote.encode()).hexdigest()[:8], "category": item["category"],
            "label": str(item.get("label") or LABELS[item["category"]])[:120], "value": value,
            "displayValue": (f"{value:g} {unit}" if value is not None else "Value not explicitly stated"),
            "unit": unit, "currency": None, "recurrence": recurrence, "quote": quote, "page": page,
            "confidence": round(confidence, 2), "explanation": str(item.get("explanation") or EXPLANATIONS[item["category"]])[:500],
            "evidenceType": "explicit" if value is not None else "inferred",
        })
    return validated


def extract_financial_information(text: str, progress: Optional[Callable[[str, str], None]] = None) -> Dict[str, Any]:
    general, terms, clause_count = extract_terms_rule_based(text, progress)
    mode = "rule-based"
    notice = "Limited analysis mode: deterministic keyword and pattern extraction was used because no AI provider completed an extraction. Review all evidence before relying on the report."
    if os.getenv("AI_API_KEY"):
        if progress: progress("classifying", "Validating provider extraction against verbatim source evidence")
        try:
            ai_terms = _validate_ai_terms(_call_openai_compatible(text), text)
            existing = {(t["category"], t["quote"]) for t in terms}
            additions = [t for t in ai_terms if (t["category"], t["quote"]) not in existing]
            for term in additions:
                if not term.get("currency"):
                    term["currency"] = general.get("currency")
            terms.extend(additions)
            mode = "ai-assisted"
            notice = f"AI-assisted mode: {len(additions)} validated model-extracted clause(s) supplemented the rule-based pass. Every retained AI item has verbatim source evidence; calculations remain deterministic."
        except Exception as exc:
            notice = f"Limited analysis mode: the configured AI provider was unavailable or returned invalid output ({type(exc).__name__}). The report contains only the rule-based pass; no AI results were substituted."
    return {"general": general, "terms": terms, "clauseCount": clause_count, "analysisMode": mode, "modeNotice": notice}

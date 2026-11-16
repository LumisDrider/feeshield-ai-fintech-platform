"""End-to-end document intelligence orchestration."""
from __future__ import annotations
from typing import Any, Callable, Dict, List, Optional
from .ai_extraction import extract_financial_information
from .risk_engine import identify_risks
from .cost_calculator import calculate_costs

FEE_CATEGORIES = {"Maintenance Fee", "Processing Fee", "Administrative Fee", "Insurance", "Transaction Commission", "Other Financial Charge"}


def _missing_information(general: Dict[str, Any]) -> List[str]:
    fields = [
        ("principal", "Principal or account amount is not explicitly available."),
        ("durationMonths", "Contract duration is not explicitly available."),
        ("repaymentFrequency", "Repayment frequency is not explicitly available."),
        ("currency", "Currency could not be determined from the document."),
    ]
    missing = [message for key, message in fields if general.get(key) is None]
    if general.get("annualInterestRate") is None and general.get("monthlyInterestRate") is None:
        missing.append("Annual or monthly interest rate is not explicitly available.")
    if general.get("interestRateType") == "unknown":
        missing.append("The document does not clearly state whether interest is fixed or variable.")
    return missing


def _summary(general: Dict[str, Any], terms: List[Dict[str, Any]], risks: List[Dict[str, Any]], costs: Dict[str, Any]) -> str:
    principal = general.get("principal")
    currency = general.get("currency") or "currency not stated"
    amount = f"{principal:,.2f} {currency}" if principal is not None else "an unspecified principal amount"
    rate = general.get("annualInterestRate")
    rate_text = f"an extracted annual nominal rate of {rate:g}%" if rate is not None else "no explicitly extractable annual interest rate"
    high = sum(1 for r in risks if r["level"] in ("HIGH", "CRITICAL"))
    cost = costs.get("additionalCost")
    cost_text = f" Known and modelled costs above principal are estimated at {cost:,.2f} {currency}." if cost is not None else " A complete additional-cost estimate is not possible from the available information."
    return f"This {general['contractType'].lower()} concerns {amount} and {rate_text}. The engine identified {len(terms)} evidence-linked financial clauses, including {high} high-priority conditions for review.{cost_text} Estimates depend on the stated assumptions and are not a lender quotation."


def analyse_text(text: str, progress: Optional[Callable[[str, str], None]] = None) -> Dict[str, Any]:
    if not isinstance(text, str) or len(text.strip()) < 40:
        raise ValueError("At least 40 characters of readable document text are required.")
    text = text[:int(__import__("os").getenv("MAX_DOCUMENT_CHARACTERS", "180000"))]
    if progress: progress("identifying", "Validating text and locating financial clauses")
    extraction = extract_financial_information(text, progress)
    general, terms = extraction["general"], extraction["terms"]
    risks = identify_risks(terms, general)
    if progress: progress("calculating", "Applying deterministic repayment and fee calculations")
    costs = calculate_costs(general, terms)
    missing = _missing_information(general)
    for item in costs["missing"]:
        message = item if item.endswith(".") else item + " is needed for a complete estimate."
        if message not in missing: missing.append(message)
    recommendations = list(dict.fromkeys(r["suggestedQuestion"] for r in risks if r["level"] != "LOW"))[:7]
    if general.get("annualInterestRate") is None:
        recommendations.append("What is the annual nominal interest rate, and is a separate effective annual rate disclosed?")
    if general.get("durationMonths") is None:
        recommendations.append("Can you provide the complete repayment schedule and total contract duration?")
    summary = _summary(general, terms, risks, costs)
    if progress: progress("finalising", "Report, source evidence, and assumptions assembled")
    fee_count = sum(1 for t in terms if t["category"] in FEE_CATEGORIES or "Penalty" in t["category"])
    return {
        "engineVersion": "1.0.0", "analysisMode": extraction["analysisMode"], "modeNotice": extraction["modeNotice"],
        "general": general, "terms": terms, "risks": risks, "costs": costs,
        "missingInformation": missing, "summary": summary, "recommendations": recommendations,
        "statistics": {"clauseCount": extraction["clauseCount"], "feeCount": fee_count, "riskCount": sum(1 for risk in risks if risk["level"] != "LOW"),
                       "explicitCount": sum(1 for t in terms if t["evidenceType"] == "explicit"),
                       "inferredCount": sum(1 for t in terms if t["evidenceType"] == "inferred")},
    }

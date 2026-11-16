"""Assumption-aware comparison of two completed analyses."""
from __future__ import annotations
from typing import Any, Dict


def _sum_terms(result: Dict[str, Any], categories: set, recurrence: str | None = None) -> float | None:
    values = []
    for term in result["terms"]:
        if term["category"] in categories and term.get("value") is not None and (recurrence is None or term.get("recurrence") == recurrence):
            values.append(term["value"])
    return round(sum(values), 4) if values else None


def compare_analyses(a: Dict[str, Any], b: Dict[str, Any], filename_a: str = "Contract A", filename_b: str = "Contract B", id_a: str = "", id_b: str = "") -> Dict[str, Any]:
    ca, cb = a["costs"], b["costs"]
    ga, gb = a["general"], b["general"]
    def metric(key: str, label: str, av: Any, bv: Any, fmt: str, lower: bool = True) -> Dict[str, Any]:
        difference = round(av - bv, 4) if isinstance(av, (int, float)) and isinstance(bv, (int, float)) else None
        return {"key": key, "label": label, "a": av, "b": bv, "format": fmt, "lowerIsLessCost": lower, "difference": difference}
    recurring_a = _sum_terms(a, {"Maintenance Fee", "Administrative Fee", "Other Financial Charge"}, "monthly")
    recurring_b = _sum_terms(b, {"Maintenance Fee", "Administrative Fee", "Other Financial Charge"}, "monthly")
    def describe(category: str, result: Dict[str, Any]) -> str | None:
        descriptions = [f"{term['displayValue']} ({term.get('recurrence', 'unknown')})" for term in result["terms"] if term["category"] == category]
        return "; ".join(descriptions) if descriptions else None
    late_a = describe("Late Payment Penalty", a)
    late_b = describe("Late Payment Penalty", b)
    early_a = describe("Early Repayment Penalty", a)
    early_b = describe("Early Repayment Penalty", b)
    metrics = [
        metric("principal", "Principal", ga.get("principal"), gb.get("principal"), "currency", False),
        metric("duration", "Duration (months)", ga.get("durationMonths"), gb.get("durationMonths"), "number", False),
        metric("interest", "Annual nominal interest", ga.get("annualInterestRate"), gb.get("annualInterestRate"), "percent"),
        metric("recurring", "Stated monthly recurring fees", recurring_a, recurring_b, "currency"),
        metric("onetime", "Estimated one-time fees", ca.get("oneTimeFees"), cb.get("oneTimeFees"), "currency"),
        metric("insurance", "Estimated insurance over term", ca.get("insuranceCost"), cb.get("insuranceCost"), "currency"),
        metric("late", "Late-payment value(s)", late_a, late_b, "text", False),
        metric("early", "Early-repayment value(s)", early_a, early_b, "text", False),
        metric("repayment", "Estimated total repayment", ca.get("totalEstimatedRepayment"), cb.get("totalEstimatedRepayment"), "currency"),
        metric("additional", "Estimated cost above principal", ca.get("additionalCost"), cb.get("additionalCost"), "currency"),
        metric("missing", "Missing information items", len(a.get("missingInformation", [])), len(b.get("missingInformation", [])), "number"),
    ]
    same_currency = ga.get("currency") and ga.get("currency") == gb.get("currency")
    same_principal = ga.get("principal") == gb.get("principal")
    same_term = ga.get("durationMonths") == gb.get("durationMonths")
    monthly_a = ca.get("additionalCost") / ga["durationMonths"] if ca.get("additionalCost") is not None and ga.get("durationMonths") else None
    monthly_b = cb.get("additionalCost") / gb["durationMonths"] if cb.get("additionalCost") is not None and gb.get("durationMonths") else None
    normalisation_applied = not same_term and monthly_a is not None and monthly_b is not None
    if not same_currency:
        note = "Direct monetary comparison is not valid because currencies differ or are missing. No exchange-rate conversion has been invented."
    elif normalisation_applied:
        note = "Durations differ. Average modelled additional cost per month is shown as a limited normalisation; it does not make unlike contracts equivalent."
    elif not same_principal:
        note = "Principal amounts differ. Totals are shown side by side without inventing a rescaling; compare cost above principal rather than repayment totals."
    else:
        note = "Currency, principal, and duration align. Comparisons still depend on the extracted terms and calculation assumptions."
    caveats = [
        "A lower estimated cost does not make a contract universally better; eligibility, flexibility, service, risk tolerance, and unmodelled events matter.",
        "Variable rates are held constant in estimates, so future rate changes can reverse the ordering.",
        "Late fees, early-repayment charges, and transaction commissions are shown separately but excluded from event-dependent totals.",
        "Missing or ambiguous conditions can make an apparently cheaper contract impossible to price completely.",
    ]
    comparable = bool(same_currency and same_principal and same_term and ca.get("additionalCost") is not None and cb.get("additionalCost") is not None)
    normalised_comparable = bool(same_currency and same_principal and monthly_a is not None and monthly_b is not None)
    if comparable:
        cheaper, other = (filename_a, filename_b) if ca["additionalCost"] < cb["additionalCost"] else (filename_b, filename_a)
        delta = abs(ca["additionalCost"] - cb["additionalCost"])
        summary = f"Under the current aligned assumptions, {cheaper} has the lower estimated additional cost by {delta:,.2f} {ga['currency']} compared with {other}. This is a modelled comparison, not a universal recommendation."
    elif normalised_comparable:
        cheaper = filename_a if monthly_a < monthly_b else filename_b
        summary = f"{cheaper} has the lower average modelled additional cost per month after limited term normalisation. Different repayment periods mean total obligations are not directly interchangeable."
    else:
        summary = "A reliable cheaper-contract conclusion is not available under aligned assumptions. Review the side-by-side terms and resolve the listed currency, principal, duration, or missing-data differences first."
    return {
        "contractA": {"analysisId": id_a, "filename": filename_a, "label": "Contract A"},
        "contractB": {"analysisId": id_b, "filename": filename_b, "label": "Contract B"},
        "metrics": metrics, "normalisation": {"applied": normalisation_applied, "note": note, "monthlyCostA": monthly_a, "monthlyCostB": monthly_b},
        "summary": summary, "caveats": caveats,
    }

"""Evidence-linked risk identification using explicit, inspectable rules."""
from __future__ import annotations
from typing import Any, Dict, List

LEVEL_ORDER = {"LOW": 0, "MODERATE": 1, "HIGH": 2, "CRITICAL": 3}


def identify_risks(terms: List[Dict[str, Any]], general: Dict[str, Any]) -> List[Dict[str, Any]]:
    risks = []
    principal = general.get("principal") or 0
    for term in terms:
        category = term["category"]
        value = term.get("value")
        recurrence = term.get("recurrence")
        quote = term.get("quote", "")
        lower = quote.lower()
        level = "LOW"
        title = "Review this disclosed financial term"
        why = "This clause may affect the amount or timing of your payments."
        question = "Can you confirm how this condition affects my total cost?"
        rule = "Disclosed financial obligation: review recommended."

        if value == 0 and category not in ("Variable Interest Condition", "Repayment Condition", "Unclear or Ambiguous Clause"):
            level, title = "LOW", "No charge stated for this term"
            why = "The extracted clause explicitly states a zero value. Confirm that no separate schedule introduces another charge."
            question = "Can you confirm in writing that this charge is zero for the full agreement?"
            rule = "LOW when the explicitly extracted financial value is zero."
        elif category == "Variable Interest Condition":
            level, title = "HIGH", "Interest rate can change"
            why = "A rate increase can raise future instalments and total interest; the initial rate is not a guaranteed lifetime cost."
            question = "Which benchmark and margin determine my rate, how often can it change, and is there a cap?"
            rule = "HIGH when the provider may adjust the rate or the contract references a variable benchmark."
        elif category == "Late Payment Penalty":
            level, title = "HIGH", "Late-payment cost"
            why = "A missed due date may trigger charges in addition to ordinary interest."
            question = "How exactly is the late-payment charge calculated, when does it start, and is there a grace period?"
            rule = "HIGH for an explicit late-payment penalty; LOW only when no numerical or discretionary obligation is found."
            if "per day" in lower or "daily" in lower or "each day" in lower:
                level = "CRITICAL"
                title = "Late-payment charge accrues daily"
                rule = "CRITICAL when a late-payment amount accrues daily, because cost can compound with delay duration."
            elif value is not None and term.get("unit") == "percent" and value >= 5:
                level = "CRITICAL"
                rule = "CRITICAL when the stated late-payment percentage is 5% or more."
        elif category == "Early Repayment Penalty":
            level, title = "MODERATE", "Cost of repaying early"
            why = "Repaying ahead of schedule can reduce interest but this clause may offset some of that saving."
            question = "Can I repay early without a penalty, and can you provide an early-settlement cost example?"
            rule = "MODERATE for an early-repayment charge; HIGH at 2% or more or when the calculation is discretionary."
            if (value is not None and term.get("unit") == "percent" and value >= 2) or "discretion" in lower:
                level = "HIGH"
        elif category == "Insurance":
            level, title = "MODERATE", "Insurance adds to the agreement cost"
            why = "Insurance may be charged separately from interest and may recur throughout the agreement."
            question = "Is this insurance mandatory, can I use another provider, and what is the total premium over the full term?"
            rule = "MODERATE for an insurance charge, especially when mandatory, recurring, or not included in the headline rate."
            if "mandatory" in lower or "required" in lower:
                level = "HIGH" if recurrence in ("monthly", "annual") else "MODERATE"
        elif category in ("Maintenance Fee", "Processing Fee", "Administrative Fee", "Other Financial Charge"):
            level, title = "MODERATE", "Additional charge beyond interest"
            why = "This charge can increase the effective cost even when the advertised interest rate appears low."
            question = f"Is the {term['label'].lower()} mandatory, and what is its total cost over the agreement?"
            rule = "MODERATE for an explicit non-interest charge; HIGH for high-value or discretionary recurring charges."
            if "discretion" in lower or "from time to time" in lower:
                level, title = "HIGH", "Provider can change or apply charges"
                rule = "HIGH when a financial charge can be changed at the provider's discretion or from time to time."
            elif value is not None and term.get("unit") == "currency" and recurrence in ("monthly", "annual") and principal:
                annualised = value * (12 if recurrence == "monthly" else 1)
                if annualised / principal >= 0.03:
                    level = "HIGH"
                    rule = "HIGH when an extracted recurring fee annualises to at least 3% of principal."
            elif value is not None and term.get("unit") == "percent" and value >= 3:
                level = "HIGH"
                rule = "HIGH when an extracted non-interest fee is at least 3% of the relevant amount."
        elif category == "Transaction Commission":
            level, title = "MODERATE", "Usage-dependent commission"
            why = "The total depends on how often you make transfers or other transactions."
            question = "Which transactions trigger this commission, and is there a monthly cap or fee-free allowance?"
            rule = "MODERATE because the event count needed to estimate total cost is unknown."
        elif category == "Unclear or Ambiguous Clause":
            level, title = "HIGH", "Obligation needs clarification"
            why = "The clause leaves a financial obligation or provider power unclear, so a reliable cost estimate is not possible from the wording alone."
            question = "Can you provide the exact amount, calculation method, and circumstances in which this clause applies?"
            rule = "HIGH when a financial clause contains discretion, unspecified charges, or change-without-notice wording."
        elif category == "Repayment Condition" and any(x in lower for x in ("grace period", "payment holiday", "balloon", "on demand")):
            level, title = "MODERATE", "Repayment timing needs attention"
            why = "Special timing or deferred amounts can change when costs arise and how much is due later."
            question = "Can you show the full schedule, including any grace period, deferred amount, or final balloon payment?"
            rule = "MODERATE for grace periods, payment holidays, balloon payments, or on-demand repayment."
        elif category == "Interest" and general.get("interestRateType") == "variable":
            level, title = "MODERATE", "Interest is linked to variable conditions"
            rule = "MODERATE on the interest clause when separate evidence identifies a variable rate."

        risks.append({
            "id": f"risk-{term['id']}", "termId": term["id"], "category": category,
            "level": level, "title": title, "quote": quote, "page": term.get("page"),
            "explanation": term.get("explanation", "This term affects the agreement."),
            "whyItMatters": why, "suggestedQuestion": question, "rule": rule,
        })
    risks.sort(key=lambda item: LEVEL_ORDER[item["level"]], reverse=True)
    return risks

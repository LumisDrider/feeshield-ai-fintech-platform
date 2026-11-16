"""Deterministic cost calculations. No language-model output is trusted blindly."""
from __future__ import annotations
from typing import Any, Dict, List, Optional, Tuple

FEE_CATEGORIES = {"Maintenance Fee", "Processing Fee", "Administrative Fee", "Other Financial Charge"}
PENALTIES = {"Late Payment Penalty", "Early Repayment Penalty"}


def monthly_payment(principal: float, monthly_rate: float, months: int) -> float:
    if months <= 0 or principal < 0:
        raise ValueError("Principal and term must describe a positive repayment schedule.")
    if monthly_rate == 0:
        return principal / months
    factor = (1 + monthly_rate) ** months
    return principal * monthly_rate * factor / (factor - 1)


def amortisation_schedule(principal: float, annual_rate_percent: float, months: int) -> Tuple[float, float, List[Dict[str, float]]]:
    r = annual_rate_percent / 100 / 12
    payment = monthly_payment(principal, r, months)
    balance = principal
    total_interest = 0.0
    schedule = []
    for month in range(1, months + 1):
        interest = balance * r
        principal_part = payment - interest
        if month == months:
            principal_part = balance
            actual_payment = balance + interest
        else:
            actual_payment = payment
        balance = max(0.0, balance - principal_part)
        total_interest += interest
        if months <= 600:
            schedule.append({"month": month, "payment": round(actual_payment, 2), "interest": round(interest, 2), "principal": round(principal_part, 2), "balance": round(balance, 2)})
    return round(payment, 2), round(total_interest, 2), schedule


def _annualised_cashflow_rate(principal: float, upfront: float, payment: float, monthly_extras: float, months: int) -> Optional[float]:
    """Annualised internal rate of the stated cash flows; not an official APR."""
    net_proceeds = principal - upfront
    if net_proceeds <= 0 or payment + monthly_extras <= 0 or months <= 0:
        return None
    low, high = -0.95, 2.0
    def npv(rate: float) -> float:
        return net_proceeds - sum((payment + monthly_extras) / ((1 + rate) ** i) for i in range(1, months + 1))
    if npv(low) * npv(high) > 0:
        return None
    for _ in range(100):
        mid = (low + high) / 2
        if npv(low) * npv(mid) <= 0:
            high = mid
        else:
            low = mid
    monthly = (low + high) / 2
    return round(((1 + monthly) ** 12 - 1) * 100, 3)


def calculate_costs(general: Dict[str, Any], terms: List[Dict[str, Any]]) -> Dict[str, Any]:
    principal = general.get("principal")
    months = general.get("durationMonths")
    currency = general.get("currency")
    annual = general.get("annualInterestRate")
    derived_annual = annual is None and general.get("monthlyInterestRate") is not None
    if derived_annual:
        annual = general["monthlyInterestRate"] * 12
    assumptions: List[str] = [
        "Calculations use only extracted values; no absent fee is assumed to exist or to be zero unless no applicable clause was found.",
        "Conditional penalties and per-transaction commissions are excluded because the required event counts are unknown.",
        "Recurring charges are modelled as level amounts over the extracted contract term.",
    ]
    if derived_annual:
        assumptions.append("Annual nominal rate is an arithmetic annualisation (monthly rate × 12), not an explicitly disclosed effective annual rate.")
    missing: List[str] = []
    payment = interest = None
    schedule: List[Dict[str, float]] = []
    frequency = (general.get("repaymentFrequency") or "monthly").lower()
    balloon_clause = any(term.get("category") == "Repayment Condition" and "balloon" in term.get("quote", "").lower() for term in terms)
    if general.get("repaymentFrequency") is None:
        missing.append("Repayment frequency")
        assumptions.append("Repayment frequency is absent; monthly modelling is an explicit estimate assumption and makes the result partial.")
    if balloon_clause:
        missing.append("Full non-standard repayment schedule including the balloon payment")
        assumptions.append("A balloon payment is present. The ordinary fully-amortising model was not applied because it would misstate interest and the final balance.")
    if principal is None:
        missing.append("Loan principal / account amount")
    if months is None:
        missing.append("Contract duration in months")
    if annual is None:
        missing.append("Annual or monthly interest rate")
    if balloon_clause:
        pass
    elif frequency not in ("monthly", "month", "months") and principal is not None:
        assumptions.append(f"Repayment frequency is stated as {frequency}; the standard monthly amortisation model was not applied.")
    elif principal is not None and months and annual is not None:
        if general.get("interestRateType") == "variable":
            assumptions.append("The variable-rate estimate holds the currently extracted rate constant for the whole term; actual interest will differ if the rate changes.")
        if annual == 0:
            assumptions.append("Zero-interest case: monthly principal repayment is principal divided by the number of payments.")
        payment, interest, schedule = amortisation_schedule(float(principal), float(annual), int(months))
        assumptions.append(f"Standard amortising monthly repayment with principal {principal:g}, annual nominal rate {annual:g}%, and {months} monthly payments.")

    one_time = 0.0
    recurring = 0.0
    insurance = 0.0
    one_time_known = True
    recurring_known = True
    insurance_known = True
    monthly_extras = 0.0
    found_one_time = found_recurring = found_insurance = False

    for term in terms:
        category, value, recurrence = term.get("category"), term.get("value"), term.get("recurrence")
        if category not in FEE_CATEGORIES | {"Insurance"} or value is None or recurrence in ("conditional", "per-transaction"):
            continue
        amount: Optional[float] = None
        if term.get("unit") == "currency":
            amount = float(value)
        elif term.get("unit") == "percent" and principal is not None:
            amount = float(principal) * float(value) / 100
            assumptions.append(f"{term['label']}: {value:g}% is applied to the extracted principal ({principal:g}).")
        if amount is None:
            if category == "Insurance":
                insurance_known = False
            elif recurrence in ("monthly", "annual"):
                recurring_known = False
            else:
                one_time_known = False
            continue
        if category == "Insurance":
            found_insurance = True
            if recurrence == "monthly":
                if months is None: insurance_known = False
                else:
                    insurance += amount * months
                    monthly_extras += amount
            elif recurrence == "annual":
                if months is None: insurance_known = False
                else:
                    insurance += amount * (months / 12)
                    monthly_extras += amount / 12
            elif recurrence == "one-time":
                insurance += amount
            else:
                insurance_known = False
        elif recurrence in ("monthly", "annual"):
            found_recurring = True
            if months is None:
                recurring_known = False
            elif recurrence == "monthly":
                recurring += amount * months
                monthly_extras += amount
            else:
                recurring += amount * (months / 12)
                monthly_extras += amount / 12
        elif recurrence == "one-time":
            found_one_time = True
            one_time += amount
        else:
            one_time_known = False

    recurring_result = round(recurring, 2) if recurring_known and (found_recurring or months is not None) else (0.0 if not found_recurring and recurring_known else None)
    insurance_result = round(insurance, 2) if insurance_known and (found_insurance or months is not None) else (0.0 if not found_insurance and insurance_known else None)
    one_time_result = round(one_time, 2) if one_time_known else None
    known_parts = [v for v in (interest, recurring_result, one_time_result, insurance_result) if v is not None]
    additional = round(sum(known_parts), 2) if known_parts else None
    components_complete = interest is not None and all(v is not None for v in (recurring_result, one_time_result, insurance_result))
    total = round(float(principal) + additional, 2) if principal is not None and additional is not None and components_complete else None
    if not recurring_known: missing.append("Duration or calculation basis for recurring charges")
    if not insurance_known: missing.append("Insurance amount or duration")
    if not one_time_known: missing.append("Calculation basis for a one-time charge")

    cashflow_rate = None
    if payment is not None and principal is not None and months and one_time_result is not None and recurring_result is not None and insurance_result is not None:
        cashflow_rate = _annualised_cashflow_rate(float(principal), one_time_result, payment, monthly_extras, int(months))
        if cashflow_rate is not None:
            assumptions.append("Cash-flow annualised rate assumes one-time fees are deducted from loan proceeds and monthly charges are paid with each instalment. This is an estimate, not an official or legally defined APR.")

    complete = principal is not None and months is not None and general.get("repaymentFrequency") is not None and components_complete
    status = "complete" if complete else ("partial" if known_parts else "unavailable")
    if status != "complete" and not missing:
        missing.append("Some values required for a complete estimate are unavailable")
    return {
        "status": status, "principal": principal, "monthlyPayment": payment,
        "estimatedInterest": interest, "recurringCharges": recurring_result,
        "oneTimeFees": one_time_result, "insuranceCost": insurance_result,
        "totalEstimatedRepayment": total, "additionalCost": additional,
        "cashFlowAnnualisedRate": cashflow_rate, "currency": currency,
        "durationMonths": months, "assumptions": assumptions,
        "missing": list(dict.fromkeys(missing)), "schedule": schedule,
    }

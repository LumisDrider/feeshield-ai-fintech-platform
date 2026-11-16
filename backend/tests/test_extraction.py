from backend.app.services.ai_extraction import extract_financial_information
from backend.app.services.clause_classifier import classify_clause
from backend.app.services.pipeline import analyse_text


def test_financial_value_extraction_with_iso_currency():
    text = "Example Bank\nPERSONAL LOAN AGREEMENT\n\nLoan principal: EUR 8,500.00.\nLoan term: 48 months.\nRepayment frequency: monthly instalments.\nThe annual interest rate is 9.40% per annum.\nMonthly account maintenance fee: EUR 11.90 per month."
    result = analyse_text(text)
    assert result["general"]["principal"] == 8500
    assert result["general"]["currency"] == "EUR"
    fee = next(term for term in result["terms"] if term["category"] == "Maintenance Fee")
    assert fee["value"] == 11.90
    assert fee["recurrence"] == "monthly"
    assert result["costs"]["recurringCharges"] == 571.20


def test_missing_interest_rate_remains_null():
    result = analyse_text("Example Bank personal loan agreement.\n\nPrincipal amount: $2,000.\nLoan term: 12 months.\nRepayment frequency: monthly instalments.")
    assert result["general"]["annualInterestRate"] is None
    assert result["costs"]["estimatedInterest"] is None
    assert any("interest rate" in item.lower() for item in result["missingInformation"])


def test_fee_classification_and_penalty_identification():
    category, _, _ = classify_clause("A late payment penalty of 5% applies to the overdue instalment.")
    assert category == "Late Payment Penalty"
    result = analyse_text("Example Finance loan agreement.\n\nPrincipal amount: $5,000.\nLoan term: 24 months.\nRepayment frequency: monthly instalments.\nThe annual interest rate is 8% per annum.\nLate payment penalty: 6% of the overdue instalment, plus 0.08% per day.")
    risk = next(risk for risk in result["risks"] if risk["category"] == "Late Payment Penalty")
    assert risk["level"] == "CRITICAL"
    assert risk["quote"]


def test_explicit_zero_penalty_is_low_priority():
    result = analyse_text("Example Bank loan agreement.\n\nPrincipal amount: $1,000.\nLoan term: 12 months.\nRepayment frequency: monthly instalments.\nThe annual interest rate is 0% per annum.\nEarly repayment penalty: 0%.")
    risk = next(risk for risk in result["risks"] if risk["category"] == "Early Repayment Penalty")
    assert risk["level"] == "LOW"


def test_progress_stages_arrive_in_logical_order():
    order = ["extracting", "identifying", "classifying", "calculating", "finalising"]
    seen: list[str] = []
    analyse_text("Example Bank loan agreement.\n\nPrincipal amount: $1,000.\nLoan term: 12 months.\nRepayment frequency: monthly instalments.\nThe annual interest rate is 5% per annum.",
                 lambda stage, _message: seen.append(stage))
    # Stages must never move backwards, so the UI rail cannot jump.
    indices = [order.index(stage) for stage in seen if stage in order]
    assert indices == sorted(indices)
    assert seen[0] == "identifying" or seen[0] == "extracting"
    assert "calculating" in seen and "finalising" in seen


def test_ai_fallback_is_explicitly_labelled(monkeypatch):
    monkeypatch.delenv("AI_API_KEY", raising=False)
    extraction = extract_financial_information("Account maintenance fee: $5 per month.")
    assert extraction["analysisMode"] == "rule-based"
    assert "Limited analysis mode" in extraction["modeNotice"]

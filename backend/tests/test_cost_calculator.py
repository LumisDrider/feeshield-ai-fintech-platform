import pytest
from backend.app.services.cost_calculator import amortisation_schedule, calculate_costs, monthly_payment


def general(**overrides):
    base = {"principal": 1200.0, "durationMonths": 12, "annualInterestRate": 0.0, "monthlyInterestRate": None, "repaymentFrequency": "monthly", "interestRateType": "fixed", "currency": "USD"}
    base.update(overrides); return base


def test_zero_interest_loan_calculation():
    assert monthly_payment(1200, 0, 12) == 100
    result = calculate_costs(general(), [])
    assert result["monthlyPayment"] == 100
    assert result["estimatedInterest"] == 0
    assert result["totalEstimatedRepayment"] == 1200
    assert result["status"] == "complete"


def test_standard_amortisation_known_case():
    payment, interest, schedule = amortisation_schedule(10000, 12, 12)
    assert payment == pytest.approx(888.49, abs=.01)
    assert interest == pytest.approx(661.85, abs=.02)
    assert schedule[-1]["balance"] == 0
    assert len(schedule) == 12


def test_recurring_and_one_time_costs():
    terms = [
        {"category":"Maintenance Fee","label":"Maintenance","value":5,"unit":"currency","recurrence":"monthly"},
        {"category":"Processing Fee","label":"Processing","value":2,"unit":"percent","recurrence":"one-time"},
        {"category":"Insurance","label":"Insurance","value":30,"unit":"currency","recurrence":"one-time"},
    ]
    result = calculate_costs(general(principal=1200), terms)
    assert result["recurringCharges"] == 60
    assert result["oneTimeFees"] == 24
    assert result["insuranceCost"] == 30
    assert result["additionalCost"] == 114
    assert result["totalEstimatedRepayment"] == 1314


def test_incomplete_interest_information_does_not_fabricate_total():
    result = calculate_costs(general(annualInterestRate=None), [])
    assert result["estimatedInterest"] is None
    assert result["totalEstimatedRepayment"] is None
    assert result["status"] == "partial"
    assert "Annual or monthly interest rate" in result["missing"]


def test_unknown_recurrence_makes_fee_cost_partial():
    terms = [{"category":"Administrative Fee","label":"Admin","value":25,"unit":"currency","recurrence":"unknown"}]
    result = calculate_costs(general(), terms)
    assert result["oneTimeFees"] is None
    assert result["status"] == "partial"


def test_balloon_condition_disables_standard_schedule():
    terms = [{"category":"Repayment Condition","quote":"A balloon payment of $200 is due at maturity.","value":200,"unit":"currency","recurrence":"unknown"}]
    result = calculate_costs(general(annualInterestRate=5), terms)
    assert result["schedule"] == []
    assert result["estimatedInterest"] is None
    assert result["totalEstimatedRepayment"] is None

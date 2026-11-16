from backend.app.services.pipeline import analyse_text
from backend.app.services.comparison_engine import compare_analyses


def contract(currency="USD", principal=1000, months=12, rate=5):
    return analyse_text(f"Example Bank personal loan agreement.\n\nPrincipal amount: {principal} {currency}.\nLoan term: {months} months.\nRepayment frequency: monthly instalments.\nThe annual interest rate is {rate}% per annum.")


def test_contract_comparison_aligned_assumptions():
    result = compare_analyses(contract(rate=5), contract(rate=8), "A.txt", "B.txt", "a", "b")
    assert "A.txt" in result["summary"]
    assert result["metrics"]


def test_currency_mismatch_withholds_direct_winner():
    result = compare_analyses(contract("USD"), contract("EUR"), "Dollar.txt", "Euro.txt")
    assert "reliable cheaper-contract conclusion is not available" in result["summary"]
    assert "currencies differ" in result["normalisation"]["note"]


def test_term_difference_uses_limited_normalisation():
    result = compare_analyses(contract(months=12), contract(months=24), "Short.txt", "Long.txt")
    assert result["normalisation"]["applied"] is True
    assert "per month" in result["summary"]

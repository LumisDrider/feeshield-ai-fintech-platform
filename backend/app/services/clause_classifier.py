"""Explainable hybrid financial-clause classifier.

The baseline uses only keyword presence. The hybrid classifier adds weighted phrases,
category precedence, and financial-value context. No training claims are made.
"""
from __future__ import annotations
import re
from typing import Dict, List, Tuple

CATEGORIES = [
    "Interest", "Maintenance Fee", "Processing Fee", "Administrative Fee",
    "Insurance", "Late Payment Penalty", "Early Repayment Penalty",
    "Transaction Commission", "Variable Interest Condition", "Repayment Condition",
    "Other Financial Charge", "Unclear or Ambiguous Clause",
]

RULES: Dict[str, List[Tuple[str, float]]] = {
    "Late Payment Penalty": [("late payment", 5), ("overdue", 3), ("past due", 4), ("default charge", 4), ("late fee", 5), ("days late", 3)],
    "Early Repayment Penalty": [("early repayment", 5), ("prepayment penalty", 6), ("prepayment fee", 6), ("early settlement", 5), ("repay early", 4)],
    "Variable Interest Condition": [("variable rate", 5), ("rate may change", 6), ("rate may be adjusted", 6), ("benchmark", 3), ("reference rate", 4), ("margin above", 3), ("rate adjustment", 4), ("libor", 3), ("sofr", 3)],
    "Maintenance Fee": [("maintenance fee", 6), ("account fee", 4), ("monthly service charge", 5), ("monthly account", 3), ("account management fee", 5), ("keeping the account", 3)],
    "Processing Fee": [("processing fee", 6), ("origination fee", 6), ("application fee", 5), ("arrangement fee", 5), ("processing charge", 6)],
    "Administrative Fee": [("administrative fee", 6), ("administration fee", 6), ("admin fee", 6), ("documentation fee", 4), ("handling fee", 4)],
    "Insurance": [("insurance", 6), ("insurance premium", 7), ("credit protection", 5), ("payment protection", 5), ("coverage premium", 5)],
    "Transaction Commission": [("transfer commission", 7), ("transaction fee", 6), ("commission", 4), ("wire transfer fee", 6), ("per transfer", 5), ("withdrawal fee", 5), ("each transaction", 4)],
    "Interest": [("interest rate", 6), ("annual interest", 7), ("monthly interest", 7), ("interest accrues", 5), ("nominal rate", 5), ("apr", 4), ("effective annual rate", 6)],
    "Repayment Condition": [("repayment schedule", 6), ("instalment", 4), ("installment", 4), ("grace period", 6), ("due on", 3), ("repayable", 4), ("repayment frequency", 6), ("maturity date", 4), ("payment holiday", 5)],
    "Unclear or Ambiguous Clause": [("from time to time", 5), ("at our discretion", 6), ("sole discretion", 6), ("as applicable", 3), ("may apply", 3), ("other charges", 3), ("without notice", 5), ("unclear", 5)],
    "Other Financial Charge": [("service fee", 5), ("additional charge", 5), ("other fee", 5), ("charges", 2), ("fee", 2), ("expenses", 3), ("costs payable", 4)],
}

VALUE_RE = re.compile(r"(?:\d+(?:[.,]\d+)?\s*%|[$€£]\s*\d|\b\d+(?:[.,]\d+)?\s*(?:usd|eur|gbp)\b)", re.I)


def _scores(text: str) -> Dict[str, float]:
    lower = text.lower()
    scores = {category: 0.0 for category in CATEGORIES}
    for category, rules in RULES.items():
        for phrase, weight in rules:
            if phrase in lower:
                scores[category] += weight
    return scores


def keyword_baseline(text: str) -> str:
    """Single-pass baseline: first category in a fixed order with a keyword match."""
    for category in CATEGORIES:
        if any(phrase in text.lower() for phrase, _ in RULES[category]):
            return category
    return "Other Financial Charge"


def classify_clause(text: str) -> Tuple[str, float, List[str]]:
    scores = _scores(text)
    # A specific variable-rate condition is more useful than generic interest.
    if scores["Variable Interest Condition"] >= 5:
        scores["Variable Interest Condition"] += 4
    if scores["Late Payment Penalty"] >= 5:
        scores["Late Payment Penalty"] += 3
    if scores["Early Repayment Penalty"] >= 5:
        scores["Early Repayment Penalty"] += 3
    if "payment holiday" in text.lower() or "repayment schedule" in text.lower():
        scores["Repayment Condition"] += 3
    # Ambiguity only wins when no specific obligation has stronger evidence.
    specific = max(scores[c] for c in CATEGORIES if c != "Unclear or Ambiguous Clause")
    if specific >= 5:
        scores["Unclear or Ambiguous Clause"] *= 0.35
    category = max(CATEGORIES, key=lambda c: scores[c])
    if scores[category] == 0:
        category = "Other Financial Charge" if VALUE_RE.search(text) else "Repayment Condition"
        return category, 0.42, []
    matched = [phrase for phrase, _ in RULES[category] if phrase in text.lower()]
    if VALUE_RE.search(text):
        scores[category] += 1.0
    runner_up = max((value for key, value in scores.items() if key != category), default=0)
    margin = max(0.0, scores[category] - runner_up)
    confidence = min(0.97, 0.55 + scores[category] * 0.035 + margin * 0.018)
    return category, round(confidence, 2), matched

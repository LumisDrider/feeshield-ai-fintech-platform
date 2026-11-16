"""Execute classifier evaluation and print measured JSON metrics.

This is an evaluation of deterministic classifiers on a small synthetic set, not
model training and not a claim of real-world accuracy. An LLM evaluation requires
separately configuring and running an AI provider; this script never fabricates it.
"""
from __future__ import annotations
import json
from datetime import datetime, timezone
from pathlib import Path
from backend.app.services.clause_classifier import CATEGORIES, classify_clause, keyword_baseline


def metrics(rows, predictor):
    predictions = [predictor(row["text"]) for row in rows]
    labels = [row["label"] for row in rows]
    matrix = {actual: {predicted: 0 for predicted in CATEGORIES} for actual in CATEGORIES}
    for actual, predicted in zip(labels, predictions):
        matrix[actual][predicted] += 1
    per_class = {}
    f1s, precisions, recalls = [], [], []
    for category in CATEGORIES:
        tp = sum(1 for a, p in zip(labels, predictions) if a == category and p == category)
        fp = sum(1 for a, p in zip(labels, predictions) if a != category and p == category)
        fn = sum(1 for a, p in zip(labels, predictions) if a == category and p != category)
        precision = tp / (tp + fp) if tp + fp else 0.0
        recall = tp / (tp + fn) if tp + fn else 0.0
        f1 = 2 * precision * recall / (precision + recall) if precision + recall else 0.0
        support = sum(1 for label in labels if label == category)
        per_class[category] = {"precision": round(precision, 4), "recall": round(recall, 4), "f1": round(f1, 4), "support": support}
        precisions.append(precision); recalls.append(recall); f1s.append(f1)
    errors = [{"id": row["id"], "text": row["text"], "actual": row["label"], "predicted": predicted} for row, predicted in zip(rows, predictions) if row["label"] != predicted]
    return {"accuracy": round(sum(a == p for a, p in zip(labels, predictions)) / len(labels), 4), "macroPrecision": round(sum(precisions) / len(precisions), 4), "macroRecall": round(sum(recalls) / len(recalls), 4), "macroF1": round(sum(f1s) / len(f1s), 4), "perClass": per_class, "confusionMatrix": matrix, "errors": errors}


def run_evaluation():
    path = Path(__file__).with_name("labelled_clauses.json")
    rows = json.loads(path.read_text())
    return {"executedAt": datetime.now(timezone.utc).isoformat(), "dataset": {"name": "FeeShield synthetic labelled clauses v1", "samples": len(rows), "categories": CATEGORIES, "limitations": "Small, individually authored synthetic evaluation set with two examples per category. It tests implementation behaviour, not representative real-world performance. No model was trained on this dataset."}, "baseline": metrics(rows, keyword_baseline), "hybrid": metrics(rows, lambda text: classify_clause(text)[0]), "llmEvaluation": {"executed": False, "note": "No external LLM evaluation was executed by this script. The hybrid result is the deterministic weighted-rule classifier, not an LLM score."}}


if __name__ == "__main__":
    print(json.dumps(run_evaluation()))

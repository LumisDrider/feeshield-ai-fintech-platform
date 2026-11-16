# Synthetic demonstration contracts

The three complete, individually authored synthetic agreements are stored in `src/data/demo-contracts.json` so the Next.js UI and local tooling use one source of truth:

1. **ClearPath personal loan** — relatively transparent, fixed-rate agreement.
2. **HarbourStone consumer credit** — multiple recurring, one-time, insurance, transaction, and penalty charges.
3. **AsterPeak variable-rate loan** — variable benchmark interest, early repayment conditions, and a balloon payment.

Every document prominently states that it is synthetic and not a real financial offer. Load them from **Analyse document → Try a synthetic agreement**. They are processed by the same backend engine as user uploads; there are no predefined analysis results.

The separate labelled classification dataset is `backend/evaluation/labelled_clauses.json`.

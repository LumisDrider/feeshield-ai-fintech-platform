# FeeShield AI

FeeShield AI is an evidence-linked financial contract intelligence platform. It extracts rates, fees, penalties, and repayment conditions from PDF/TXT documents or pasted text, classifies clauses, applies documented risk rules, calculates deterministic cost estimates, compares agreements, and exports PDF reports.

**Product boundary:** this is a consumer transparency and financial-literacy tool, not a bank, lender, credit scorer, legal adviser, or financial institution. Risk levels are review priorities, not allegations of illegality, deception, fraud, or unfairness.

## What is implemented

- Responsive landing page, dashboard, upload workspace, report, comparison, history, literacy/help, and privacy settings.
- Light/dark theme with a header switch and a Light / Dark / System preference in Settings. The choice is stored in `localStorage` and applied by a pre-paint script, so there is no flash on reload and the landing page stays statically prerendered. All screens use semantic colour tokens, so both themes are fully supported.
- **One-action file analysis**: selecting or dropping a file immediately runs upload → text extraction (OCR for scans) → clause analysis → report in a single continuous pipeline; no second click is required. Raw agreement text can be pasted and analysed directly with no file upload at all.
- Smooth, monotonic processing feedback: server-confirmed stages drive a paced stage rail that never jumps backwards, shows real elapsed time, and supports cancellation. When the report is saved, a completion card immediately shows the key numbers (principal, rate, clauses, concerns, estimated extra/total cost) with actions to open the full report, download the PDF, compare, or start a new analysis, then auto-opens the report page.
- Digital PDF extraction with page boundaries (`unpdf` in Next.js; PyMuPDF in FastAPI), TXT and pasted-text ingestion, 8 MB and 80-page limits, PDF signature checks, and readable-text validation.
- Optional scanned-PDF OCR in the standalone FastAPI runtime using PyMuPDF, Pillow, pytesseract, and a local Tesseract binary. If OCR is unavailable, the product reports that limitation and offers pasted text; it does not simulate OCR.
- Modular Python analysis engine invoked by the live Next.js API through an NDJSON process bridge. The same services power the standalone FastAPI application.
- Provider-independent optional OpenAI-compatible structured extraction. Every retained AI quotation must occur verbatim in the source. Retry/timeout/invalid-provider behaviour falls back visibly to limited deterministic analysis.
- Hybrid clause classification across 12 categories, explicit evidence/confidence/recurrence fields, missing-value preservation, and source page references.
- Documented LOW / MODERATE / HIGH / CRITICAL risk rules with original clause, explanation, impact, provider question, and triggering rule.
- Deterministic standard amortisation (including zero interest), recurring/one-time/insurance costs, partial estimates, assumptions, non-standard balloon-schedule handling, and an estimated cash-flow annualised rate only when sufficient cash flows exist. This rate is **not** an official APR.
- Assumption-aware comparison with currency/principal/duration checks and limited monthly normalisation. Unlike penalty units are described, not summed.
- PostgreSQL persistence through Drizzle in Next.js and psycopg in FastAPI. Pending full text is cleared after analysis; structured excerpts support report evidence.
- Real PDF generation (pdf-lib in Next.js; ReportLab in FastAPI), JSON workspace export, retention enforcement, per-document and full-workspace deletion.
- Random HTTP-only workspace sessions with ownership checks on documents, analyses, comparisons, exports, and reports. Analysis rate limiting is included.
- Live classifier evaluation API and UI: accuracy, macro precision/recall/F1, per-class metrics, confusion matrices, and actual misclassifications. No score is hard-coded.
- Three clearly synthetic demo agreements and a 24-clause labelled evaluation dataset.

## Repository layout

```text
src/app/                 Next.js pages and API route handlers
src/components/          Reusable interactive product components
src/db/                  Drizzle connection and PostgreSQL schema
src/lib/                 Shared report types, engine bridge, PDF writer, sessions
src/data/                Synthetic demonstration contracts (single source of truth)
backend/app/api/         FastAPI upload, analysis, comparison, and report routers
backend/app/services/    Extraction, OCR, classification, risk, costs, comparison, PDF
backend/app/schemas/     Pydantic request/response schemas
backend/app/database/    psycopg connection and PostgreSQL DDL
backend/app/utils/       Validation, safe filenames, rate limiting
backend/evaluation/      Labelled clauses and executable evaluation script
backend/tests/           Pytest unit/API tests
samples/                 Demo dataset guide
```

## Run the integrated Next.js application

Requirements: Node.js 20+, Python 3.11+, and PostgreSQL.

1. Copy `.env.example` to `.env` and set `DATABASE_URL`.
2. Install JavaScript dependencies: `npm install`.
3. Apply the schema: `npx drizzle-kit push`.
4. Start the app: `npm run dev`.
5. Open `http://localhost:3000`.

The Next.js analysis and comparison routes run `python3 -m backend.app.cli`. The core engine uses only the Python standard library, so the main rule-based workflow does not require Python package installation. Set `PYTHON_BINARY` if your Python executable has a different name. Digital PDF extraction is handled by the installed Node dependency.

Production:

```bash
npx next typegen
npm exec tsc -- --noEmit
npm run build
npm run start
```

## Run the standalone FastAPI backend

```bash
python3 -m venv .venv
source .venv/bin/activate            # Windows: .venv\Scripts\activate
pip install -r backend/requirements.txt
export DATABASE_URL=postgresql://postgres:postgres@127.0.0.1:5432/app_db
uvicorn backend.app.main:app --reload --host 0.0.0.0 --port 8000
```

OpenAPI documentation is available at `http://localhost:8000/docs`; the schema is at `/openapi.json`. The FastAPI lifespan creates missing tables but does not replace Drizzle migrations for managed schema evolution.

### OCR setup

Install the Tesseract system binary separately (for example `apt-get install tesseract-ocr` or `brew install tesseract`). Set `TESSERACT_CMD` if it is not on PATH. OCR is only attempted for PDFs without sufficient digital text. Large/image-heavy documents remain subject to the 8 MB and execution-time limits.

## Environment variables

- `DATABASE_URL` — required PostgreSQL connection string.
- `AI_API_KEY` — optional OpenAI-compatible API key; empty means disclosed rule-based mode.
- `AI_BASE_URL` — optional provider base URL, default `https://api.openai.com/v1`.
- `AI_MODEL` — optional provider model, default `gpt-4o-mini`.
- `AI_TIMEOUT_SECONDS` — provider timeout, default 25 seconds.
- `MAX_FILE_SIZE_MB` — standalone backend limit, default 8.
- `MAX_DOCUMENT_CHARACTERS` — extraction token/document-size guard, default 180000.
- `TESSERACT_CMD` — Tesseract executable, default `tesseract`.
- `PYTHON_BINARY` — optional executable used by Next.js, default `python3`.
- `CORS_ORIGINS` — comma-separated FastAPI origins, default local Next.js origin.

Never expose `AI_API_KEY` through a `NEXT_PUBLIC_` variable. Keys are read only on the server.

## API surface

- `POST /api/documents/upload`
- `POST /api/documents/analyze`
- `GET /api/analysis/{analysis_id}`
- `GET /api/documents/{document_id}`
- `DELETE /api/documents/{document_id}`
- `POST /api/comparisons`
- `GET /api/comparisons/{comparison_id}`
- `GET /api/reports/{analysis_id}/pdf`
- `GET /api/evaluation` (Next.js live evaluation)
- `GET /api/health`

Next.js additionally provides workspace settings/export endpoints. FastAPI responses follow its generated Pydantic/OpenAPI schemas; Next.js upload/analysis uses JSON and NDJSON stage streaming.

## Evaluation and tests

Run the real evaluation and save its measured results:

```bash
python3 -m backend.evaluation.evaluate > backend/evaluation/results.json
```

Or open **Financial literacy → Accuracy & reliability**, which executes the script and displays its output. The dataset contains two individually authored synthetic clauses per category. It is intentionally small and is not evidence of representative real-world performance. The reported “hybrid” classifier is the deterministic weighted-rule implementation, not an LLM. No model training or external LLM evaluation is claimed.

Run automated tests after installing backend requirements:

```bash
pytest
```

Coverage includes valid/invalid/empty/scanned PDFs, ISO-currency extraction, missing interest, fee and penalty classification, zero-interest and known amortisation cases, unknown recurrence, balloon schedules, incomplete information, comparison alignment/currency/term handling, API validation, and ownership denial. PDF tests skip explicitly if PyMuPDF is not installed.

## Demonstration workflow

1. Open **Analyse document**.
2. Select one of the three **synthetic** agreements.
3. Choose **Prepare & analyse** and watch server-reported stages.
4. Inspect summary, risks, true-cost assumptions, and original evidence.
5. Export the PDF.
6. Analyse a second demo and open **Compare contracts**.

The demo loader supplies text only. It never supplies predefined terms, risks, costs, or report output.

## Privacy and deployment notes

Implemented controls include file validation, safe filenames, no user-controlled filesystem paths, server-side secrets, ownership predicates, HTTP-only SameSite workspace cookies, analysis rate limits, pending-text deletion, configurable retention, source-excerpt controls, and deletion/export features. Application logs record error types and paths, not document contents.

For a public deployment:

- Serve both runtimes only through HTTPS and use managed secret storage.
- Replace the anonymous workspace session with verified account authentication, CSRF protection, secure cookie rotation, and account recovery as appropriate.
- Replace the in-process rate limiter with Redis or an API gateway when running multiple workers.
- Run Drizzle migrations, configure PostgreSQL TLS/backups, restrict network access, and monitor resource use.
- Put Next.js and FastAPI behind a reverse proxy; only expose intended routes. Configure `CORS_ORIGINS` narrowly.
- Review data-protection obligations and retention requirements for your jurisdiction. No regulatory compliance or complete anonymity is claimed.
- Ensure the Python backend files are included in the Next.js deployment image; serverless platforms without a Python runtime cannot execute the process bridge. In that case, deploy FastAPI separately and adapt the route base URL, or use a container VM as documented above.

## Known limitations

- Rule-based extraction can miss unusual wording, complex tables, and jurisdiction-specific expressions; confidence is a heuristic, not a probability of correctness.
- AI-assisted mode still requires human verification. Missing general fields are not inferred by the LLM.
- OCR quality depends on scan quality and installed language data.
- Event-dependent costs are excluded unless event counts are known. Variable rates are held constant only when a standard estimate is possible.
- The standard amortisation model does not claim to support every repayment structure; balloon schedules are explicitly marked partial.
- PDF reports contain retained excerpts, not a reconstruction of the original uploaded document.

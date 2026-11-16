import type { Metadata } from "next";
import Link from "next/link";
import { AlertCircle, ArrowRight, BookOpenCheck, Braces, CheckCircle2, ChevronDown, HelpCircle, ShieldCheck } from "lucide-react";
import CostExplorer from "@/components/CostExplorer";
import EvaluationPanel from "@/components/EvaluationPanel";

export const metadata: Metadata = { title: "Financial literacy & help" };

const CATEGORIES: Array<[string, string, string]> = [
  ["Interest", "The price of borrowing, usually expressed as a percentage of outstanding principal. Nominal annual, monthly, and effective annual rates are not interchangeable.", "Is this rate nominal or effective, fixed or variable, and what balance does it apply to?"],
  ["Maintenance Fee", "A charge for keeping or servicing an account. Small monthly amounts can become material over a multi-year agreement.", "Is the fee mandatory, and what is its total over the full term?"],
  ["Processing Fee", "A charge for originating, arranging, or processing an application. It may be paid upfront or deducted from proceeds.", "Is the fee deducted from the amount I receive, and is it refundable?"],
  ["Administrative Fee", "A documentation, handling, or administration charge. Its name does not explain its value; the calculation basis matters.", "What service does this cover and can it be waived?"],
  ["Insurance", "Credit protection or payment protection may be optional or mandatory and may be recurring. It is separate from ordinary interest.", "Can I decline it, choose another provider, or cancel later?"],
  ["Late Payment Penalty", "A fixed, percentage, or daily charge triggered after a missed due date. Ordinary interest may continue as well.", "When does it start, is there a grace period, and does it accrue daily?"],
  ["Early Repayment Penalty", "A charge for paying ahead of schedule. It can reduce the interest saving from early settlement.", "Can you provide a settlement quotation and show how the fee is calculated?"],
  ["Transaction Commission", "A usage-based cost for transfers, withdrawals, or other transactions. Total cost depends on event frequency.", "Which events trigger it, and is there a cap or fee-free allowance?"],
  ["Variable Interest Condition", "The rate may track a benchmark, provider decision, or review schedule. Initial payments are not guaranteed.", "Which benchmark and margin apply, how often can it change, and is there a cap?"],
  ["Repayment Condition", "Rules covering instalments, grace periods, payment holidays, maturity, balloon amounts, or on-demand repayment.", "Can I have the full schedule including deferred and final payments?"],
  ["Other Financial Charge", "A financial obligation that does not fit a more specific category. It still needs a clear amount and trigger.", "What exactly is charged, when, and on what calculation basis?"],
  ["Unclear or Ambiguous Clause", "Wording that leaves cost or provider discretion unresolved. Missing clarity is a reason to ask, not proof of wrongdoing.", "Can this be replaced with a precise amount, formula, and notice period?"],
];
const ENDPOINTS: Array<[string, string, string]> = [
  ["POST", "/api/documents/upload", "Validate and extract PDF/TXT or prepare pasted text"],
  ["POST", "/api/documents/analyze", "Stream engine stages and save an analysis"],
  ["GET", "/api/analysis/{analysis_id}", "Retrieve an owned report"],
  ["GET / DELETE", "/api/documents/{document_id}", "Inspect metadata or delete a document and reports"],
  ["POST", "/api/comparisons", "Compare two owned completed analyses"],
  ["GET", "/api/comparisons/{comparison_id}", "Retrieve a saved comparison"],
  ["GET", "/api/reports/{analysis_id}/pdf", "Generate a professional PDF report"],
  ["GET", "/api/evaluation", "Execute baseline and hybrid classifier evaluation"],
  ["GET", "/api/health", "Application and database health"],
];
const READING_METHOD = [
  "Confirm the principal, currency, and amount you actually receive.",
  "Write down the nominal rate, rate type, benchmark, and any disclosed effective rate.",
  "Convert every recurring fee to a full-term amount using the stated duration.",
  "List conditional events: late payment, early repayment, default, and transactions.",
  "Inspect grace periods, balloon payments, insurance, and account obligations.",
  "Resolve every blank, “may apply”, and discretionary charge in writing before signing.",
];
const FAQS: Array<[string, string]> = [
  ["Is a high-risk label proof that a fee is unlawful?", "No. Risk labels are review priorities from documented rules. FeeShield AI does not determine legality, deception, fraud, or fairness."],
  ["Why is my estimated total partial?", "A principal, rate, duration, recurrence, or fee basis may be missing. The engine shows known components rather than filling gaps."],
  ["Is the cash-flow annualised rate an official APR?", "No. It is an estimated internal rate of modelled cash flows when sufficient information exists, not a legally defined APR."],
  ["Can I compare different currencies?", "The terms can be displayed side by side, but direct monetary ranking is withheld unless a reliable common basis exists. No exchange rate is invented."],
  ["Does rule-based mode mean the report is fabricated?", "No. It is a limited deterministic extraction mode using real patterns and your source text. The limitation is disclosed prominently."],
];

export default function LearnPage() {
  return (
    <div className="mx-auto max-w-[1180px]">
      <header className="fade-up flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
        <div>
          <p className="eyebrow">Financial literacy & technical transparency</p>
          <h1 className="mt-2 max-w-[700px] text-[27px] font-semibold tracking-[-.035em] text-ink sm:text-[33px]">Understand the clause. Question the cost.</h1>
          <p className="mt-2 max-w-[720px] text-[12.5px] leading-6 text-muted">A practical guide to financial agreements, plus a transparent view of how FeeShield AI is implemented and evaluated.</p>
        </div>
        <Link href="/analyze" className="btn-primary w-fit">Analyse a document <ArrowRight size={15} /></Link>
      </header>

      <section className="mt-7"><CostExplorer /></section>

      <section className="mt-12">
        <p className="eyebrow">The 12-category field guide</p>
        <h2 className="mt-2 text-[21px] font-semibold tracking-[-.025em] text-ink">What the classifier is looking for</h2>
        <div className="mt-5 grid gap-3 md:grid-cols-2">
          {CATEGORIES.map(([name, explanation, question], index) => (
            <details key={name} className="surface group p-5 open:border-brand/45">
              <summary className="flex cursor-pointer list-none items-center gap-3">
                <span className="grid h-7 w-7 shrink-0 place-items-center rounded-[9px] bg-brand-soft text-[9px] font-bold text-brand">{String(index + 1).padStart(2, "0")}</span>
                <span className="text-[12px] font-bold text-ink">{name}</span>
                <ChevronDown size={15} className="ml-auto shrink-0 text-muted transition-transform duration-300 group-open:rotate-180" />
              </summary>
              <p className="mt-4 text-[10.5px] leading-[1.65] text-muted">{explanation}</p>
              <div className="mt-3 rounded-[10px] border border-brand/25 bg-brand-soft p-3 text-[9.5px] leading-5 text-ink-soft"><strong className="text-brand-ink">Ask:</strong> {question}</div>
            </details>
          ))}
        </div>
      </section>

      <section className="mt-12 grid gap-6 lg:grid-cols-[.8fr_1.2fr]">
        <div>
          <p className="eyebrow">Extraction behaviour</p>
          <h2 className="mt-2 text-[21px] font-semibold tracking-[-.025em] text-ink">What happens when the wording is incomplete?</h2>
          <p className="mt-4 text-[11.5px] leading-6 text-muted">Extraction is constrained by evidence. An ambiguous clause can still be important, but its absent amount stays null and its cost is not silently added to a total.</p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="surface p-5">
            <CheckCircle2 size={18} className="text-brand" />
            <h3 className="mt-3 text-[11.5px] font-bold text-ink">Successful explicit extraction</h3>
            <blockquote className="mt-3 rounded-r-[9px] border-l-2 border-brand bg-brand-soft p-3 text-[9.5px] leading-5 text-ink-soft">“Account maintenance fee: $6.50 per month.”</blockquote>
            <div className="mt-3 space-y-1.5 text-[9.5px] text-muted"><p>Value: <strong className="text-ink-soft">6.50 USD</strong></p><p>Recurrence: <strong className="text-ink-soft">monthly</strong></p><p>Evidence: <strong className="text-ink-soft">explicit, exact quotation</strong></p></div>
          </div>
          <div className="surface p-5">
            <AlertCircle size={18} className="text-amber" />
            <h3 className="mt-3 text-[11.5px] font-bold text-ink">Incomplete / ambiguous extraction</h3>
            <blockquote className="mt-3 rounded-r-[9px] border-l-2 border-amber bg-amber-soft p-3 text-[9.5px] leading-5 text-ink-soft">“Other charges may apply from time to time.”</blockquote>
            <div className="mt-3 space-y-1.5 text-[9.5px] text-muted"><p>Value: <strong className="text-ink-soft">null</strong></p><p>Recurrence: <strong className="text-ink-soft">unknown</strong></p><p>Action: <strong className="text-ink-soft">flag ambiguity; request formula</strong></p></div>
          </div>
        </div>
      </section>

      <section className="mt-12">
        <div className="mb-5">
          <p className="eyebrow">Accuracy & reliability</p>
          <h2 className="mt-2 text-[21px] font-semibold tracking-[-.025em] text-ink">Measured against a keyword baseline</h2>
          <p className="mt-2 max-w-[760px] text-[10.5px] leading-5 text-muted">The evaluation is executable in this application. It compares a fixed-order keyword baseline with the weighted hybrid classifier on a small synthetic labelled set. It does not claim model training, external LLM accuracy, or representative consumer-contract performance.</p>
        </div>
        <EvaluationPanel />
      </section>

      <section className="mt-12 grid gap-5 lg:grid-cols-2">
        <div className="surface p-6">
          <BookOpenCheck size={20} className="text-brand" />
          <h2 className="mt-4 text-[15.5px] font-semibold text-ink">A six-pass reading method</h2>
          <div className="mt-5 space-y-4">
            {READING_METHOD.map((item, index) => (
              <div key={item} className="flex gap-3 text-[10.5px] leading-5 text-muted"><span className="font-bold text-brand">{index + 1}.</span>{item}</div>
            ))}
          </div>
        </div>
        <div className="surface p-6">
          <HelpCircle size={20} className="text-brand" />
          <h2 className="mt-4 text-[15.5px] font-semibold text-ink">Common questions</h2>
          <div className="mt-4 divide-y divide-line">
            {FAQS.map(([question, answer]) => (
              <details key={question} className="group py-3">
                <summary className="flex cursor-pointer list-none items-center gap-2 text-[10.5px] font-bold text-ink-soft transition-colors hover:text-ink">
                  {question}<ChevronDown size={13} className="ml-auto shrink-0 text-muted transition-transform duration-300 group-open:rotate-180" />
                </summary>
                <p className="mt-2 text-[9.5px] leading-5 text-muted">{answer}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      <section className="mt-12">
        <div className="flex items-center gap-2">
          <Braces size={19} className="text-brand" />
          <div><p className="eyebrow">API & deployment reference</p><h2 className="mt-1 text-[18px] font-semibold text-ink">Inspect the integration surface</h2></div>
        </div>
        <div className="surface mt-5 overflow-hidden">
          <div className="scrollbar-thin overflow-x-auto">
            <table className="w-full min-w-[680px] text-left">
              <thead><tr className="bg-surface-2 text-[8.5px] uppercase tracking-[.08em] text-muted"><th className="px-5 py-3 font-bold">Method</th><th className="font-bold">Endpoint</th><th className="font-bold">Purpose</th></tr></thead>
              <tbody>
                {ENDPOINTS.map(([method, path, purpose]) => (
                  <tr key={method + path} className="border-t border-line text-[9.5px] transition-colors hover:bg-surface-2">
                    <td className="whitespace-nowrap px-5 py-3 font-bold text-brand">{method}</td>
                    <td className="py-3 font-mono text-ink-soft">{path}</td>
                    <td className="py-3 pr-5 text-muted">{purpose}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="border-t border-line bg-surface-2 p-5 text-[9.5px] leading-5 text-muted">
            <strong className="text-ink">Standalone FastAPI:</strong> run <code className="rounded bg-surface-3 px-1 py-0.5 font-mono text-[9px] text-ink-soft">uvicorn backend.app.main:app --reload</code> after installing <code className="rounded bg-surface-3 px-1 py-0.5 font-mono text-[9px] text-ink-soft">backend/requirements.txt</code>. Interactive OpenAPI documentation is then available at <code className="rounded bg-surface-3 px-1 py-0.5 font-mono text-[9px] text-ink-soft">/docs</code>. Set <code className="rounded bg-surface-3 px-1 py-0.5 font-mono text-[9px] text-ink-soft">DATABASE_URL</code>. Optional structured LLM extraction uses <code className="rounded bg-surface-3 px-1 py-0.5 font-mono text-[9px] text-ink-soft">AI_API_KEY</code>, <code className="rounded bg-surface-3 px-1 py-0.5 font-mono text-[9px] text-ink-soft">AI_BASE_URL</code>, and <code className="rounded bg-surface-3 px-1 py-0.5 font-mono text-[9px] text-ink-soft">AI_MODEL</code>; without a key, limited rule-based mode is used. OCR additionally requires Tesseract. See the project README for local setup, tests, and HTTPS deployment guidance.
          </div>
        </div>
      </section>

      <div className="mt-10 flex items-start gap-3 rounded-[13px] border border-amber/30 bg-amber-soft p-4 text-[9.5px] leading-5 text-ink-soft">
        <ShieldCheck size={16} className="mt-0.5 shrink-0 text-amber" />
        Financial literacy improves the questions you can ask, but no automated report replaces the original signed agreement or qualified advice for your circumstances.
      </div>
    </div>
  );
}

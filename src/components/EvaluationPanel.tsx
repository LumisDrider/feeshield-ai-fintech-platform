"use client";
import { useEffect, useState } from "react";
import { CheckCircle2, Loader2, RefreshCw } from "lucide-react";

type Metrics = {
  accuracy: number; macroPrecision: number; macroRecall: number; macroF1: number;
  perClass: Record<string, { precision: number; recall: number; f1: number; support: number }>;
  confusionMatrix: Record<string, Record<string, number>>;
  errors: Array<{ id: string; text: string; actual: string; predicted: string }>;
};
type Evaluation = {
  executedAt: string;
  dataset: { name: string; samples: number; categories: string[]; limitations: string };
  baseline: Metrics; hybrid: Metrics;
  llmEvaluation: { executed: boolean; note: string };
};
const SHORT: Record<string, string> = {
  Interest: "INT", "Maintenance Fee": "MAINT", "Processing Fee": "PROC", "Administrative Fee": "ADMIN",
  Insurance: "INS", "Late Payment Penalty": "LATE", "Early Repayment Penalty": "EARLY",
  "Transaction Commission": "TRANS", "Variable Interest Condition": "VAR", "Repayment Condition": "REPAY",
  "Other Financial Charge": "OTHER", "Unclear or Ambiguous Clause": "AMBIG",
};

export default function EvaluationPanel() {
  const [data, setData] = useState<Evaluation | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [model, setModel] = useState<"hybrid" | "baseline">("hybrid");
  const [view, setView] = useState<"metrics" | "matrix" | "errors">("metrics");

  async function run() {
    setLoading(true); setError("");
    try {
      const response = await fetch("/api/evaluation", { cache: "no-store" });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || "Evaluation failed");
      setData(payload);
    } catch (err) { setError(err instanceof Error ? err.message : "Evaluation failed"); }
    finally { setLoading(false); }
  }
  useEffect(() => { void run(); }, []);

  const metrics = data?.[model];

  return (
    <div className="surface overflow-hidden">
      <div className="flex flex-col gap-4 border-b border-line p-5 sm:flex-row sm:items-center">
        <div>
          <h3 className="text-[13px] font-bold text-ink">Executed classifier evaluation</h3>
          <p className="mt-1 text-[9.5px] text-muted">Metrics below are computed by the backend script, not stored presentation claims.</p>
        </div>
        <button onClick={() => void run()} disabled={loading} className="btn-secondary !min-h-9 !text-[9.5px] sm:ml-auto">
          {loading ? <Loader2 size={13} className="spin-slow" /> : <RefreshCw size={13} />}Run evaluation again
        </button>
      </div>

      {loading && !data ? (
        <div className="flex items-center justify-center gap-2 p-10 text-[10.5px] text-muted"><Loader2 size={17} className="spin-slow text-brand" />Running labelled dataset through both classifiers…</div>
      ) : error && !data ? (
        <div className="p-6 text-[10.5px] text-red-ink">{error}</div>
      ) : data && metrics ? (
        <div>
          <div className="flex flex-col gap-3 bg-surface-2 p-4 sm:flex-row sm:items-center">
            <div className="flex w-fit rounded-[10px] border border-line bg-surface p-1">
              {(["hybrid", "baseline"] as const).map((key) => (
                <button key={key} onClick={() => setModel(key)} className={`rounded-[7px] px-3 py-1.5 text-[9.5px] font-bold capitalize transition-colors ${model === key ? "bg-navy text-white dark:bg-brand dark:text-[#06231f]" : "text-muted hover:text-ink"}`}>
                  {key === "hybrid" ? "Hybrid classifier" : "Keyword baseline"}
                </button>
              ))}
            </div>
            <span className="flex items-center gap-1.5 text-[9.5px] text-brand-ink"><CheckCircle2 size={13} />Executed {new Date(data.executedAt).toLocaleTimeString()} · {data.dataset.samples} labelled clauses</span>
            <div className="flex gap-1 sm:ml-auto">
              {(["metrics", "matrix", "errors"] as const).map((item) => (
                <button key={item} onClick={() => setView(item)} className={`rounded-[7px] px-2.5 py-1.5 text-[8.5px] font-bold capitalize transition-colors ${view === item ? "bg-brand-soft text-brand-ink" : "text-muted hover:text-ink"}`}>
                  {item === "matrix" ? "Confusion matrix" : item}
                </button>
              ))}
            </div>
          </div>

          <div className="p-5">
            {view === "metrics" ? (
              <>
                <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                  {[["Accuracy", metrics.accuracy], ["Macro precision", metrics.macroPrecision], ["Macro recall", metrics.macroRecall], ["Macro F1-score", metrics.macroF1]].map(([label, value]) => (
                    <div key={label as string} className="rounded-[12px] border border-line bg-surface-2 p-4">
                      <div className="text-[8.5px] font-bold uppercase tracking-[.07em] text-muted">{label as string}</div>
                      <div className="tabular mt-2 text-[23px] font-semibold text-ink">{((value as number) * 100).toFixed(1)}<span className="text-[12px] text-muted">%</span></div>
                    </div>
                  ))}
                </div>
                <div className="scrollbar-thin mt-5 overflow-x-auto">
                  <table className="w-full min-w-[540px] text-left">
                    <thead><tr className="border-b border-line text-[8.5px] uppercase tracking-[.07em] text-muted"><th className="py-2 font-bold">Category</th><th className="font-bold">Precision</th><th className="font-bold">Recall</th><th className="font-bold">F1</th><th className="font-bold">Support</th></tr></thead>
                    <tbody>
                      {Object.entries(metrics.perClass).map(([name, values]) => (
                        <tr key={name} className="border-b border-line text-[9.5px] text-muted transition-colors hover:bg-surface-2">
                          <td className="py-2.5 font-semibold text-ink-soft">{name}</td>
                          <td className="tabular">{(values.precision * 100).toFixed(0)}%</td>
                          <td className="tabular">{(values.recall * 100).toFixed(0)}%</td>
                          <td className="tabular">{(values.f1 * 100).toFixed(0)}%</td>
                          <td className="tabular">{values.support}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            ) : view === "matrix" ? (
              <div className="scrollbar-thin overflow-x-auto">
                <p className="mb-3 text-[9.5px] text-muted">Rows are actual labels; columns are predicted labels. Diagonal cells are correct classifications.</p>
                <table className="border-collapse">
                  <thead><tr><th className="p-2 text-[8px] text-muted">Actual / predicted</th>{data.dataset.categories.map((category) => <th key={category} title={category} className="min-w-11 p-2 text-[7px] text-muted">{SHORT[category]}</th>)}</tr></thead>
                  <tbody>
                    {data.dataset.categories.map((actual) => (
                      <tr key={actual}>
                        <th title={actual} className="whitespace-nowrap p-2 text-left text-[8px] font-semibold text-ink-soft">{SHORT[actual]}</th>
                        {data.dataset.categories.map((predicted) => {
                          const value = metrics.confusionMatrix[actual][predicted];
                          const correct = actual === predicted && value > 0;
                          const wrong = actual !== predicted && value > 0;
                          return <td key={predicted} className={`border border-surface p-2 text-center text-[9px] font-bold ${correct ? "bg-brand-soft text-brand-ink" : wrong ? "bg-red-soft text-red-ink" : "bg-surface-2 text-muted"}`}>{value}</td>;
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              metrics.errors.length ? (
                <div className="space-y-3">
                  {metrics.errors.map((item) => (
                    <div key={item.id} className="rounded-[11px] border border-amber/30 bg-amber-soft p-4">
                      <p className="text-[10px] leading-5 text-ink-soft">“{item.text}”</p>
                      <div className="mt-2 text-[8.5px] text-amber-ink">Actual: <strong>{item.actual}</strong> · Predicted: <strong>{item.predicted}</strong></div>
                    </div>
                  ))}
                </div>
              ) : <div className="rounded-[11px] border border-brand/30 bg-brand-soft p-5 text-[10px] text-brand-ink">No misclassifications on this small synthetic set. This does not establish real-world reliability.</div>
            )}
          </div>

          <div className="border-t border-line bg-surface-2 p-4 text-[9.5px] leading-5 text-muted">
            <strong className="text-ink">Evaluation scope:</strong> {data.dataset.limitations} {data.llmEvaluation.note}
          </div>
        </div>
      ) : null}
    </div>
  );
}

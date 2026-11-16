"use client";
import { useMemo, useState } from "react";
import Link from "next/link";
import { AlertTriangle, ArrowRight, Download, FileText, GitCompareArrows, Search, Trash2, X } from "lucide-react";
import type { AnalysisResult } from "@/lib/types";

export interface HistoryEntry { analysisId: string; documentId: string; filename: string; createdAt: string; fileType: string; result: AnalysisResult; }
const LEVEL_WEIGHT = { LOW: 0, MODERATE: 1, HIGH: 2, CRITICAL: 3 } as const;

export default function HistoryClient({ initialEntries }: { initialEntries: HistoryEntry[] }) {
  const [entries, setEntries] = useState(initialEntries);
  const [query, setQuery] = useState("");
  const [risk, setRisk] = useState("ALL");
  const [type, setType] = useState("ALL");
  const [pending, setPending] = useState<HistoryEntry | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState("");

  const types = [...new Set(entries.map((entry) => entry.result.general.contractType))];
  const filtered = useMemo(() => entries.filter((entry) => {
    const highest = Math.max(0, ...entry.result.risks.map((item) => LEVEL_WEIGHT[item.level]));
    const matchesQuery = !query || `${entry.filename} ${entry.result.general.institution ?? ""}`.toLowerCase().includes(query.toLowerCase());
    const matchesType = type === "ALL" || entry.result.general.contractType === type;
    const matchesRisk = risk === "ALL" || (risk === "HIGH" ? highest >= 2 : risk === "MODERATE" ? highest === 1 : highest === 0);
    return matchesQuery && matchesType && matchesRisk;
  }), [entries, query, risk, type]);

  async function confirmDelete() {
    if (!pending) return;
    setDeleting(true); setError("");
    try {
      const response = await fetch(`/api/documents/${pending.documentId}`, { method: "DELETE" });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Delete failed");
      setEntries((all) => all.filter((item) => item.documentId !== pending.documentId));
      setPending(null);
    } catch (err) { setError(err instanceof Error ? err.message : "Delete failed"); }
    finally { setDeleting(false); }
  }

  return (
    <>
      <div className="flex flex-col gap-3 rounded-[14px] border border-line bg-surface p-3 md:flex-row">
        <div className="relative flex-1">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
          <input className="field !py-2.5 !pl-9 !text-[11px]" placeholder="Search filename or institution…" value={query} onChange={(event) => setQuery(event.target.value)} aria-label="Search history" />
        </div>
        <select className="field !py-2.5 !text-[10.5px] md:w-[212px]" value={type} onChange={(event) => setType(event.target.value)} aria-label="Filter contract type">
          <option value="ALL">All contract types</option>{types.map((item) => <option key={item}>{item}</option>)}
        </select>
        <select className="field !py-2.5 !text-[10.5px] md:w-[176px]" value={risk} onChange={(event) => setRisk(event.target.value)} aria-label="Filter risk level">
          <option value="ALL">All risk levels</option><option value="HIGH">High / critical</option><option value="MODERATE">Moderate highest</option><option value="LOW">Low only</option>
        </select>
        {(query || type !== "ALL" || risk !== "ALL") && (
          <button onClick={() => { setQuery(""); setType("ALL"); setRisk("ALL"); }} className="btn-ghost !min-h-10 !text-[10.5px] md:w-auto"><X size={13} />Clear</button>
        )}
      </div>

      {error && <div role="alert" className="fade-up mt-4 rounded-[11px] border border-red/30 bg-red-soft p-3 text-[11px] text-red-ink">{error}</div>}

      <div className="mt-5 overflow-hidden rounded-[16px] border border-line bg-surface">
        <div className="hidden grid-cols-[1.5fr_.85fr_.6fr_.65fr_124px] gap-4 border-b border-line bg-surface-2 px-5 py-3 text-[8.5px] font-bold uppercase tracking-[.08em] text-muted lg:grid">
          <span>Document</span><span>Contract & amount</span><span>Est. extra cost</span><span>Review priority</span><span>Actions</span>
        </div>

        {filtered.length === 0 ? (
          <div className="p-12 text-center">
            <span className="mx-auto grid h-12 w-12 place-items-center rounded-[14px] bg-surface-2 text-muted"><FileText size={24} /></span>
            <h2 className="mt-4 text-[13px] font-bold text-ink">{entries.length ? "No reports match these filters" : "No saved analyses yet"}</h2>
            <p className="mx-auto mt-2 max-w-[420px] text-[10.5px] leading-5 text-muted">{entries.length ? "Clear a filter or try a different search term." : "Analyse a document to create your first evidence-linked report."}</p>
            {!entries.length && <Link href="/analyze" className="btn-primary mt-5">Analyse a document <ArrowRight size={14} /></Link>}
          </div>
        ) : filtered.map((entry) => {
          const concerns = entry.result.risks.filter((item) => item.level !== "LOW").length;
          const critical = entry.result.risks.some((item) => item.level === "HIGH" || item.level === "CRITICAL");
          return (
            <div key={entry.analysisId} className="grid gap-4 border-b border-line p-4 transition-colors last:border-0 hover:bg-surface-2 sm:p-5 lg:grid-cols-[1.5fr_.85fr_.6fr_.65fr_124px] lg:items-center">
              <div className="flex min-w-0 items-center gap-3">
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-[11px] bg-surface-3 text-ink-soft"><FileText size={18} /></span>
                <div className="min-w-0">
                  <Link href={`/analysis/${entry.analysisId}`} className="block truncate text-[11.5px] font-bold text-ink transition-colors hover:text-brand">{entry.filename}</Link>
                  <div className="mt-1 text-[9.5px] text-muted">{new Date(entry.createdAt).toLocaleDateString("en", { dateStyle: "medium" })} · {entry.fileType === "raw" ? "RAW TEXT" : entry.fileType.toUpperCase()}</div>
                </div>
              </div>
              <div className="min-w-0">
                <div className="truncate text-[10.5px] font-semibold text-ink-soft">{entry.result.general.contractType}</div>
                <div className="tabular mt-1 text-[9.5px] text-muted">{entry.result.general.principal?.toLocaleString() ?? "Amount n/a"} {entry.result.general.currency ?? ""}</div>
              </div>
              <div>
                <div className="tabular text-[11.5px] font-bold text-ink">{entry.result.costs.additionalCost?.toLocaleString(undefined, { maximumFractionDigits: 2 }) ?? "Partial"} <span className="text-[9px] font-medium text-muted">{entry.result.costs.currency ?? ""}</span></div>
                <div className="mt-1 text-[8.5px] capitalize text-muted">{entry.result.costs.status} estimate</div>
              </div>
              <div>
                <span className={`chip !text-[8.5px] ${critical ? "!border-red/30 !bg-red-soft !text-red-ink" : concerns ? "!border-amber/35 !bg-amber-soft !text-amber-ink" : "!border-brand/30 !bg-brand-soft !text-brand-ink"}`}>
                  {critical ? "High priority" : concerns ? `${concerns} concerns` : "Low flags only"}
                </span>
              </div>
              <div className="flex items-center gap-1">
                <Link href={`/analysis/${entry.analysisId}`} className="btn-ghost !min-h-8 !p-2" title="Open report" aria-label={`Open report for ${entry.filename}`}><ArrowRight size={15} /></Link>
                <a href={`/api/reports/${entry.analysisId}/pdf`} className="btn-ghost !min-h-8 !p-2" title="Download PDF" aria-label={`Download PDF for ${entry.filename}`}><Download size={15} /></a>
                <Link href={`/compare?a=${entry.analysisId}`} className="btn-ghost !min-h-8 !p-2" title="Compare" aria-label={`Compare ${entry.filename}`}><GitCompareArrows size={15} /></Link>
                <button onClick={() => setPending(entry)} className="btn-ghost !min-h-8 !p-2 hover:!bg-red-soft hover:!text-red-ink" title="Delete document" aria-label={`Delete ${entry.filename}`}><Trash2 size={15} /></button>
              </div>
            </div>
          );
        })}
      </div>

      {pending && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-[#04101b]/55 p-4 backdrop-blur-[3px]" role="dialog" aria-modal="true" aria-labelledby="delete-title">
          <div className="fade-up w-full max-w-[432px] rounded-[18px] border border-line bg-surface p-6 shadow-[var(--shadow-lg)]">
            <div className="flex items-start">
              <span className="grid h-10 w-10 place-items-center rounded-[11px] bg-red-soft text-red-ink"><AlertTriangle size={19} /></span>
              <button onClick={() => setPending(null)} className="btn-ghost ml-auto !min-h-8 !p-2" aria-label="Close dialog"><X size={17} /></button>
            </div>
            <h2 id="delete-title" className="mt-4 text-[17px] font-semibold tracking-[-.02em] text-ink">Delete this document and report?</h2>
            <p className="mt-3 text-[11px] leading-6 text-muted">
              <strong className="break-all text-ink-soft">{pending.filename}</strong><br />
              This permanently removes its analyses, source excerpts, cost results, and any comparisons involving it. This cannot be undone.
            </p>
            <div className="mt-6 flex justify-end gap-2">
              <button onClick={() => setPending(null)} className="btn-secondary">Cancel</button>
              <button disabled={deleting} onClick={() => void confirmDelete()} className="btn-danger">{deleting ? "Deleting…" : "Delete permanently"}</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

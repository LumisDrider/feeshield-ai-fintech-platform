import type { Metadata } from "next";
import Link from "next/link";
import { desc, eq } from "drizzle-orm";
import {
  AlertTriangle, ArrowRight, ArrowUpRight, CalendarDays, Clock3, FileSearch, FileText,
  GitCompareArrows, ScanLine, ShieldCheck, Upload,
} from "lucide-react";
import { db } from "@/db";
import { analyses, documents } from "@/db/schema";
import { getWorkspace } from "@/lib/workspace";
import type { AnalysisResult } from "@/lib/types";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Dashboard" };

function money(value: number | null, currency: string | null) {
  if (value === null) return "Partial";
  try { return new Intl.NumberFormat("en", { style: "currency", currency: currency || "USD", maximumFractionDigits: 0 }).format(value); }
  catch { return `${value} ${currency ?? ""}`; }
}

const FEE_CATEGORIES = ["Maintenance Fee", "Processing Fee", "Administrative Fee", "Insurance", "Late Payment Penalty", "Early Repayment Penalty", "Transaction Commission", "Other Financial Charge"];

export default async function DashboardPage() {
  const user = await getWorkspace();
  const rows = await db.select({ analysis: analyses, document: documents }).from(analyses)
    .innerJoin(documents, eq(analyses.documentId, documents.id))
    .where(eq(documents.userId, user.id)).orderBy(desc(analyses.createdAt)).limit(100);
  const recentDocuments = await db.select().from(documents).where(eq(documents.userId, user.id)).orderBy(desc(documents.uploadTimestamp)).limit(4);

  const concernCount = rows.reduce((sum, row) => sum + row.analysis.fullResult.risks.filter((risk) => risk.level !== "LOW").length, 0);
  const highCount = rows.reduce((sum, row) => sum + row.analysis.fullResult.risks.filter((risk) => risk.level === "HIGH" || risk.level === "CRITICAL").length, 0);
  const feeCounts = new Map<string, number>();
  rows.forEach((row) => row.analysis.fullResult.terms.forEach((term) => {
    if (FEE_CATEGORIES.includes(term.category)) feeCounts.set(term.category, (feeCounts.get(term.category) ?? 0) + 1);
  }));
  const fees = [...feeCounts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 6);
  const maxFee = Math.max(...fees.map(([, count]) => count), 1);
  const days = Array.from({ length: 7 }, (_, index) => { const date = new Date(); date.setHours(0, 0, 0, 0); date.setDate(date.getDate() - (6 - index)); return date; });
  const activity = days.map((day) => ({ day, count: rows.filter((row) => { const created = new Date(row.analysis.createdAt); return created >= day && created < new Date(day.getTime() + 86_400_000); }).length }));
  const maxActivity = Math.max(...activity.map((item) => item.count), 1);
  const pending = recentDocuments.filter((document) => document.processingStatus === "uploaded").length;

  const stats = [
    { label: "Documents analysed", value: rows.length, note: pending ? `${pending} prepared, not yet analysed` : "Saved reports in this workspace", icon: FileText, tone: "bg-navy-soft text-navy" },
    { label: "Potential cost concerns", value: concernCount, note: "Moderate, high & critical rules", icon: AlertTriangle, tone: "bg-amber-soft text-amber-ink" },
    { label: "High-priority conditions", value: highCount, note: "High & critical, across saved reports", icon: ShieldCheck, tone: "bg-red-soft text-red-ink" },
    { label: "Fee categories detected", value: feeCounts.size, note: "Distinct categories with source clauses", icon: FileSearch, tone: "bg-brand-soft text-brand" },
  ];

  return (
    <div className="mx-auto max-w-[1280px]">
      <header className="fade-up flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <p className="eyebrow">Your financial clarity workspace</p>
          <h1 className="mt-2 text-[27px] font-semibold tracking-[-.035em] text-ink sm:text-[33px]">
            {rows.length ? "Welcome back to your documents." : "Start with the agreement in front of you."}
          </h1>
          <p className="mt-2 max-w-[680px] text-[12.5px] leading-6 text-muted">
            {rows.length ? "Saved reports, source evidence, and cost models from this private workspace." : "No demonstration statistics are shown here. Your real analysis activity appears after your first report."}
          </p>
        </div>
        <Link href="/analyze" className="btn-primary w-fit"><Upload size={15} />Analyse a document</Link>
      </header>

      <div className="mt-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        {stats.map(({ label, value, note, icon: Icon, tone }) => (
          <div key={label} className="surface surface-hover p-4 sm:p-5">
            <div className="flex items-start justify-between gap-2">
              <div className="text-[9px] font-bold uppercase leading-4 tracking-[.06em] text-muted">{label}</div>
              <span className={`grid h-8 w-8 shrink-0 place-items-center rounded-[10px] ${tone}`}><Icon size={15} /></span>
            </div>
            <div className="tabular mt-2.5 text-[28px] font-semibold tracking-[-.04em] text-ink">{value}</div>
            <p className="mt-1 text-[9.5px] leading-4 text-muted">{note}</p>
          </div>
        ))}
      </div>

      {rows.length === 0 ? (
        <section className="surface fade-up mt-5 overflow-hidden">
          <div className="grid lg:grid-cols-[1fr_.8fr]">
            <div className="p-7 sm:p-10">
              <span className="grid h-12 w-12 place-items-center rounded-[14px] bg-brand-soft text-brand"><ScanLine size={23} /></span>
              <h2 className="mt-5 text-[21px] font-semibold tracking-[-.025em] text-ink">Turn your first contract into evidence.</h2>
              <p className="mt-3 max-w-[540px] text-[12px] leading-6 text-muted">
                Upload a digital PDF or TXT agreement, paste its text, or load a labelled synthetic contract. FeeShield AI extracts only what the source wording supports and clearly shows what is missing.
              </p>
              <div className="mt-6 flex flex-wrap gap-3">
                <Link href="/analyze" className="btn-primary">Start first analysis <ArrowRight size={15} /></Link>
                <Link href="/learn" className="btn-secondary">Learn about hidden fees</Link>
              </div>
            </div>
            <div className="border-t border-line bg-surface-2 p-7 lg:border-l lg:border-t-0">
              <h3 className="text-[11px] font-bold text-ink">Your report will include</h3>
              <div className="mt-5 space-y-4">
                {["Executive summary and financial terms", "Clause-level fee and risk explanations", "Deterministic repayment cost estimates", "Original quotations with page references", "Provider questions and PDF export"].map((item, index) => (
                  <div key={item} className="flex items-center gap-3 text-[10.5px] font-medium text-ink-soft">
                    <span className="grid h-5 w-5 shrink-0 place-items-center rounded-full bg-surface text-[8px] font-bold text-brand shadow-[var(--shadow-sm)]">{index + 1}</span>{item}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>
      ) : (
        <div className="mt-5 grid items-start gap-5 xl:grid-cols-[1.45fr_.75fr]">
          <div className="space-y-5">
            <section className="surface overflow-hidden">
              <div className="flex items-center gap-3 border-b border-line p-5">
                <div>
                  <h2 className="text-[12.5px] font-bold text-ink">Recently analysed documents</h2>
                  <p className="mt-1 text-[9.5px] text-muted">Open a report to inspect its calculations and evidence.</p>
                </div>
                <Link href="/history" className="ml-auto flex items-center gap-1 text-[10px] font-bold text-brand hover:underline">View all <ArrowUpRight size={13} /></Link>
              </div>
              <div>
                {rows.slice(0, 4).map(({ analysis, document }) => {
                  const result: AnalysisResult = analysis.fullResult;
                  const concerns = result.risks.filter((risk) => risk.level !== "LOW").length;
                  const critical = result.risks.some((risk) => risk.level === "HIGH" || risk.level === "CRITICAL");
                  return (
                    <Link href={`/analysis/${analysis.id}`} key={analysis.id} className="group flex items-center gap-3 border-b border-line p-4 transition-colors last:border-0 hover:bg-surface-2 sm:px-5">
                      <span className="grid h-10 w-10 shrink-0 place-items-center rounded-[11px] bg-surface-3 text-ink-soft transition-transform duration-300 group-hover:scale-105"><FileText size={18} /></span>
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-[11.5px] font-bold text-ink">{document.filename}</div>
                        <div className="mt-1 truncate text-[9.5px] text-muted">{result.general.contractType} · {new Date(analysis.createdAt).toLocaleDateString("en", { month: "short", day: "numeric" })}</div>
                      </div>
                      <div className="hidden text-right sm:block">
                        <div className="tabular text-[11px] font-bold text-ink">{money(result.costs.additionalCost, result.costs.currency)}</div>
                        <div className="mt-1 text-[8.5px] text-muted">est. additional cost</div>
                      </div>
                      <span className={`chip shrink-0 !text-[8.5px] ${critical ? "!border-red/30 !bg-red-soft !text-red-ink" : concerns ? "!border-amber/35 !bg-amber-soft !text-amber-ink" : "!border-brand/30 !bg-brand-soft !text-brand-ink"}`}>
                        {concerns ? `${concerns} concerns` : "Low flags"}
                      </span>
                      <ArrowRight size={14} className="shrink-0 text-muted transition-transform duration-300 group-hover:translate-x-0.5 group-hover:text-brand" />
                    </Link>
                  );
                })}
              </div>
            </section>

            <section className="surface p-5">
              <div className="flex items-center gap-3">
                <div>
                  <h2 className="text-[12.5px] font-bold text-ink">Analysis activity</h2>
                  <p className="mt-1 text-[9.5px] text-muted">Completed reports over the last seven days</p>
                </div>
                <CalendarDays size={16} className="ml-auto text-muted" />
              </div>
              <div className="mt-6 flex h-[136px] items-end gap-2 sm:gap-4">
                {activity.map(({ day, count }) => (
                  <div key={day.toISOString()} className="flex h-full flex-1 flex-col items-center justify-end gap-2">
                    <span className="tabular text-[9px] font-bold text-ink-soft">{count || ""}</span>
                    <div className={`w-full max-w-10 rounded-t-[6px] transition-all duration-700 ${count ? "bg-brand" : "bg-surface-3"}`} style={{ height: `${Math.max((count / maxActivity) * 86, count ? 12 : 4)}px` }} />
                    <span className="text-[8.5px] font-semibold text-muted">{day.toLocaleDateString("en", { weekday: "short" })}</span>
                  </div>
                ))}
              </div>
            </section>
          </div>

          <aside className="space-y-5">
            <section className="surface p-5">
              <h2 className="text-[12.5px] font-bold text-ink">Detected fee categories</h2>
              <p className="mt-1.5 text-[9.5px] leading-4 text-muted">Clause counts across saved reports. A clause may represent a conditional or zero-value term.</p>
              <div className="mt-5 space-y-4">
                {fees.map(([name, count]) => (
                  <div key={name}>
                    <div className="flex justify-between text-[9.5px]"><span className="font-medium text-ink-soft">{name}</span><span className="tabular font-bold text-ink">{count}</span></div>
                    <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-surface-3"><div className="h-full rounded-full bg-brand transition-[width] duration-700" style={{ width: `${(count / maxFee) * 100}%` }} /></div>
                  </div>
                ))}
              </div>
            </section>

            <section className="surface p-5">
              <div className="flex items-center gap-2"><Clock3 size={15} className="text-muted" /><h2 className="text-[12px] font-bold text-ink">Recent document activity</h2></div>
              <div className="mt-4 space-y-4">
                {recentDocuments.map((document) => (
                  <div key={document.id} className="flex gap-3">
                    <span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${document.processingStatus === "completed" ? "bg-brand" : document.processingStatus === "failed" ? "bg-red" : "bg-amber"}`} />
                    <div className="min-w-0">
                      <div className="truncate text-[10px] font-semibold text-ink-soft">{document.filename}</div>
                      <div className="mt-1 text-[8.5px] capitalize text-muted">{document.processingStatus} · {new Date(document.uploadTimestamp).toLocaleDateString("en", { month: "short", day: "numeric" })}</div>
                    </div>
                  </div>
                ))}
              </div>
            </section>

            {rows.length >= 2 && (
              <Link href={`/compare?a=${rows[0].analysis.id}&b=${rows[1].analysis.id}`} className="group block rounded-[16px] bg-navy p-5 text-white transition-transform duration-300 hover:-translate-y-0.5 dark:bg-surface-2 dark:text-ink dark:ring-1 dark:ring-line">
                <GitCompareArrows size={20} className="text-brand dark:text-brand" />
                <h2 className="mt-3 text-[12.5px] font-bold">Compare your two latest reports</h2>
                <p className="mt-2 text-[10px] leading-5 opacity-80">Check total cost and term differences under explicit assumptions.</p>
                <span className="mt-4 flex items-center gap-1 text-[10px] font-bold text-brand-ink dark:text-brand">Open comparison <ArrowRight size={13} className="transition-transform duration-300 group-hover:translate-x-1" /></span>
              </Link>
            )}
          </aside>
        </div>
      )}
    </div>
  );
}

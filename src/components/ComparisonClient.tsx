"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { AlertCircle, ArrowDownUp, ArrowRight, Check, ChevronRight, CircleAlert, Copy, FileText, GitCompareArrows, Info, Loader2, Scale, ShieldCheck } from "lucide-react";
import type { AnalysisResult, ComparisonResult } from "@/lib/types";

export interface CompareOption { analysisId: string; filename: string; createdAt: string; result: AnalysisResult; }

function display(value: string | number | null, format: string, currency: string | null) {
  if (value === null || value === "") return <span className="text-muted">Not available</span>;
  if (typeof value === "string") return value;
  if (format === "percent") return `${value}%`;
  if (format === "currency") return `${value.toLocaleString(undefined, { maximumFractionDigits: 2 })} ${currency || "currency n/a"}`;
  return value.toLocaleString();
}

export default function ComparisonClient({ options, initialA, initialB }: { options: CompareOption[]; initialA?: string; initialB?: string }) {
  const [a, setA] = useState(initialA && options.some((option) => option.analysisId === initialA) ? initialA : options[0]?.analysisId ?? "");
  const [b, setB] = useState(initialB && options.some((option) => option.analysisId === initialB) ? initialB : options.find((option) => option.analysisId !== initialA)?.analysisId ?? "");
  const [result, setResult] = useState<ComparisonResult | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);
  const started = useRef(false);

  const compare = useCallback(async () => {
    if (!a || !b || a === b) { setError("Select two different analysed contracts."); return; }
    setBusy(true); setError("");
    try {
      const response = await fetch("/api/comparisons", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ analysisAId: a, analysisBId: b }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Comparison failed");
      setResult(data.result);
      window.history.replaceState(null, "", `/compare?a=${a}&b=${b}`);
    } catch (err) { setError(err instanceof Error ? err.message : "Comparison failed"); }
    finally { setBusy(false); }
  }, [a, b]);

  useEffect(() => {
    if (initialA && initialB && !started.current && options.length >= 2) { started.current = true; void compare(); }
  }, [initialA, initialB, options.length, compare]);

  const optionA = options.find((option) => option.analysisId === a);
  const optionB = options.find((option) => option.analysisId === b);

  async function copyLink() {
    await navigator.clipboard.writeText(window.location.href).catch(() => undefined);
    setCopied(true); setTimeout(() => setCopied(false), 1800);
  }

  if (options.length < 2) {
    return (
      <div className="surface fade-up mt-7 p-10 text-center">
        <span className="mx-auto grid h-12 w-12 place-items-center rounded-[14px] bg-brand-soft text-brand"><GitCompareArrows size={24} /></span>
        <h2 className="mt-4 text-[17px] font-semibold text-ink">Two analysed contracts are needed</h2>
        <p className="mx-auto mt-3 max-w-[480px] text-[11px] leading-6 text-muted">Analyse two agreements with the same real document pipeline, then return here to compare their rates, charges, risks, and modelled costs.</p>
        <Link href="/analyze" className="btn-primary mt-6">Analyse {options.length ? "another" : "a"} document <ArrowRight size={15} /></Link>
      </div>
    );
  }

  return (
    <div className="mt-6">
      <section className="surface p-4 sm:p-5">
        <div className="grid items-end gap-4 lg:grid-cols-[1fr_46px_1fr_auto]">
          <Selector label="Contract A" value={a} onChange={(value) => { setA(value); setResult(null); }} options={options} exclude={b} />
          <button onClick={() => { setA(b); setB(a); setResult(null); }} className="btn-secondary mx-auto !h-10 !min-h-10 !w-10 !p-0" title="Swap contracts" aria-label="Swap contracts"><ArrowDownUp size={15} /></button>
          <Selector label="Contract B" value={b} onChange={(value) => { setB(value); setResult(null); }} options={options} exclude={a} />
          <button disabled={busy} onClick={() => void compare()} className="btn-primary lg:mb-px">{busy ? <Loader2 size={15} className="spin-slow" /> : <GitCompareArrows size={15} />}{busy ? "Comparing…" : result ? "Run again" : "Compare contracts"}</button>
        </div>
        {error && <div role="alert" className="fade-up mt-4 flex items-center gap-2 rounded-[10px] border border-red/30 bg-red-soft p-3 text-[10.5px] text-red-ink"><AlertCircle size={14} />{error}</div>}
      </section>

      {busy && (
        <div className="surface fade-up mt-5 flex items-center justify-center gap-3 p-10 text-[11px] text-muted">
          <Loader2 size={19} className="spin-slow text-brand" />Applying currency, principal, duration, and missing-data checks…
        </div>
      )}

      {result && !busy && optionA && optionB && (
        <div className="fade-up mt-5 space-y-5">
          <section className="overflow-hidden rounded-[18px] border border-line" style={{ background: "var(--hero-bg)" }}>
            <div className="grid gap-5 p-6 text-white sm:grid-cols-[1fr_auto_1fr] sm:items-center sm:p-7">
              <ContractHeader label="Contract A" filename={optionA.filename} result={optionA.result} />
              <Scale size={23} className="mx-auto text-[#6fd9c5]" />
              <ContractHeader label="Contract B" filename={optionB.filename} result={optionB.result} align="right" />
            </div>
            <div className="border-t border-white/10 bg-white/[.045] p-5 sm:px-7">
              <div className="flex items-start gap-3">
                <Info size={16} className="mt-0.5 shrink-0 text-[#6fd9c5]" />
                <div>
                  <h2 className="text-[10.5px] font-bold uppercase tracking-[.08em] text-[#6fd9c5]">Comparison summary</h2>
                  <p className="mt-2 text-[12px] leading-6 text-[#d5e2e9]">{result.summary}</p>
                </div>
              </div>
            </div>
          </section>

          <div className="flex flex-col gap-3 rounded-[13px] border border-brand/25 bg-brand-soft p-4 sm:flex-row sm:items-center">
            <ShieldCheck size={17} className="shrink-0 text-brand" />
            <p className="text-[10px] leading-5 text-ink-soft"><strong className="text-ink">Normalisation check:</strong> {result.normalisation.note}</p>
            <button onClick={() => void copyLink()} className="btn-secondary !min-h-8 shrink-0 !text-[9.5px] sm:ml-auto">{copied ? <Check size={12} /> : <Copy size={12} />}{copied ? "Link copied" : "Copy comparison link"}</button>
          </div>

          {result.normalisation.applied && (
            <div className="grid gap-3 sm:grid-cols-2">
              {[{ label: "Contract A · modelled extra cost / month", value: result.normalisation.monthlyCostA, option: optionA }, { label: "Contract B · modelled extra cost / month", value: result.normalisation.monthlyCostB, option: optionB }].map((item) => (
                <div key={item.label} className="surface p-5">
                  <div className="text-[9px] font-bold uppercase tracking-[.07em] text-muted">{item.label}</div>
                  <div className="tabular mt-2 text-[22px] font-semibold text-ink">{item.value?.toFixed(2) ?? "n/a"} <span className="text-[11px] text-muted">{item.option.result.general.currency}</span></div>
                </div>
              ))}
            </div>
          )}

          <section className="surface overflow-hidden">
            <div className="border-b border-line p-5">
              <h2 className="text-[12.5px] font-bold text-ink">Side-by-side financial terms</h2>
              <p className="mt-1 text-[9.5px] text-muted">A highlighted value is numerically lower for that isolated metric; it is not an overall recommendation.</p>
            </div>
            <div className="scrollbar-thin overflow-x-auto">
              <table className="w-full min-w-[660px] border-collapse text-left">
                <thead>
                  <tr className="bg-surface-2 text-[8.5px] uppercase tracking-[.08em] text-muted">
                    <th className="w-[28%] px-5 py-3 font-bold">Metric</th><th className="w-[36%] px-5 py-3 font-bold">Contract A</th><th className="w-[36%] px-5 py-3 font-bold">Contract B</th>
                  </tr>
                </thead>
                <tbody>
                  {result.metrics.map((metric) => {
                    const numeric = typeof metric.a === "number" && typeof metric.b === "number";
                    const lowerA = metric.lowerIsLessCost && numeric && (metric.a as number) < (metric.b as number);
                    const lowerB = metric.lowerIsLessCost && numeric && (metric.b as number) < (metric.a as number);
                    return (
                      <tr key={metric.key} className="border-t border-line transition-colors hover:bg-surface-2">
                        <th className="px-5 py-4 text-[10.5px] font-semibold text-ink-soft">{metric.label}</th>
                        <td className={`px-5 py-4 text-[11px] font-semibold ${lowerA ? "text-brand-ink" : "text-ink"}`}>
                          <span className="flex items-center gap-2">{display(metric.a, metric.format, optionA.result.general.currency)}{lowerA && <span className="chip !border-brand/30 !bg-brand-soft !py-0.5 !text-[7.5px] uppercase !text-brand-ink">Lower</span>}</span>
                        </td>
                        <td className={`px-5 py-4 text-[11px] font-semibold ${lowerB ? "text-brand-ink" : "text-ink"}`}>
                          <span className="flex items-center gap-2">{display(metric.b, metric.format, optionB.result.general.currency)}{lowerB && <span className="chip !border-brand/30 !bg-brand-soft !py-0.5 !text-[7.5px] uppercase !text-brand-ink">Lower</span>}</span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </section>

          <div className="grid gap-5 lg:grid-cols-2">
            {[{ label: "A", option: optionA }, { label: "B", option: optionB }].map(({ label, option }) => (
              <section key={label} className="surface p-5">
                <div className="flex items-center gap-2"><FileText size={15} className="text-muted" /><h2 className="truncate text-[11.5px] font-bold text-ink">Contract {label}: unclear & missing conditions</h2></div>
                {option.result.missingInformation.length ? (
                  <ul className="mt-4 space-y-2.5">{option.result.missingInformation.map((item) => (
                    <li key={item} className="flex gap-2 text-[9.5px] leading-5 text-muted"><CircleAlert size={12} className="mt-0.5 shrink-0 text-amber" />{item}</li>
                  ))}</ul>
                ) : <p className="mt-4 text-[9.5px] text-brand-ink">No core missing-information flags raised.</p>}
                <div className="mt-4 border-t border-line pt-3">
                  <Link href={`/analysis/${option.analysisId}`} className="inline-flex items-center gap-1 text-[9.5px] font-bold text-brand hover:underline">Open full source evidence <ChevronRight size={12} /></Link>
                </div>
              </section>
            ))}
          </div>

          <section className="surface p-5">
            <h2 className="text-[12px] font-bold text-ink">Why this is not a universal “best contract” verdict</h2>
            <div className="mt-4 grid gap-3 md:grid-cols-2">
              {result.caveats.map((caveat) => (
                <div key={caveat} className="flex gap-2.5 rounded-[11px] bg-surface-2 p-3 text-[9.5px] leading-5 text-muted"><AlertCircle size={13} className="mt-0.5 shrink-0 text-ink-soft" />{caveat}</div>
              ))}
            </div>
          </section>
        </div>
      )}
    </div>
  );
}

function Selector({ label, value, onChange, options, exclude }: { label: string; value: string; onChange: (value: string) => void; options: CompareOption[]; exclude: string }) {
  return (
    <div>
      <label className="label" htmlFor={`select-${label.replace(/\s/g, "-")}`}>{label}</label>
      <select id={`select-${label.replace(/\s/g, "-")}`} className="field !text-[11px]" value={value} onChange={(event) => onChange(event.target.value)}>
        {options.map((option) => (
          <option key={option.analysisId} value={option.analysisId} disabled={option.analysisId === exclude}>
            {option.filename} · {new Date(option.createdAt).toLocaleDateString("en", { month: "short", day: "numeric" })}
          </option>
        ))}
      </select>
    </div>
  );
}

function ContractHeader({ label, filename, result, align = "left" }: { label: string; filename: string; result: AnalysisResult; align?: "left" | "right" }) {
  return (
    <div className={`min-w-0 ${align === "right" ? "sm:text-right" : ""}`}>
      <div className="text-[9px] font-bold uppercase tracking-[.1em] text-[#6fd9c5]">{label}</div>
      <div className="mt-2 truncate text-[13px] font-bold">{filename}</div>
      <div className="tabular mt-2 text-[9.5px] text-[#9fb7c4]">{result.general.contractType} · {result.general.principal ?? "n/a"} {result.general.currency}</div>
    </div>
  );
}

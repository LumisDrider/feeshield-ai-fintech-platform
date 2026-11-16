"use client";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  AlertCircle, AlertTriangle, ArrowLeft, ArrowRight, Banknote, BookOpenCheck, Calculator, CheckCircle2,
  ChevronDown, ChevronRight, CircleDollarSign, Download, ExternalLink, FileQuestion, FileText, Filter,
  GitCompareArrows, Info, MessageSquareText, RefreshCw, Search, ShieldAlert, ShieldCheck, Sparkles,
} from "lucide-react";
import { CATEGORIES } from "@/lib/types";
import type { AnalysisResult, FinancialTerm, RiskLevel } from "@/lib/types";

function money(value: number | null | undefined, currency: string | null | undefined) {
  if (value === null || value === undefined) return "Not available";
  const code = currency || "USD";
  try { return new Intl.NumberFormat("en", { style: "currency", currency: code, maximumFractionDigits: 2 }).format(value); }
  catch { return `${value.toLocaleString(undefined, { maximumFractionDigits: 2 })} ${code}`; }
}
function valueText(term: FinancialTerm) {
  if (term.value === null) return "Not numerically stated";
  if (term.unit === "percent") return `${term.value}%`;
  if (term.unit === "currency") return money(term.value, term.currency);
  return `${term.value} ${term.unit ?? ""}`;
}

const SEVERITY: RiskLevel[] = ["CRITICAL", "HIGH", "MODERATE", "LOW"];
const SECTIONS = [
  { id: "summary", label: "Summary" }, { id: "breakdown", label: "Breakdown" }, { id: "risks", label: "Risks" },
  { id: "cost", label: "True cost" }, { id: "evidence", label: "Evidence" }, { id: "questions", label: "Questions" },
];

export default function ResultsView({ result, analysisId, filename, createdAt }: { result: AnalysisResult; analysisId: string; filename: string; createdAt: string }) {
  const [riskFilter, setRiskFilter] = useState<"ALL" | RiskLevel>("ALL");
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("ALL");
  const [selectedTerm, setSelectedTerm] = useState<string | null>(null);
  const [showAllAssumptions, setShowAllAssumptions] = useState(false);
  const [activeSection, setActiveSection] = useState("summary");

  const concerns = result.risks.filter((risk) => risk.level !== "LOW");
  const visibleRisks = riskFilter === "ALL" ? result.risks : result.risks.filter((risk) => risk.level === riskFilter);
  const visibleTerms = useMemo(() => result.terms.filter((term) =>
    (category === "ALL" || term.category === category) &&
    (!query || `${term.quote} ${term.label} ${term.displayValue}`.toLowerCase().includes(query.toLowerCase()))
  ), [result.terms, category, query]);

  useEffect(() => {
    const observer = new IntersectionObserver((entries) => {
      const visible = entries.filter((entry) => entry.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)[0];
      if (visible) setActiveSection(visible.target.id);
    }, { rootMargin: "-96px 0px -62% 0px", threshold: 0 });
    SECTIONS.forEach(({ id }) => { const node = document.getElementById(id); if (node) observer.observe(node); });
    return () => observer.disconnect();
  }, []);

  const costs = result.costs;
  const costParts = [
    { label: "Principal", value: costs.principal ?? 0, color: "var(--navy)" },
    { label: "Interest", value: costs.estimatedInterest ?? 0, color: "var(--brand)" },
    { label: "Recurring charges", value: costs.recurringCharges ?? 0, color: "var(--amber)" },
    { label: "One-time fees", value: costs.oneTimeFees ?? 0, color: "#bd6542" },
    { label: "Insurance", value: costs.insuranceCost ?? 0, color: "var(--violet)" },
  ];
  const costTotal = costParts.reduce((sum, item) => sum + item.value, 0);
  const monthlyTerms = result.terms.filter((term) => term.recurrence === "monthly" && term.category !== "Interest");
  const oneTimeTerms = result.terms.filter((term) => term.recurrence === "one-time" && term.category !== "Insurance");
  const penaltyTerms = result.terms.filter((term) => term.category.includes("Penalty"));
  const insuranceTerms = result.terms.filter((term) => term.category === "Insurance");
  const otherTerms = result.terms.filter((term) => ["Transaction Commission", "Repayment Condition", "Unclear or Ambiguous Clause", "Other Financial Charge"].includes(term.category));

  function inspectTerm(termId: string | null) {
    if (!termId) return;
    setSelectedTerm(termId); setRiskFilter("ALL"); setCategory("ALL"); setQuery("");
    setTimeout(() => document.getElementById(`evidence-${termId}`)?.scrollIntoView({ behavior: "smooth", block: "center" }), 90);
  }
  function highlighted(term: FinancialTerm) {
    const needle = term.displayValue;
    if (!needle || needle === "Value not explicitly stated" || !term.quote.includes(needle)) return term.quote;
    const [before, after] = term.quote.split(needle);
    return <>{before}<mark className="rounded-[4px] bg-amber-soft px-1 py-0.5 font-bold text-amber-ink">{needle}</mark>{after}</>;
  }

  const summaryCards = [
    { label: "Principal / amount", value: money(result.general.principal, result.general.currency), icon: Banknote },
    { label: "Annual interest", value: result.general.annualInterestRate !== null ? `${result.general.annualInterestRate}%` : "Not stated", icon: CircleDollarSign, note: result.general.interestRateType },
    { label: "Duration", value: result.general.durationMonths ? `${result.general.durationMonths} months` : "Not stated", icon: FileText, note: result.general.repaymentFrequency ?? undefined },
    { label: "Identified fees", value: String(result.statistics.feeCount), icon: FileQuestion },
    { label: "Potential concerns", value: String(concerns.length), icon: ShieldAlert, alert: concerns.length > 0 },
    { label: "Est. additional cost", value: money(costs.additionalCost, costs.currency), icon: Calculator, note: `${costs.status} estimate` },
  ];

  return (
    <div className="mx-auto max-w-[1280px]">
      <div className="no-print flex flex-col gap-3 sm:flex-row sm:items-center">
        <Link href="/history" className="btn-ghost !min-h-9 !justify-start !px-2 !text-[11px]"><ArrowLeft size={15} />History</Link>
        <div className="flex flex-wrap gap-2 sm:ml-auto">
          <Link href={`/compare?a=${analysisId}`} className="btn-secondary !min-h-9 !text-[11px]"><GitCompareArrows size={14} />Compare</Link>
          <button onClick={() => window.print()} className="btn-secondary !min-h-9 !text-[11px]"><FileText size={14} />Print</button>
          <a href={`/api/reports/${analysisId}/pdf`} className="btn-primary !min-h-9 !text-[11px]"><Download size={14} />Export PDF</a>
        </div>
      </div>

      <header className="fade-up mt-4 border-b border-line pb-6">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-start">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span className="chip !border-brand/30 !bg-brand-soft !text-brand-ink"><CheckCircle2 size={11} />Analysis complete</span>
              <span className="text-[10px] text-muted">{new Date(createdAt).toLocaleString("en", { dateStyle: "medium", timeStyle: "short" })}</span>
            </div>
            <h1 className="mt-3 max-w-[820px] break-words text-[26px] font-semibold tracking-[-.035em] text-ink sm:text-[33px]">{filename}</h1>
            <p className="mt-2 text-[12px] text-muted">{result.general.institution || "Institution not identified"} · {result.general.contractType}</p>
          </div>
          <div className="grid grid-cols-3 gap-5 rounded-[14px] border border-line bg-surface-2 px-5 py-4 lg:ml-auto">
            {[["Clauses", String(result.terms.length)], ["Concerns", String(concerns.length)], ["Mode", result.analysisMode === "ai-assisted" ? "AI + rules" : "Rule-based"]].map(([label, value]) => (
              <div key={label}>
                <div className="text-[9px] font-bold uppercase tracking-[.08em] text-muted">{label}</div>
                <div className={`mt-1 text-[13px] font-bold ${label === "Concerns" && concerns.length ? "text-amber-ink" : label === "Mode" ? "text-brand" : "tabular text-[19px] text-ink"}`}>{value}</div>
              </div>
            ))}
          </div>
        </div>
      </header>

      <div className={`fade-up mt-5 flex items-start gap-3 rounded-[13px] border p-4 text-[11px] leading-5 ${result.analysisMode === "ai-assisted" ? "border-brand/30 bg-brand-soft text-ink-soft" : "border-amber/35 bg-amber-soft text-ink-soft"}`}>
        <Info size={16} className={`mt-0.5 shrink-0 ${result.analysisMode === "ai-assisted" ? "text-brand" : "text-amber"}`} />
        <div><strong className="font-bold text-ink">{result.analysisMode === "ai-assisted" ? "AI-assisted extraction" : "Limited analysis mode"}</strong><br />{result.modeNotice}</div>
      </div>

      <nav className="no-print scrollbar-thin sticky top-[66px] z-10 mt-5 flex gap-1 overflow-x-auto rounded-[12px] border border-line bg-surface/92 p-1.5 backdrop-blur-xl">
        {SECTIONS.map(({ id, label }) => (
          <a key={id} href={`#${id}`}
            className={`whitespace-nowrap rounded-[9px] px-3 py-2 text-[10.5px] font-bold transition-all duration-200 ${activeSection === id ? "bg-brand-soft text-brand-ink" : "text-muted hover:bg-surface-3 hover:text-ink"}`}>
            {label}{id === "risks" && concerns.length > 0 && <span className="ml-1.5 text-[9px] opacity-75">{concerns.length}</span>}
          </a>
        ))}
      </nav>

      <section id="summary" className="scroll-mt-[132px] pt-8">
        <p className="eyebrow">A · Executive summary</p>
        <h2 className="mt-2 text-[20px] font-semibold tracking-[-.025em] text-ink">Your agreement at a glance</h2>
        <div className="mt-5 grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
          {summaryCards.map(({ label, value, icon: Icon, note, alert }) => (
            <div key={label} className="surface surface-hover p-4">
              <div className="flex items-start justify-between gap-2">
                <span className="text-[9px] font-bold uppercase leading-4 tracking-[.06em] text-muted">{label}</span>
                <Icon size={14} className={alert ? "shrink-0 text-amber" : "shrink-0 text-muted"} />
              </div>
              <div className={`tabular mt-3 break-words text-[16px] font-semibold tracking-[-.02em] ${alert ? "text-amber-ink" : "text-ink"}`}>{value}</div>
              {note && <div className="mt-1 text-[9px] capitalize text-muted">{note}</div>}
            </div>
          ))}
        </div>
        <div className="surface mt-4 flex items-start gap-4 p-5 sm:p-6">
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-[11px] bg-brand-soft text-brand"><Sparkles size={17} /></span>
          <div><h3 className="text-[12px] font-bold text-ink">Plain-language summary</h3><p className="mt-2 text-[12px] leading-6 text-ink-soft">{result.summary}</p></div>
        </div>
      </section>

      <section id="breakdown" className="scroll-mt-[132px] pt-12">
        <p className="eyebrow">B · Financial breakdown</p>
        <h2 className="mt-2 text-[20px] font-semibold tracking-[-.025em] text-ink">What contributes to the obligation</h2>
        <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          <BreakdownCard icon={CircleDollarSign} title="Interest" tone="navy" primary={result.general.annualInterestRate !== null ? `${result.general.annualInterestRate}% annual` : "Rate not available"} secondary={`${result.general.interestRateType} rate${result.general.effectiveAnnualRate !== null ? ` · ${result.general.effectiveAnnualRate}% explicitly disclosed effective annual rate` : ""}`} terms={result.terms.filter((term) => term.category === "Interest" || term.category === "Variable Interest Condition")} />
          <BreakdownCard icon={RefreshCw} title="Monthly & recurring fees" tone="brand" primary={money(costs.recurringCharges, costs.currency)} secondary="Modelled total over the extracted term" terms={monthlyTerms} />
          <BreakdownCard icon={FileText} title="One-time charges" tone="amber" primary={money(costs.oneTimeFees, costs.currency)} secondary="Excludes insurance, shown separately" terms={oneTimeTerms} />
          <BreakdownCard icon={ShieldCheck} title="Insurance" tone="violet" primary={money(costs.insuranceCost, costs.currency)} secondary="Modelled over term where recurrence is known" terms={insuranceTerms} />
          <BreakdownCard icon={AlertTriangle} title="Penalties" tone="red" primary={`${penaltyTerms.length} clause${penaltyTerms.length === 1 ? "" : "s"}`} secondary="Conditional and excluded from baseline totals" terms={penaltyTerms} />
          <BreakdownCard icon={BookOpenCheck} title="Other obligations" tone="muted" primary={`${otherTerms.length} clause${otherTerms.length === 1 ? "" : "s"}`} secondary="Transaction, repayment, and ambiguous conditions" terms={otherTerms} />
        </div>
      </section>

      <section id="risks" className="scroll-mt-[132px] pt-12">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end">
          <div>
            <p className="eyebrow">C · Risk analysis</p>
            <h2 className="mt-2 text-[20px] font-semibold tracking-[-.025em] text-ink">Conditions that deserve your attention</h2>
            <p className="mt-2 text-[11px] text-muted">Rule-based review priorities — not allegations of illegal, deceptive, or fraudulent terms.</p>
          </div>
          <div className="no-print flex gap-1.5 overflow-x-auto sm:ml-auto">
            {(["ALL", ...SEVERITY] as const).map((level) => (
              <button key={level} onClick={() => setRiskFilter(level)}
                className={`rounded-full border px-3 py-1.5 text-[9.5px] font-bold transition-all duration-200 ${riskFilter === level ? "border-brand bg-brand text-surface" : "border-line bg-surface text-muted hover:border-brand/60 hover:text-ink"}`}>
                {level === "ALL" ? "All" : level.charAt(0) + level.slice(1).toLowerCase()}
                <span className="ml-1.5 opacity-70">{level === "ALL" ? result.risks.length : result.risks.filter((risk) => risk.level === level).length}</span>
              </button>
            ))}
          </div>
        </div>
        <div className="mt-5 space-y-4">
          {visibleRisks.length === 0 ? <Empty text="No conditions match this severity filter." /> : visibleRisks.map((risk) => (
            <article key={risk.id} className="surface overflow-hidden transition-shadow duration-300 hover:shadow-[var(--shadow-md)]">
              <div className="p-5 sm:p-6">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start">
                  <span className={`risk-${risk.level} inline-flex w-fit shrink-0 items-center rounded-full border px-2.5 py-1 text-[9px] font-extrabold tracking-[.06em]`}>{risk.level}</span>
                  <div className="min-w-0 flex-1">
                    <h3 className="text-[13.5px] font-bold text-ink">{risk.title}</h3>
                    <div className="mt-1 text-[9px] font-bold uppercase tracking-[.07em] text-muted">{risk.category}{risk.page ? ` · Page ${risk.page}` : " · Page unavailable"}</div>
                  </div>
                  {risk.termId && <button onClick={() => inspectTerm(risk.termId)} className="btn-secondary no-print !min-h-8 !px-3 !text-[9.5px]">Inspect evidence <ExternalLink size={11} /></button>}
                </div>
                <blockquote className="mt-4 rounded-r-[10px] border-l-2 border-line-2 bg-surface-2 px-4 py-3 text-[11px] leading-6 text-ink-soft">“{risk.quote}”</blockquote>
                <div className="mt-4 grid gap-5 md:grid-cols-2">
                  <div>
                    <div className="text-[9px] font-bold uppercase tracking-[.07em] text-muted">Why this matters</div>
                    <p className="mt-2 text-[11px] leading-5 text-ink-soft">{risk.whyItMatters}</p>
                  </div>
                  <div className="rounded-[11px] border border-brand/25 bg-brand-soft p-3.5">
                    <div className="flex items-center gap-1.5 text-[9px] font-bold uppercase tracking-[.07em] text-brand-ink"><MessageSquareText size={12} />Ask your provider</div>
                    <p className="mt-2 text-[11px] font-medium leading-5 text-ink-soft">{risk.suggestedQuestion}</p>
                  </div>
                </div>
                <details className="group mt-4 border-t border-line pt-3">
                  <summary className="flex cursor-pointer list-none items-center gap-1.5 text-[9.5px] font-semibold text-muted transition-colors hover:text-ink">
                    <ChevronRight size={12} className="transition-transform duration-200 group-open:rotate-90" />View triggering rule & plain-language extraction
                  </summary>
                  <p className="mt-2.5 text-[10px] leading-5 text-ink-soft"><strong className="text-ink">Rule:</strong> {risk.rule}<br /><strong className="text-ink">Meaning:</strong> {risk.explanation}</p>
                </details>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section id="cost" className="scroll-mt-[132px] pt-12">
        <p className="eyebrow">D · True cost breakdown</p>
        <div className="mt-2 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <h2 className="text-[20px] font-semibold tracking-[-.025em] text-ink">The maths behind the estimate</h2>
          <span className={`chip w-fit !text-[9px] uppercase ${costs.status === "complete" ? "!border-brand/30 !bg-brand-soft !text-brand-ink" : "!border-amber/35 !bg-amber-soft !text-amber-ink"}`}>{costs.status} estimate</span>
        </div>
        <div className="mt-5 grid gap-5 lg:grid-cols-[1.25fr_.75fr]">
          <div className="surface p-5 sm:p-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="text-[9.5px] font-bold uppercase tracking-[.07em] text-muted">Total estimated repayment</div>
                <div className="tabular mt-2 text-[30px] font-semibold tracking-[-.04em] text-ink">{money(costs.totalEstimatedRepayment, costs.currency)}</div>
                <div className="mt-1.5 text-[10px] text-muted">{costs.monthlyPayment !== null ? `${money(costs.monthlyPayment, costs.currency)} modelled monthly principal + interest` : "Monthly instalment not calculable"}</div>
              </div>
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-[11px] bg-brand-soft text-brand"><Calculator size={19} /></span>
            </div>
            {costTotal > 0 ? (
              <>
                <div className="mt-6 flex h-4 overflow-hidden rounded-full bg-surface-3">
                  {costParts.filter((part) => part.value > 0).map((part) => (
                    <span key={part.label} title={`${part.label}: ${money(part.value, costs.currency)}`} className="transition-all duration-700" style={{ width: `${(part.value / costTotal) * 100}%`, background: part.color }} />
                  ))}
                </div>
                <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
                  {costParts.map((part) => (
                    <div key={part.label}>
                      <div className="flex items-center gap-1.5 text-[9px] text-muted"><span className="h-2 w-2 shrink-0 rounded-full" style={{ background: part.color }} />{part.label}</div>
                      <div className="tabular mt-1 text-[11px] font-bold text-ink">{money(part.value, costs.currency)}</div>
                    </div>
                  ))}
                </div>
              </>
            ) : <div className="mt-6"><Empty text="Not enough numeric information to draw a cost composition." /></div>}
            <div className="mt-5 border-t border-line pt-4 text-[9.5px] leading-4 text-muted">
              Known charges are summed only where their basis and duration permit. Conditional penalties and event-based commissions are excluded. A segment at zero may also mean “not calculable”; see missing information.
            </div>
          </div>

          <div className="surface overflow-hidden">
            <div className="border-b border-line p-5">
              <h3 className="text-[12px] font-bold text-ink">Repayment balance</h3>
              <p className="mt-1 text-[9.5px] text-muted">Deterministic amortisation schedule</p>
            </div>
            {costs.schedule.length > 1 ? <BalanceChart schedule={costs.schedule} currency={costs.currency} /> : <div className="p-5"><Empty text="A principal, term, interest rate, and monthly frequency are needed for this schedule." /></div>}
            <div className="border-t border-line p-5">
              <div className="text-[9px] font-bold uppercase tracking-[.07em] text-muted">Estimated cash-flow annualised rate</div>
              <div className="tabular mt-2 text-[19px] font-semibold text-ink">{costs.cashFlowAnnualisedRate !== null ? `${costs.cashFlowAnnualisedRate}%` : "Not calculable"}</div>
              <p className="mt-2 text-[9.5px] leading-4 text-muted">Only calculated from a complete modelled cash flow. This is not an official APR or legally defined effective interest rate.</p>
            </div>
          </div>
        </div>

        <div className="mt-5 grid gap-5 lg:grid-cols-2">
          <div className="surface p-5">
            <div className="flex items-center gap-2"><Calculator size={15} className="text-brand" /><h3 className="text-[12px] font-bold text-ink">Calculation assumptions</h3></div>
            <ul className="mt-4 space-y-3">
              {(showAllAssumptions ? costs.assumptions : costs.assumptions.slice(0, 4)).map((item, index) => (
                <li key={index} className="flex gap-2.5 text-[10px] leading-5 text-ink-soft"><span className="mt-[7px] h-1 w-1 shrink-0 rounded-full bg-brand" />{item}</li>
              ))}
            </ul>
            {costs.assumptions.length > 4 && (
              <button onClick={() => setShowAllAssumptions((value) => !value)} className="btn-ghost mt-3 !min-h-7 !p-0 !text-[9.5px]">
                {showAllAssumptions ? "Show fewer" : `Show all ${costs.assumptions.length}`}<ChevronDown size={12} className={showAllAssumptions ? "rotate-180" : ""} />
              </button>
            )}
          </div>
          <div className="surface p-5">
            <div className="flex items-center gap-2"><FileQuestion size={15} className="text-amber" /><h3 className="text-[12px] font-bold text-ink">Missing or incomplete information</h3></div>
            {result.missingInformation.length ? (
              <ul className="mt-4 space-y-3">{result.missingInformation.map((item, index) => (
                <li key={index} className="flex gap-2.5 text-[10px] leading-5 text-ink-soft"><AlertCircle size={13} className="mt-0.5 shrink-0 text-amber" />{item}</li>
              ))}</ul>
            ) : <p className="mt-4 text-[10px] leading-5 text-brand-ink">No core missing-information flags were raised. This does not guarantee that the document is complete or favourable.</p>}
          </div>
        </div>
      </section>

      <section id="evidence" className="scroll-mt-[132px] pt-12">
        <p className="eyebrow">E · Original document evidence</p>
        <h2 className="mt-2 text-[20px] font-semibold tracking-[-.025em] text-ink">Inspect every extracted term</h2>
        <div className="no-print mt-5 flex flex-col gap-3 rounded-[13px] border border-line bg-surface p-3 sm:flex-row">
          <div className="relative flex-1">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
            <input value={query} onChange={(event) => setQuery(event.target.value)} className="field !py-2.5 !pl-9 !text-[11px]" placeholder="Search quotations, labels, or values…" aria-label="Search evidence" />
          </div>
          <div className="relative">
            <Filter size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
            <select value={category} onChange={(event) => setCategory(event.target.value)} className="field !py-2.5 !pl-9 !pr-8 !text-[10.5px] sm:w-[228px]" aria-label="Filter by category">
              <option value="ALL">All categories ({result.terms.length})</option>
              {CATEGORIES.map((item) => <option key={item} value={item}>{item}</option>)}
            </select>
          </div>
        </div>
        <div className="mt-4 space-y-3">
          {visibleTerms.length === 0 ? <Empty text="No source clauses match these filters." /> : visibleTerms.map((term) => (
            <article id={`evidence-${term.id}`} key={term.id}
              className={`surface scroll-mt-[150px] overflow-hidden transition-all duration-300 ${selectedTerm === term.id ? "border-brand ring-2 ring-brand/15" : "hover:border-line-2"}`}>
              <button onClick={() => setSelectedTerm(selectedTerm === term.id ? null : term.id)} aria-expanded={selectedTerm === term.id}
                className="flex w-full items-start gap-3 p-4 text-left transition-colors hover:bg-surface-2 sm:p-5">
                <span className="mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-[9px] bg-surface-3 text-ink-soft"><FileText size={15} /></span>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="text-[11px] font-bold text-ink">{term.label}</span>
                    <span className="chip !py-0.5 !text-[8px]">{term.category}</span>
                    <span className={`chip !py-0.5 !text-[8px] ${term.evidenceType === "explicit" ? "!border-brand/30 !bg-brand-soft !text-brand-ink" : "!border-amber/35 !bg-amber-soft !text-amber-ink"}`}>{term.evidenceType}</span>
                  </div>
                  <blockquote className="mt-2 line-clamp-2 text-[10px] leading-5 text-muted">{highlighted(term)}</blockquote>
                </div>
                <div className="shrink-0 text-right">
                  <div className="tabular text-[12px] font-bold text-ink">{valueText(term)}</div>
                  <div className="mt-1 text-[8.5px] text-muted">{term.page ? `Page ${term.page}` : "Location n/a"}</div>
                </div>
                <ChevronRight size={15} className={`mt-2 shrink-0 text-muted transition-transform duration-300 ${selectedTerm === term.id ? "rotate-90 text-brand" : ""}`} />
              </button>
              {selectedTerm === term.id && (
                <div className="fade-up grid gap-5 border-t border-line bg-surface-2 p-5 sm:grid-cols-2 lg:grid-cols-4">
                  <EvidenceMeta label="Extracted value" value={valueText(term)} />
                  <EvidenceMeta label="Recurrence" value={term.recurrence} />
                  <EvidenceMeta label="Confidence" value={`${Math.round(term.confidence * 100)}% · model indication, not a fairness probability`} />
                  <EvidenceMeta label="Source location" value={term.page ? `Page ${term.page} · retained clause excerpt` : "Retained clause excerpt"} />
                  <div className="sm:col-span-2 lg:col-span-4">
                    <div className="text-[8.5px] font-bold uppercase tracking-[.07em] text-muted">Plain-language explanation</div>
                    <p className="mt-1.5 text-[10px] leading-5 text-ink-soft">{term.explanation}</p>
                  </div>
                  <blockquote className="rounded-r-[10px] border-l-2 border-amber bg-amber-soft p-3 text-[10px] leading-5 text-ink-soft sm:col-span-2 lg:col-span-4">{highlighted(term)}</blockquote>
                </div>
              )}
            </article>
          ))}
        </div>
      </section>

      <section id="questions" className="scroll-mt-[132px] py-12">
        <p className="eyebrow">F · Recommendations</p>
        <h2 className="mt-2 text-[20px] font-semibold tracking-[-.025em] text-ink">Questions worth asking before you accept</h2>
        <div className="surface mt-5 overflow-hidden">
          {result.recommendations.length ? result.recommendations.map((question, index) => (
            <div key={question} className="flex gap-4 border-b border-line p-5 transition-colors last:border-0 hover:bg-surface-2">
              <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-brand-soft text-[10px] font-bold text-brand-ink">{String(index + 1).padStart(2, "0")}</span>
              <div>
                <p className="text-[12px] font-semibold leading-5 text-ink">{question}</p>
                <p className="mt-1.5 text-[9.5px] text-muted">Request the answer in writing and compare it with the signed agreement.</p>
              </div>
            </div>
          )) : <div className="p-5"><Empty text="No additional provider questions were generated from the detected clauses." /></div>}
        </div>

        <div className="mt-5 flex flex-col gap-4 rounded-[15px] bg-navy p-6 text-white dark:bg-surface-2 dark:text-ink sm:flex-row sm:items-center">
          <div>
            <h3 className="text-[14.5px] font-semibold">Keep this report with the original agreement.</h3>
            <p className="mt-2 text-[10px] leading-5 opacity-80">The PDF includes extracted terms, concerns, estimates, assumptions, and the educational disclaimer.</p>
          </div>
          <a href={`/api/reports/${analysisId}/pdf`} className="btn-brand shrink-0 sm:ml-auto"><Download size={15} />Download PDF <ArrowRight size={14} /></a>
        </div>

        <p className="mt-5 text-[9.5px] leading-5 text-muted">
          FeeShield AI provides educational document intelligence, not financial, legal, or credit advice. Extracted information can be wrong or incomplete. Verify all terms with the provider and the original signed agreement before making a decision.
        </p>
      </section>
    </div>
  );
}

const TONES: Record<string, string> = {
  navy: "bg-navy-soft text-navy", brand: "bg-brand-soft text-brand", amber: "bg-amber-soft text-amber-ink",
  violet: "bg-violet-soft text-violet", red: "bg-red-soft text-red-ink", muted: "bg-surface-3 text-ink-soft",
};

function BreakdownCard({ icon: Icon, title, primary, secondary, terms, tone }: { icon: React.ComponentType<{ size?: number; className?: string }>; title: string; primary: string; secondary: string; terms: FinancialTerm[]; tone: string }) {
  return (
    <div className="surface surface-hover p-5">
      <div className="flex items-start gap-3">
        <span className={`grid h-9 w-9 shrink-0 place-items-center rounded-[10px] ${TONES[tone]}`}><Icon size={17} /></span>
        <div className="min-w-0">
          <h3 className="text-[12px] font-bold text-ink">{title}</h3>
          <div className="tabular mt-1.5 text-[18px] font-semibold tracking-[-.025em] text-ink">{primary}</div>
        </div>
      </div>
      <p className="mt-2 text-[9.5px] leading-4 text-muted">{secondary}</p>
      <div className="mt-4 space-y-2 border-t border-line pt-3">
        {terms.length ? terms.slice(0, 3).map((term) => (
          <div key={term.id} className="flex items-start justify-between gap-3 text-[9.5px]">
            <span className="line-clamp-1 text-muted">{term.label}</span>
            <span className="shrink-0 font-bold text-ink-soft">{valueText(term)}</span>
          </div>
        )) : <p className="text-[9.5px] text-muted">No matching clause extracted.</p>}
        {terms.length > 3 && <a href="#evidence" className="inline-block text-[9.5px] font-bold text-brand hover:underline">+ {terms.length - 3} more in evidence</a>}
      </div>
    </div>
  );
}

function EvidenceMeta({ label, value }: { label: string; value: string }) {
  return <div><div className="text-[8.5px] font-bold uppercase tracking-[.07em] text-muted">{label}</div><p className="mt-1.5 text-[10px] font-medium capitalize leading-5 text-ink-soft">{value}</p></div>;
}
function Empty({ text }: { text: string }) {
  return <div className="rounded-[13px] border border-dashed border-line-2 bg-surface-2 p-6 text-center text-[10px] leading-5 text-muted">{text}</div>;
}
function BalanceChart({ schedule, currency }: { schedule: AnalysisResult["costs"]["schedule"]; currency: string | null }) {
  const width = 400, height = 155, pad = 18;
  const max = Math.max(...schedule.map((item) => item.balance), 1);
  const points = schedule.map((item, index) => `${pad + (index / Math.max(schedule.length - 1, 1)) * (width - pad * 2)},${pad + (1 - item.balance / max) * (height - pad * 2)}`).join(" ");
  const last = schedule[schedule.length - 1];
  return (
    <div className="p-5">
      <svg viewBox={`0 0 ${width} ${height}`} className="w-full" role="img" aria-label="Remaining principal balance declines across the repayment schedule">
        <defs><linearGradient id="balance-fill" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="var(--brand)" stopOpacity=".28" /><stop offset="1" stopColor="var(--brand)" stopOpacity="0" /></linearGradient></defs>
        <line x1={pad} x2={width - pad} y1={height - pad} y2={height - pad} stroke="var(--line-2)" />
        <line x1={pad} x2={width - pad} y1={pad} y2={pad} stroke="var(--line)" />
        <polygon points={`${pad},${height - pad} ${points} ${width - pad},${height - pad}`} fill="url(#balance-fill)" />
        <polyline points={points} fill="none" stroke="var(--brand)" strokeWidth="2.5" vectorEffect="non-scaling-stroke" strokeLinejoin="round" />
      </svg>
      <div className="flex justify-between text-[9px] text-muted">
        <span>Month 1 · {money(schedule[0]?.balance ?? 0, currency)}</span>
        <span>Month {last?.month} · {money(last?.balance ?? 0, currency)}</span>
      </div>
    </div>
  );
}

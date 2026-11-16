"use client";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import {
  ArrowRight, BadgeDollarSign, Banknote, BookOpenCheck, Braces, Calculator, Check, ChevronRight,
  CircleAlert, Eye, FileCheck2, FileText, GitCompareArrows, Landmark, LockKeyhole, ScanLine,
  ShieldCheck, Sparkles, Trash2, Upload, Variable,
} from "lucide-react";
import { Logo } from "@/components/AppShell";
import { ThemeToggle } from "@/components/ThemeProvider";

const FEATURES = [
  { icon: ScanLine, title: "AI Contract Scanner", text: "Page-aware extraction separates principal, rates, fees, penalties, and repayment duties without filling gaps with guesses." },
  { icon: FileCheck2, title: "Hidden Fee Detection", text: "Recurring maintenance, administrative, insurance, transaction, and discretionary charges surface with their original wording." },
  { icon: BadgeDollarSign, title: "Interest Rate Analysis", text: "Distinguish nominal annual, monthly, explicitly disclosed effective, fixed, and variable rates instead of treating them as interchangeable." },
  { icon: BookOpenCheck, title: "Repayment Condition Analysis", text: "Understand grace periods, early settlement, payment holidays, balloon payments, and obligations that can alter your schedule." },
  { icon: Calculator, title: "True Cost Calculator", text: "A deterministic amortisation engine models payments and known costs, shows every assumption, and returns partial estimates when needed." },
  { icon: GitCompareArrows, title: "Contract Comparison", text: "Compare terms side by side with currency, principal, and duration checks—plus limited normalisation only where it is meaningful." },
];
const PROBLEMS = [
  { icon: Banknote, title: "Small charges accumulate", text: "A $9 monthly fee over 48 months adds $432 before interest or other charges. The arithmetic is simple; finding the clause is not." },
  { icon: Variable, title: "Rates can move", text: "A benchmark-linked agreement can make the initial payment a poor guide to later costs, especially when adjustment rules or caps are unclear." },
  { icon: CircleAlert, title: "Penalties sit in exceptions", text: "Late payment, early settlement, and default clauses may not appear in an advertised repayment example but matter when circumstances change." },
  { icon: FileText, title: "Complexity hides omissions", text: "A missing duration, ambiguous calculation basis, or undefined fee is itself important information—not a value for AI to fill in." },
];
const STEPS = [
  { n: "01", title: "Upload your financial document", text: "Digital PDF, TXT, or pasted text. Page boundaries are retained where available." },
  { n: "02", title: "AI identifies terms and risks", text: "Hybrid classification and evidence-bound extraction surface fees, rates, and obligations." },
  { n: "03", title: "Receive a clear financial breakdown", text: "Deterministic calculations, source quotations, assumptions, and practical provider questions." },
];
const TRUST = [
  { icon: LockKeyhole, title: "Controlled ingestion", text: "File signatures, extensions, size, page count, and readable-text thresholds are validated before processing." },
  { icon: Eye, title: "Minimal retention", text: "Pending full text is cleared after analysis. Structured source excerpts remain only to support evidence inspection." },
  { icon: Trash2, title: "User deletion", text: "Documents and their reports can be deleted from history. Workspace queries are restricted to the current private session." },
];

export default function LandingPage() {
  const root = useRef<HTMLDivElement>(null);
  const hero = useRef<HTMLElement>(null);
  const flow = useRef<HTMLElement>(null);
  const [step, setStep] = useState(0);

  useEffect(() => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const observer = new IntersectionObserver((entries) => entries.forEach((entry) => {
      if (entry.isIntersecting) entry.target.classList.add("is-visible");
    }), { threshold: 0.12 });
    document.querySelectorAll(".reveal-block").forEach((node) => observer.observe(node));
    if (reduce) return () => observer.disconnect();

    let ticking = false;
    const update = () => {
      ticking = false;
      if (hero.current && root.current) {
        root.current.style.setProperty("--hero-progress", String(Math.max(0, Math.min(1, window.scrollY / Math.max(hero.current.offsetHeight, 1)))));
      }
      if (flow.current) {
        const rect = flow.current.getBoundingClientRect();
        const progress = Math.max(0, Math.min(1, -rect.top / Math.max(flow.current.offsetHeight - window.innerHeight, 1)));
        setStep(progress < 0.34 ? 0 : progress < 0.7 ? 1 : 2);
      }
    };
    const onScroll = () => { if (!ticking) { ticking = true; requestAnimationFrame(update); } };
    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => { observer.disconnect(); window.removeEventListener("scroll", onScroll); };
  }, []);

  return (
    <div ref={root} className="landing overflow-clip bg-surface text-ink">
      {/* Hero */}
      <section ref={hero} className="relative min-h-[100svh] overflow-hidden text-white" style={{ background: "var(--hero-bg)" }}>
        <div className="hero-grid absolute inset-0" />
        <div className="absolute -right-24 top-20 h-[460px] w-[460px] rounded-full bg-[#0b8f83]/12 blur-[120px]" />
        <div className="absolute left-[10%] top-[72%] h-56 w-56 rounded-full bg-[#2b6d92]/12 blur-[95px]" />

        <header className="relative z-20 mx-auto flex h-[80px] max-w-[1240px] items-center px-5 sm:px-8">
          <Logo dark />
          <nav className="ml-auto hidden items-center gap-7 text-[12px] font-medium text-[#b6c6d3] md:flex">
            {[["#how", "How it works"], ["#features", "Capabilities"], ["#trust", "Privacy"], ["/learn", "Learn"]].map(([href, label]) => (
              <Link key={href} href={href} className="transition-colors hover:text-white">{label}</Link>
            ))}
          </nav>
          <div className="ml-5 flex items-center gap-2.5 sm:ml-7">
            <ThemeToggle className="border-white/15 bg-white/[.07] !text-white" />
            <Link href="/dashboard" className="rounded-[10px] border border-white/18 px-3.5 py-2 text-[11.5px] font-semibold text-white transition-colors hover:bg-white/10">Open workspace</Link>
          </div>
        </header>

        <div className="hero-scene relative z-10 mx-auto grid min-h-[calc(100svh-80px)] max-w-[1240px] items-center gap-12 px-5 pb-16 pt-10 sm:px-8 lg:grid-cols-[1.02fr_.98fr] lg:pb-24 lg:pt-0">
          <div className="max-w-[650px]">
            <div className="hero-enter hero-enter-1 mb-6 inline-flex items-center gap-2 rounded-full border border-white/14 bg-white/[.06] px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[.13em] text-[#a9c5d2]">
              <span className="pulse-dot h-1.5 w-1.5 rounded-full bg-[#5fd8c2]" />Evidence-linked financial intelligence
            </div>
            <h1 className="hero-enter hero-enter-2 text-[clamp(2.7rem,5.3vw,5.1rem)] font-semibold leading-[1.02] tracking-[-.055em]">
              Know What Your Financial Agreement <span className="text-[#6fd9c5]">Really Costs.</span>
            </h1>
            <p className="hero-enter hero-enter-3 mt-7 max-w-[580px] text-[15.5px] leading-7 text-[#b7c8d4] sm:text-[17.5px]">
              FeeShield AI finds hidden charges, explains difficult clauses, and calculates a transparent cost estimate—while keeping every insight linked to the words in your document.
            </p>
            <div className="hero-enter hero-enter-4 mt-9 flex flex-wrap gap-3">
              <Link href="/analyze" className="btn-brand !min-h-12 !px-5 !text-[12.5px]">Analyse a Document <ArrowRight size={16} /></Link>
              <a href="#how" className="inline-flex min-h-12 items-center gap-2 rounded-[11px] border border-white/20 px-5 text-[12.5px] font-semibold text-white transition-colors hover:bg-white/10">Explore How It Works <ChevronRight size={15} /></a>
            </div>
            <div className="hero-enter hero-enter-4 mt-9 flex flex-wrap gap-x-6 gap-y-3 text-[11px] text-[#91a9b9]">
              {["PDF, TXT & pasted text", "No financial value invented", "Delete at any time"].map((item) => (
                <span key={item} className="flex items-center gap-1.5"><Check size={13} className="text-[#6fd9c5]" />{item}</span>
              ))}
            </div>
          </div>

          <div className="hero-enter hero-enter-4 relative mx-auto hidden w-full max-w-[510px] sm:block">
            <div className="absolute -inset-8 rounded-[40px] border border-white/[.04]" />
            <div className="hero-document relative rounded-[20px] border border-white/15 bg-[var(--hero-card)] p-1.5 text-[#172b3a] shadow-[0_35px_90px_rgba(0,0,0,.4)]">
              <div className="flex h-11 items-center rounded-t-[14px] border-b border-[#e3e9ed] bg-white px-4">
                <div className="flex gap-1.5">{[0, 1, 2].map((dot) => <span key={dot} className="h-2 w-2 rounded-full bg-[#d6dfe4]" />)}</div>
                <div className="mx-auto flex items-center gap-2 text-[9px] font-semibold text-[#728492]"><LockKeyhole size={10} />Private analysis workspace</div>
              </div>
              <div className="grid grid-cols-[1.05fr_.95fr] gap-3 p-4">
                <div className="relative overflow-hidden rounded-[12px] border border-[#dfe6ec] bg-white p-4">
                  <div className="scan-line absolute left-0 right-0 top-3 z-10 h-[2px] bg-[#23ae99] shadow-[0_0_15px_#23ae99]" />
                  <div className="flex items-center justify-between"><span className="text-[9px] font-bold">LOAN AGREEMENT</span><FileText size={14} className="text-[#8194a2]" /></div>
                  <div className="mt-4 space-y-2.5">{[86, 95, 66, 91, 74].map((width, index) => <div key={index} className="h-1.5 rounded-full bg-[#e7ecef]" style={{ width: `${width}%` }} />)}</div>
                  <div className="mt-4 rounded-[6px] border-l-2 border-[#d68a23] bg-[#fff6e8] p-2">
                    <div className="text-[7px] font-bold text-[#9c661e]">MONTHLY ACCOUNT FEE</div>
                    <div className="mt-1 text-[11px] font-bold text-[#66491f]">$11.90 <span className="text-[7px] font-medium">per month</span></div>
                  </div>
                  <div className="mt-3 space-y-2.5">{[92, 70, 88].map((width, index) => <div key={index} className="h-1.5 rounded-full bg-[#e7ecef]" style={{ width: `${width}%` }} />)}</div>
                  <div className="mt-3 rounded-[6px] border-l-2 border-[#c43d4b] bg-[#fff0f2] p-2">
                    <div className="text-[7px] font-bold text-[#ad3342]">VARIABLE RATE CONDITION</div>
                    <div className="mt-1 text-[7px] leading-3 text-[#7d5c62]">Provider may adjust the rate after each review.</div>
                  </div>
                </div>
                <div className="space-y-3">
                  <div className="rounded-[12px] border border-[#dfe6ec] bg-white p-3.5">
                    <div className="flex items-center justify-between text-[8px] font-bold text-[#6c7f8e]"><span>COST ABOVE PRINCIPAL</span><Sparkles size={11} className="text-[#0b8f83]" /></div>
                    <div className="mt-2 text-[23px] font-semibold tracking-[-.04em] text-[#0b1f33]">$2,184<span className="text-[11px] text-[#7d8d99]">.60</span></div>
                    <div className="mt-1 text-[7px] text-[#8a98a3]">Illustrative modelled estimate</div>
                    <div className="mt-3 flex h-2 overflow-hidden rounded-full">
                      <span className="w-[48%] bg-[#234c68]" /><span className="w-[24%] bg-[#0b8f83]" /><span className="w-[18%] bg-[#d68a23]" /><span className="w-[10%] bg-[#c43d4b]" />
                    </div>
                  </div>
                  <div className="rounded-[12px] border border-[#dfe6ec] bg-white p-3.5">
                    <div className="text-[8px] font-bold text-[#6c7f8e]">REVIEW PRIORITY</div>
                    <div className="mt-3 space-y-2">
                      {[["#c43d4b", "Variable interest", "HIGH", "#ad3342"], ["#d68a23", "Recurring charges", "REVIEW", "#a06a1c"], ["#0b8f83", "Source evidence", "LINKED", "#0b8f83"]].map(([dot, label, tag, color]) => (
                        <div key={label} className="flex items-center gap-2 text-[8px] font-semibold"><span className="h-1.5 w-1.5 rounded-full" style={{ background: dot }} />{label}<span className="ml-auto" style={{ color }}>{tag}</span></div>
                      ))}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 rounded-[10px] bg-[#eaf5f2] px-3 py-2.5 text-[8px] font-semibold text-[#287065]"><ShieldCheck size={14} />Calculations remain deterministic</div>
                </div>
              </div>
            </div>
            <div className="absolute -bottom-5 -left-5 flex items-center gap-2 rounded-[11px] border border-white/15 bg-[#102c41] px-3.5 py-2.5 text-[10px] font-semibold text-[#d7e4eb] shadow-xl"><Braces size={14} className="text-[#6fd9c5]" />Structured, explainable output</div>
          </div>
        </div>
        <div className="absolute bottom-5 left-1/2 hidden -translate-x-1/2 items-center gap-2 text-[9px] uppercase tracking-[.15em] text-[#6f899a] lg:flex"><span className="h-6 w-px bg-[#4b6577]" />Scroll to inspect the process</div>
      </section>

      {/* Problem */}
      <section className="border-b border-line bg-surface py-20 sm:py-24">
        <div className="reveal-block mx-auto grid max-w-[1160px] gap-12 px-5 sm:px-8 lg:grid-cols-[.9fr_1.1fr] lg:gap-20">
          <div>
            <p className="eyebrow">The transparency gap</p>
            <h2 className="mt-4 text-[clamp(1.95rem,3.5vw,3.3rem)] font-semibold leading-[1.09] tracking-[-.045em] text-ink">The headline rate rarely tells the whole story.</h2>
            <p className="mt-6 text-[14.5px] leading-7 text-ink-soft">Financial agreements distribute costs across schedules, definitions, exceptions, and cross-references. A borrower can understand the monthly instalment and still miss charges that materially change the obligation.</p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            {PROBLEMS.map(({ icon: Icon, title, text }) => (
              <div key={title} className="stagger-child surface surface-hover p-5">
                <span className="grid h-9 w-9 place-items-center rounded-[10px] bg-brand-soft text-brand"><Icon size={17} /></span>
                <h3 className="mt-4 text-[13.5px] font-bold text-ink">{title}</h3>
                <p className="mt-2 text-[11.5px] leading-[1.65] text-muted">{text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section id="how" ref={flow} className="relative h-[240vh] bg-paper">
        <div className="sticky top-0 flex min-h-screen items-center overflow-hidden py-16">
          <div className="mx-auto grid w-full max-w-[1160px] items-center gap-10 px-5 sm:px-8 lg:grid-cols-[.8fr_1.2fr]">
            <div>
              <p className="eyebrow">How it works</p>
              <h2 className="mt-4 text-[clamp(1.95rem,3.5vw,3.3rem)] font-semibold leading-[1.09] tracking-[-.045em] text-ink">From dense wording to a report you can question.</h2>
              <div className="mt-9 space-y-2">
                {STEPS.map((item, index) => (
                  <div key={item.n} className={`rounded-[13px] border p-4 transition-all duration-500 ${step === index ? "border-brand/40 bg-surface shadow-[var(--shadow-md)]" : "border-transparent bg-surface/45 opacity-50"}`}>
                    <div className="flex gap-4">
                      <span className={`text-[11px] font-bold ${step === index ? "text-brand" : "text-muted"}`}>{item.n}</span>
                      <div><h3 className="text-[13px] font-bold text-ink">{item.title}</h3><p className="mt-1.5 text-[11px] leading-5 text-muted">{item.text}</p></div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="flow-scene relative h-[470px]" data-step={step}>
              <div className="absolute inset-0 rounded-[24px] border border-line bg-surface-2" />
              <div className="flow-source absolute left-[9%] top-[10%] w-[47%] rounded-[15px] border border-line bg-surface p-5 shadow-[var(--shadow-lg)]">
                <div className="flex items-center justify-between border-b border-line pb-3"><span className="text-[9.5px] font-bold text-muted">AGREEMENT · PAGE 2</span><FileText size={14} className="text-muted" /></div>
                <div className="mt-5 space-y-3">{[90, 75, 94, 60].map((width, index) => <div key={index} className="h-2 rounded bg-surface-3" style={{ width: `${width}%` }} />)}</div>
                <div className="flow-clause mt-5 rounded-[8px] p-3 text-[10px] leading-5 text-ink-soft">“Account maintenance fee: $11.90 per month for keeping the account open.”</div>
                <div className="mt-4 space-y-3">{[82, 93, 64, 88, 70].map((width, index) => <div key={index} className="h-2 rounded bg-surface-3" style={{ width: `${width}%` }} />)}</div>
              </div>
              <div className="flow-report absolute right-[6%] top-[17%] w-[48%] rounded-[16px] border border-line bg-surface p-5 shadow-[var(--shadow-lg)]">
                <div className="flex items-center gap-2 text-[9.5px] font-bold text-brand"><ShieldCheck size={14} />FEESHIELD REPORT</div>
                <div className="mt-5 text-[8.5px] font-bold uppercase tracking-[.07em] text-muted">Estimated additional cost</div>
                <div className="tabular mt-1 text-[29px] font-semibold tracking-[-.04em] text-ink">$1,084.20</div>
                <div className="text-[8px] text-muted">Illustrative output</div>
                <div className="mt-5 space-y-3">
                  {[["Interest", "58%", "var(--navy)"], ["Recurring fees", "27%", "var(--brand)"], ["One-time charges", "15%", "var(--amber)"]].map(([label, width, color]) => (
                    <div key={label}>
                      <div className="flex justify-between text-[8.5px] font-semibold text-muted"><span>{label}</span><span>{width}</span></div>
                      <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-surface-3"><div className="h-full rounded-full transition-all duration-700" style={{ width: step === 2 ? width : "5%", background: color }} /></div>
                    </div>
                  ))}
                </div>
                <div className="mt-5 flex items-center gap-2 rounded-[9px] bg-amber-soft p-2.5 text-[8.5px] font-semibold text-amber-ink"><CircleAlert size={12} />1 clause needs a provider answer</div>
              </div>
              <div className={`absolute bottom-[6%] left-1/2 flex -translate-x-1/2 items-center gap-2 whitespace-nowrap rounded-full border bg-surface px-4 py-2 text-[9.5px] font-semibold shadow-[var(--shadow-sm)] transition-all duration-500 ${step === 1 ? "border-amber/40 text-amber-ink" : "border-brand/40 text-brand-ink"}`}>
                {step === 0 ? <><Upload size={13} />Source preserved</> : step === 1 ? <><ScanLine size={13} />Classifying financial clauses</> : <><Calculator size={13} />Evidence + deterministic maths</>}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="bg-surface py-20 sm:py-24">
        <div className="reveal-block mx-auto max-w-[1160px] px-5 sm:px-8">
          <div className="max-w-[660px]">
            <p className="eyebrow">Connected capabilities</p>
            <h2 className="mt-4 text-[clamp(1.95rem,3.5vw,3.3rem)] font-semibold leading-[1.09] tracking-[-.045em] text-ink">One document. A complete financial picture.</h2>
            <p className="mt-5 text-[14.5px] leading-7 text-ink-soft">Extraction, classification, risk rules, calculations, and comparison operate as one pipeline—not disconnected dashboard decorations.</p>
          </div>
          <div className="mt-12 grid gap-px overflow-hidden rounded-[20px] border border-line bg-line sm:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map(({ icon: Icon, title, text }) => (
              <div key={title} className="stagger-child bg-surface p-7 transition-colors duration-300 hover:bg-surface-2">
                <span className="grid h-10 w-10 place-items-center rounded-[11px] bg-brand-soft text-brand"><Icon size={19} /></span>
                <h3 className="mt-5 text-[14.5px] font-bold text-ink">{title}</h3>
                <p className="mt-3 text-[11.5px] leading-[1.7] text-muted">{text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Explainability */}
      <section className="border-y border-line bg-paper py-20 sm:py-24">
        <div className="reveal-block mx-auto grid max-w-[1080px] items-center gap-10 px-5 sm:px-8 lg:grid-cols-2">
          <div>
            <p className="eyebrow">Explainable by design</p>
            <h2 className="mt-4 text-[clamp(1.95rem,3vw,2.95rem)] font-semibold leading-[1.1] tracking-[-.04em] text-ink">Never ask “where did that number come from?”</h2>
            <p className="mt-5 text-[13.5px] leading-7 text-ink-soft">Open any extracted term to see its exact quotation, source page, category, confidence, recurrence, and plain-language meaning. Risk levels include the rule that triggered them.</p>
            <ul className="mt-6 space-y-3 text-[12px] font-medium text-ink-soft">
              {["Explicit, inferred, and missing information stay distinct", "Estimates and contractual amounts are labelled separately", "Incomplete inputs produce partial—not fabricated—totals"].map((item) => (
                <li key={item} className="flex items-center gap-2.5"><FileCheck2 size={16} className="shrink-0 text-brand" />{item}</li>
              ))}
            </ul>
          </div>
          <div className="surface p-6 shadow-[var(--shadow-lg)]">
            <div className="flex items-center justify-between gap-3">
              <span className="risk-HIGH rounded-full border px-2.5 py-1 text-[9px] font-extrabold">HIGH · VARIABLE INTEREST</span>
              <span className="text-[10px] text-muted">Page 2</span>
            </div>
            <blockquote className="mt-5 rounded-r-[10px] border-l-2 border-amber bg-amber-soft p-4 text-[12px] leading-6 text-ink-soft">“The provider may adjust the interest rate every six months following a benchmark review.”</blockquote>
            <div className="mt-5 grid grid-cols-2 gap-4 text-[11px]">
              <div><div className="text-[9px] font-bold uppercase tracking-[.07em] text-muted">Why it matters</div><p className="mt-1.5 leading-5 text-ink-soft">Future instalments and total interest can increase.</p></div>
              <div><div className="text-[9px] font-bold uppercase tracking-[.07em] text-muted">Ask your provider</div><p className="mt-1.5 leading-5 text-ink-soft">Which benchmark, margin, and rate cap apply?</p></div>
            </div>
          </div>
        </div>
      </section>

      {/* Trust */}
      <section id="trust" className="py-20 text-white sm:py-24" style={{ background: "var(--hero-bg)" }}>
        <div className="reveal-block mx-auto max-w-[1160px] px-5 sm:px-8">
          <div className="grid gap-10 lg:grid-cols-[.8fr_1.2fr]">
            <div>
              <p className="eyebrow !text-[#6fd9c5]">Trust & transparency</p>
              <h2 className="mt-4 text-[clamp(1.95rem,3.5vw,3.2rem)] font-semibold leading-[1.09] tracking-[-.04em]">Your document is not a demo asset.</h2>
              <p className="mt-5 text-[13.5px] leading-7 text-[#a9bdca]">FeeShield AI is a consumer transparency tool—not a bank, lender, credit scorer, legal adviser, or financial institution.</p>
            </div>
            <div className="grid gap-4 sm:grid-cols-3">
              {TRUST.map(({ icon: Icon, title, text }) => (
                <div key={title} className="rounded-[15px] border border-white/10 bg-white/[.04] p-5 transition-colors duration-300 hover:bg-white/[.07]">
                  <Icon size={20} className="text-[#6fd9c5]" />
                  <h3 className="mt-4 text-[12.5px] font-bold">{title}</h3>
                  <p className="mt-2 text-[10.5px] leading-[1.6] text-[#9db2c0]">{text}</p>
                </div>
              ))}
            </div>
          </div>
          <p className="mt-8 border-t border-white/10 pt-5 text-[10px] leading-5 text-[#8099aa]">Privacy controls described here are implemented product controls, not a claim of complete anonymity or regulatory certification. Configure HTTPS and production secrets in deployment.</p>
        </div>
      </section>

      {/* Final CTA */}
      <section className="bg-surface py-20 sm:py-24">
        <div className="reveal-block mx-auto max-w-[1000px] px-5 text-center sm:px-8">
          <div className="mx-auto grid h-12 w-12 place-items-center rounded-[15px] bg-brand-soft text-brand"><Landmark size={23} /></div>
          <h2 className="mt-6 text-[clamp(2.1rem,4vw,3.7rem)] font-semibold leading-[1.07] tracking-[-.045em] text-ink">Read the agreement.<br />Then read between the lines.</h2>
          <p className="mx-auto mt-5 max-w-[570px] text-[13.5px] leading-7 text-ink-soft">Start with your own document or load one of three clearly labelled synthetic agreements to test the complete upload-to-report workflow.</p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Link href="/analyze" className="btn-primary !min-h-12 !px-6">Analyse your first document <ArrowRight size={16} /></Link>
            <Link href="/learn" className="btn-secondary !min-h-12 !px-6">Build financial literacy</Link>
          </div>
        </div>
      </section>

      <footer className="border-t border-line bg-surface">
        <div className="mx-auto flex max-w-[1160px] flex-col gap-4 px-5 py-7 text-[10px] text-muted sm:flex-row sm:items-center sm:px-8">
          <Logo />
          <span className="sm:ml-4">Educational estimates only. Not financial or legal advice.</span>
          <span className="sm:ml-auto">Engine v1.0 · Evidence before inference</span>
        </div>
      </footer>
    </div>
  );
}

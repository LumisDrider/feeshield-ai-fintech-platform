"use client";
import { useMemo, useState } from "react";
import { Calculator, Info } from "lucide-react";

export default function CostExplorer() {
  const [principal, setPrincipal] = useState(10000);
  const [rate, setRate] = useState(8.5);
  const [months, setMonths] = useState(36);
  const [monthlyFee, setMonthlyFee] = useState(8);
  const [upfront, setUpfront] = useState(150);

  const values = useMemo(() => {
    const monthlyRate = rate / 100 / 12;
    const payment = monthlyRate === 0 ? principal / months : (principal * monthlyRate * (1 + monthlyRate) ** months) / ((1 + monthlyRate) ** months - 1);
    const interest = payment * months - principal;
    const recurring = monthlyFee * months;
    const additional = interest + recurring + upfront;
    return { payment, interest, recurring, additional, total: principal + additional };
  }, [principal, rate, months, monthlyFee, upfront]);

  const format = (value: number) => new Intl.NumberFormat("en", { style: "currency", currency: "USD", maximumFractionDigits: 2 }).format(value);
  const parts = [
    { label: "Principal", value: principal, color: "var(--navy)" },
    { label: "Estimated interest", value: values.interest, color: "var(--brand)" },
    { label: "Recurring fees", value: values.recurring, color: "var(--amber)" },
    { label: "One-time fee", value: upfront, color: "#bd6542" },
  ];

  return (
    <div className="grid overflow-hidden rounded-[18px] border border-line bg-surface lg:grid-cols-[.85fr_1.15fr]">
      <div className="p-5 sm:p-7">
        <div className="flex items-center gap-2"><Calculator size={17} className="text-brand" /><h3 className="text-[13px] font-bold text-ink">Interactive cost explorer</h3></div>
        <p className="mt-2 text-[10.5px] leading-5 text-muted">Change the inputs to see why a low rate can still carry meaningful extra cost.</p>
        <div className="mt-6 space-y-5">
          <Range label="Principal" value={principal} set={setPrincipal} min={1000} max={50000} step={500} display={format(principal)} />
          <Range label="Annual nominal rate" value={rate} set={setRate} min={0} max={30} step={0.25} display={`${rate.toFixed(2)}%`} />
          <Range label="Term" value={months} set={setMonths} min={6} max={84} step={6} display={`${months} months`} />
          <Range label="Monthly fee" value={monthlyFee} set={setMonthlyFee} min={0} max={50} step={1} display={format(monthlyFee)} />
          <Range label="One-time fee" value={upfront} set={setUpfront} min={0} max={1500} step={25} display={format(upfront)} />
        </div>
      </div>

      <div className="border-t border-line bg-surface-2 p-5 sm:p-7 lg:border-l lg:border-t-0">
        <div className="text-[9px] font-bold uppercase tracking-[.08em] text-muted">Estimated total repayment</div>
        <div className="tabular mt-2 text-[34px] font-semibold tracking-[-.045em] text-ink">{format(values.total)}</div>
        <div className="mt-1 text-[10px] text-muted">{format(values.payment)} monthly principal + interest, before the monthly fee</div>

        <div className="mt-6 flex h-4 overflow-hidden rounded-full bg-surface-3">
          {parts.map((part) => <span key={part.label} className="transition-all duration-500" style={{ width: `${(part.value / values.total) * 100}%`, background: part.color }} />)}
        </div>

        <div className="mt-6 grid grid-cols-2 gap-4">
          {parts.map((part) => (
            <div key={part.label}>
              <div className="flex items-center gap-1.5 text-[9.5px] text-muted"><span className="h-2 w-2 shrink-0 rounded-full" style={{ background: part.color }} />{part.label}</div>
              <div className="tabular mt-1.5 text-[13.5px] font-bold text-ink">{format(part.value)}</div>
            </div>
          ))}
        </div>

        <div className="mt-6 rounded-[11px] border border-line bg-surface p-4">
          <div className="flex justify-between text-[10.5px] font-bold text-ink"><span>Total additional cost</span><span className="tabular">{format(values.additional)}</span></div>
          <div className="mt-2 flex justify-between text-[9.5px] text-muted"><span>Share above principal</span><span className="tabular">{((values.additional / principal) * 100).toFixed(1)}%</span></div>
        </div>

        <p className="mt-5 flex gap-2 text-[8.5px] leading-4 text-muted">
          <Info size={12} className="mt-px shrink-0" />Educational fixed-rate amortisation model in USD. It is separate from your saved analyses and is not an official APR calculation.
        </p>
      </div>
    </div>
  );
}

function Range({ label, value, set, min, max, step, display }: { label: string; value: number; set: (value: number) => void; min: number; max: number; step: number; display: string }) {
  return (
    <label className="block">
      <span className="flex items-center justify-between text-[10.5px] font-semibold text-ink-soft">
        <span>{label}</span><output className="tabular text-ink">{display}</output>
      </span>
      <input type="range" min={min} max={max} step={step} value={value} onChange={(event) => set(Number(event.target.value))}
        className="mt-2.5 h-1.5 w-full cursor-pointer appearance-none rounded-full bg-surface-3 accent-[var(--brand)]" />
    </label>
  );
}

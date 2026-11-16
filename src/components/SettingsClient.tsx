"use client";
import { useState } from "react";
import { AlertTriangle, Check, Download, Loader2, Palette, Save, Trash2, X } from "lucide-react";
import { ThemePreferenceControl } from "@/components/ThemeProvider";

export default function SettingsClient({ initialRetention, initialEvidence, documentCount }: { initialRetention: number; initialEvidence: boolean; documentCount: number }) {
  const [retention, setRetention] = useState(initialRetention);
  const [evidence, setEvidence] = useState(initialEvidence);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");
  const [confirming, setConfirming] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleted, setDeleted] = useState<number | null>(null);

  async function save() {
    setSaving(true); setSaved(false); setError("");
    try {
      const response = await fetch("/api/workspace", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ retentionDays: retention, storeEvidence: evidence }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Save failed");
      setSaved(true); setTimeout(() => setSaved(false), 2400);
    } catch (err) { setError(err instanceof Error ? err.message : "Save failed"); }
    finally { setSaving(false); }
  }

  async function deleteAll() {
    setDeleting(true); setError("");
    try {
      const response = await fetch("/api/workspace", { method: "DELETE" });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Delete failed");
      setDeleted(data.deletedDocuments); setConfirming(false);
    } catch (err) { setError(err instanceof Error ? err.message : "Delete failed"); }
    finally { setDeleting(false); }
  }

  return (
    <>
      <section className="surface p-5 sm:p-6">
        <div className="flex items-center gap-2"><Palette size={16} className="text-brand" /><h2 className="text-[13.5px] font-bold text-ink">Appearance</h2></div>
        <p className="mt-2 text-[10.5px] leading-5 text-muted">Choose light, dark, or follow your device setting. The choice is stored in this browser and applied before the page paints, so there is no flash on reload.</p>
        <div className="mt-4"><ThemePreferenceControl /></div>
      </section>

      <section className="surface p-5 sm:p-6">
        <h2 className="text-[13.5px] font-bold text-ink">Data retention</h2>
        <p className="mt-2 text-[10.5px] leading-5 text-muted">Older documents, analyses, and their comparisons are automatically deleted when this workspace is accessed after the retention cutoff.</p>
        <div className="mt-5 max-w-[400px]">
          <label className="label" htmlFor="retention">Keep documents and reports for</label>
          <select id="retention" className="field !text-[11px]" value={retention} onChange={(event) => { setRetention(Number(event.target.value)); setSaved(false); }}>
            <option value={30}>30 days</option><option value={90}>90 days (default)</option><option value={365}>1 year</option><option value={3650}>10 years / manual review</option>
          </select>
        </div>

        <div className="mt-5 flex items-start gap-3 rounded-[12px] border border-line bg-surface-2 p-4">
          <button role="switch" aria-checked={evidence} aria-label="Retain source excerpts in new reports" onClick={() => { setEvidence(!evidence); setSaved(false); }}
            className={`relative mt-0.5 h-[22px] w-[40px] shrink-0 rounded-full transition-colors duration-300 ${evidence ? "bg-brand" : "bg-line-2"}`}>
            <span className={`absolute top-[3px] h-4 w-4 rounded-full bg-surface shadow-[var(--shadow-sm)] transition-all duration-300 ${evidence ? "left-[21px]" : "left-[3px]"}`} />
          </button>
          <div>
            <div className="text-[11px] font-bold text-ink">Retain source excerpts in new reports</div>
            <p className="mt-1 text-[9.5px] leading-5 text-muted">Recommended for explainability. If disabled, new analyses keep structured values and calculations but replace original quotations with a clear retention notice. Existing reports are unchanged.</p>
          </div>
        </div>

        <div className="mt-5 flex flex-wrap items-center gap-3">
          <button onClick={() => void save()} disabled={saving} className="btn-primary">{saving ? <Loader2 size={14} className="spin-slow" /> : saved ? <Check size={14} /> : <Save size={14} />}{saving ? "Saving…" : saved ? "Settings saved" : "Save privacy settings"}</button>
          {saved && <span className="fade-up text-[9.5px] font-semibold text-brand-ink">Preferences applied immediately.</span>}
        </div>
      </section>

      <section className="surface p-5 sm:p-6">
        <h2 className="text-[13.5px] font-bold text-ink">Export & deletion</h2>
        <p className="mt-2 text-[10.5px] leading-5 text-muted">Download your structured workspace data or permanently remove all documents and their dependent reports.</p>
        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          <a href="/api/workspace/export" className="flex items-center gap-3 rounded-[12px] border border-line bg-surface-2 p-4 transition-all duration-250 hover:-translate-y-0.5 hover:border-brand/50">
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-[10px] bg-brand-soft text-brand"><Download size={17} /></span>
            <span className="min-w-0"><span className="block text-[11px] font-bold text-ink">Export workspace JSON</span><span className="mt-1 block text-[8.5px] text-muted">Metadata, terms, risks, calculations & comparisons</span></span>
          </a>
          <button onClick={() => setConfirming(true)} className="flex items-center gap-3 rounded-[12px] border border-red/25 bg-red-soft/50 p-4 text-left transition-all duration-250 hover:-translate-y-0.5 hover:bg-red-soft">
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-[10px] bg-red-soft text-red-ink"><Trash2 size={17} /></span>
            <span className="min-w-0"><span className="block text-[11px] font-bold text-red-ink">Delete all workspace documents</span><span className="mt-1 block text-[8.5px] text-muted">{documentCount} document{documentCount === 1 ? "" : "s"} currently stored</span></span>
          </button>
        </div>
        {deleted !== null && <div className="fade-up mt-4 rounded-[10px] border border-brand/30 bg-brand-soft p-3 text-[10px] text-brand-ink">Deleted {deleted} document{deleted === 1 ? "" : "s"} and all dependent analyses and comparisons.</div>}
      </section>

      {error && <div role="alert" className="fade-up rounded-[11px] border border-red/30 bg-red-soft p-3 text-[10.5px] text-red-ink">{error}</div>}

      {confirming && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-[#04101b]/55 p-4 backdrop-blur-[3px]" role="dialog" aria-modal="true" aria-labelledby="delete-all-title">
          <div className="fade-up w-full max-w-[432px] rounded-[18px] border border-line bg-surface p-6 shadow-[var(--shadow-lg)]">
            <div className="flex items-start">
              <span className="grid h-10 w-10 place-items-center rounded-[11px] bg-red-soft text-red-ink"><AlertTriangle size={19} /></span>
              <button onClick={() => setConfirming(false)} className="btn-ghost ml-auto !min-h-8 !p-2" aria-label="Close dialog"><X size={17} /></button>
            </div>
            <h2 id="delete-all-title" className="mt-4 text-[17px] font-semibold text-ink">Delete all workspace data?</h2>
            <p className="mt-3 text-[11px] leading-6 text-muted">This permanently deletes {documentCount} document{documentCount === 1 ? "" : "s"}, all analyses, source excerpts, and comparisons. Export first if you need a copy. This cannot be undone.</p>
            <div className="mt-6 flex justify-end gap-2">
              <button onClick={() => setConfirming(false)} className="btn-secondary">Cancel</button>
              <button disabled={deleting} onClick={() => void deleteAll()} className="btn-danger">{deleting ? "Deleting…" : "Delete everything"}</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

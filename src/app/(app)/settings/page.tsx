import type { Metadata } from "next";
import { eq } from "drizzle-orm";
import { CheckCircle2, FileLock2, KeyRound, ScanText, Server, ShieldCheck } from "lucide-react";
import { db } from "@/db";
import { documents } from "@/db/schema";
import { getWorkspace } from "@/lib/workspace";
import SettingsClient from "@/components/SettingsClient";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Settings & privacy" };

export default async function SettingsPage() {
  const user = await getWorkspace();
  const docs = await db.select({ id: documents.id }).from(documents).where(eq(documents.userId, user.id));
  const aiConfigured = Boolean(process.env.AI_API_KEY);

  return (
    <div className="mx-auto max-w-[1060px]">
      <header className="fade-up">
        <p className="eyebrow">Settings & privacy</p>
        <h1 className="mt-2 text-[27px] font-semibold tracking-[-.035em] text-ink sm:text-[33px]">Control your document data</h1>
        <p className="mt-2 max-w-[720px] text-[12.5px] leading-6 text-muted">Inspect this workspace’s appearance, processing mode, retention behaviour, and implemented security controls. No compliance certification is implied.</p>
      </header>

      <div className="mt-6 grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_322px]">
        <div className="space-y-5"><SettingsClient initialRetention={user.retentionDays} initialEvidence={user.storeEvidence} documentCount={docs.length} /></div>

        <aside className="space-y-5">
          <section className="surface p-5">
            <div className="flex items-center gap-2"><KeyRound size={16} className="text-brand" /><h2 className="text-[12px] font-bold text-ink">Private workspace session</h2></div>
            <p className="mt-3 break-all rounded-[9px] bg-surface-2 p-2.5 font-mono text-[9px] leading-4 text-ink-soft">{user.id}</p>
            <p className="mt-3 text-[9.5px] leading-5 text-muted">A random HTTP-only, SameSite workspace cookie identifies ownership. All document, report, comparison, and export queries are scoped to this ID. For a public multi-user deployment, add verified account authentication and CSRF controls.</p>
          </section>

          <section className="surface p-5">
            <h2 className="text-[12px] font-bold text-ink">Processing availability</h2>
            <div className="mt-4 space-y-4">
              <Status icon={Server} title="Rule-based extraction" value="Operational" ok />
              <Status icon={CheckCircle2} title="AI provider" value={aiConfigured ? "Configured" : "Not configured · fallback active"} ok={aiConfigured} />
              <Status icon={ScanText} title="Scanned PDF & image OCR" value={aiConfigured ? "Operational · AI Vision + local Tesseract" : "Operational · local Tesseract OCR"} ok />
              <Status icon={FileLock2} title="Digital PDF & DOCX extraction" value="Operational · PDF, Word, TXT, RTF" ok />
            </div>
            {!aiConfigured && <p className="mt-4 rounded-[10px] border border-amber/30 bg-amber-soft p-3 text-[8.5px] leading-4 text-amber-ink">Set AI_API_KEY on the backend to enable optional evidence-validated AI-assisted extraction. AI_BASE_URL and AI_MODEL select the provider.</p>}
          </section>

          <section className="rounded-[16px] border border-brand/25 bg-brand-soft p-5">
            <ShieldCheck size={18} className="text-brand" />
            <h2 className="mt-3 text-[12px] font-bold text-brand-ink">Implemented safeguards</h2>
            <ul className="mt-3 space-y-2 text-[9.5px] leading-5 text-ink-soft">
              <li>• 8 MB, extension, PDF signature, and page checks</li>
              <li>• Filename sanitisation and no user-controlled storage paths</li>
              <li>• Pending text removed after analysis</li>
              <li>• Ownership checks and AI endpoint rate limiting</li>
              <li>• No document contents written to application logs</li>
              <li>• Secrets remain server-side</li>
            </ul>
          </section>

          <p className="text-[8.5px] leading-4 text-muted">Production deployment still requires HTTPS, managed secrets, database backups, monitoring, and an authentication design appropriate to the threat model. These controls are not a claim of complete privacy or regulatory compliance.</p>
        </aside>
      </div>
    </div>
  );
}

function Status({ icon: Icon, title, value, ok }: { icon: React.ComponentType<{ size?: number; className?: string }>; title: string; value: string; ok: boolean }) {
  return (
    <div className="flex gap-2.5">
      <Icon size={14} className={`mt-0.5 shrink-0 ${ok ? "text-brand" : "text-amber"}`} />
      <div className="min-w-0">
        <div className="text-[9.5px] font-semibold text-ink-soft">{title}</div>
        <div className={`mt-1 text-[8.5px] ${ok ? "text-brand-ink" : "text-amber-ink"}`}>{value}</div>
      </div>
    </div>
  );
}

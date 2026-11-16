import Link from "next/link";
import { ArrowLeft, FileQuestion, RefreshCw } from "lucide-react";

export default function NotFound() {
  return (
    <main className="grid min-h-screen place-items-center bg-paper p-5">
      <div className="surface fade-up w-full max-w-[520px] p-8 text-center">
        <span className="mx-auto grid h-12 w-12 place-items-center rounded-[14px] bg-surface-2 text-muted"><FileQuestion size={26} /></span>
        <h1 className="mt-4 text-[21px] font-semibold text-ink">This report is not available</h1>
        <p className="mt-3 text-[11.5px] leading-6 text-muted">
          Reports are scoped to a private workspace session, so this link may belong to a different browser session — or the document may have been deleted by you or by your retention setting.
          <br /><br />
          Nothing is lost: simply re-run the analysis from the workspace and a fresh report will be generated.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <Link href="/analyze" className="btn-primary"><RefreshCw size={15} />Analyse a document</Link>
          <Link href="/dashboard" className="btn-secondary"><ArrowLeft size={15} />Dashboard</Link>
        </div>
      </div>
    </main>
  );
}

"use client";
import Link from "next/link";
import { AlertCircle, ArrowLeft, RefreshCw } from "lucide-react";

export default function WorkspaceError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="mx-auto mt-14 max-w-[520px]">
      <div className="surface fade-up p-8 text-center">
        <span className="mx-auto grid h-12 w-12 place-items-center rounded-[14px] bg-red-soft text-red-ink"><AlertCircle size={24} /></span>
        <h1 className="mt-4 text-[19px] font-semibold text-ink">This workspace view could not load</h1>
        <p className="mt-3 text-[11px] leading-6 text-muted">Your saved documents have not been changed. Check the database connection and try again, or return to the dashboard.</p>
        <div className="mt-6 flex justify-center gap-2">
          <button onClick={reset} className="btn-primary"><RefreshCw size={15} />Try again</button>
          <Link href="/dashboard" className="btn-secondary"><ArrowLeft size={15} />Dashboard</Link>
        </div>
      </div>
    </div>
  );
}

import type { Metadata } from "next";
import Link from "next/link";
import { desc, eq } from "drizzle-orm";
import { Upload } from "lucide-react";
import { db } from "@/db";
import { analyses, documents } from "@/db/schema";
import { getWorkspace } from "@/lib/workspace";
import HistoryClient from "@/components/HistoryClient";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Analysis history" };

export default async function HistoryPage() {
  const user = await getWorkspace();
  const rows = await db.select({ analysis: analyses, document: documents }).from(analyses)
    .innerJoin(documents, eq(analyses.documentId, documents.id))
    .where(eq(documents.userId, user.id)).orderBy(desc(analyses.createdAt));
  const entries = rows.map(({ analysis, document }) => ({
    analysisId: analysis.id, documentId: document.id, filename: document.filename,
    fileType: document.fileType, createdAt: analysis.createdAt.toISOString(), result: analysis.fullResult,
  }));

  return (
    <div className="mx-auto max-w-[1280px]">
      <header className="fade-up flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <p className="eyebrow">Saved workspace records</p>
          <h1 className="mt-2 text-[27px] font-semibold tracking-[-.035em] text-ink sm:text-[33px]">Analysis history</h1>
          <p className="mt-2 text-[12.5px] text-muted">{entries.length} saved report{entries.length === 1 ? "" : "s"} in this private browser workspace.</p>
        </div>
        <Link href="/analyze" className="btn-primary w-fit"><Upload size={15} />New analysis</Link>
      </header>
      <div className="mt-6"><HistoryClient initialEntries={entries} /></div>
    </div>
  );
}

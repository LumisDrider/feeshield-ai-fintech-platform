import type { Metadata } from "next";
import { desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { analyses, documents } from "@/db/schema";
import { getWorkspace } from "@/lib/workspace";
import ComparisonClient from "@/components/ComparisonClient";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Contract comparison" };

export default async function ComparePage({ searchParams }: { searchParams: Promise<{ a?: string; b?: string }> }) {
  const user = await getWorkspace();
  const query = await searchParams;
  const rows = await db.select({ analysis: analyses, document: documents }).from(analyses)
    .innerJoin(documents, eq(analyses.documentId, documents.id))
    .where(eq(documents.userId, user.id)).orderBy(desc(analyses.createdAt));
  const options = rows.map(({ analysis, document }) => ({
    analysisId: analysis.id, filename: document.filename,
    createdAt: analysis.createdAt.toISOString(), result: analysis.fullResult,
  }));

  return (
    <div className="mx-auto max-w-[1280px]">
      <header className="fade-up">
        <p className="eyebrow">Assumption-aware contract analysis</p>
        <h1 className="mt-2 text-[27px] font-semibold tracking-[-.035em] text-ink sm:text-[33px]">Compare two agreements</h1>
        <p className="mt-2 max-w-[760px] text-[12.5px] leading-6 text-muted">Compare extracted terms and modelled cost without hiding mismatched currencies, principal amounts, repayment periods, or missing information.</p>
      </header>
      <ComparisonClient options={options} initialA={query.a} initialB={query.b} />
    </div>
  );
}

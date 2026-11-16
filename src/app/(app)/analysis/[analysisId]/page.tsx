import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { analyses, documents } from "@/db/schema";
import { getWorkspace, getWorkspaceById } from "@/lib/workspace";
import ResultsView from "@/components/ResultsView";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Analysis report" };

async function findReport(analysisId: string, workspaceId: string) {
  const [row] = await db.select({ analysis: analyses, document: documents }).from(analyses)
    .innerJoin(documents, eq(analyses.documentId, documents.id))
    .where(and(eq(analyses.id, analysisId), eq(documents.userId, workspaceId))).limit(1);
  return row ?? null;
}

export default async function AnalysisPage({
  params,
  searchParams,
}: {
  params: Promise<{ analysisId: string }>;
  searchParams: Promise<{ w?: string }>;
}) {
  const { analysisId } = await params;
  const { w } = await searchParams;

  const user = await getWorkspace(w);
  let row = await findReport(analysisId, user.id);

  // The proxy always provides a session identity, so a deep link carrying an
  // explicit workspace id (`?w=`) is retried explicitly. This keeps a finished
  // report reachable when cookies are unavailable, rather than showing it as
  // missing/deleted.
  if (!row && w) {
    const fallbackUser = await getWorkspaceById(w);
    row = await findReport(analysisId, fallbackUser.id);
  }

  if (!row) notFound();
  return <ResultsView result={row.analysis.fullResult} analysisId={row.analysis.id} filename={row.document.filename} createdAt={row.analysis.createdAt.toISOString()} />;
}

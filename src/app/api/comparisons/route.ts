import { and, eq, inArray } from "drizzle-orm";
import { db } from "@/db";
import { analyses, comparisons, documents } from "@/db/schema";
import { runEngine } from "@/lib/engine";
import type { AnalysisResult, ComparisonResult } from "@/lib/types";
import { getWorkspace, jsonError } from "@/lib/workspace";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const user = await getWorkspace();
    const body = await request.json() as { analysisAId?: string; analysisBId?: string };
    if (!body.analysisAId || !body.analysisBId || body.analysisAId === body.analysisBId) return jsonError("Choose two different analysed contracts.");
    const rows = await db.select({ analysis: analyses, document: documents }).from(analyses).innerJoin(documents, eq(analyses.documentId, documents.id)).where(and(inArray(analyses.id, [body.analysisAId, body.analysisBId]), eq(documents.userId, user.id)));
    if (rows.length !== 2) return jsonError("Both analyses must exist in this workspace.", 404);
    const rowA = rows.find((row) => row.analysis.id === body.analysisAId)!;
    const rowB = rows.find((row) => row.analysis.id === body.analysisBId)!;
    const result = await runEngine<ComparisonResult>("compare", { a: rowA.analysis.fullResult as AnalysisResult, b: rowB.analysis.fullResult as AnalysisResult, filenameA: rowA.document.filename, filenameB: rowB.document.filename, idA: rowA.analysis.id, idB: rowB.analysis.id });
    const [saved] = await db.insert(comparisons).values({ userId: user.id, documentAId: rowA.document.id, documentBId: rowB.document.id, comparisonResults: result }).returning();
    return Response.json({ comparisonId: saved.id, result }, { status: 201 });
  } catch (error) { return jsonError(error instanceof Error ? error.message : "Comparison failed.", 500); }
}

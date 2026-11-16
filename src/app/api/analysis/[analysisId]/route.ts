import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { analyses, documents } from "@/db/schema";
import { getWorkspace, jsonError } from "@/lib/workspace";

export async function GET(_request: Request, { params }: { params: Promise<{ analysisId: string }> }) {
  try {
    const { analysisId } = await params;
    const user = await getWorkspace();
    const [row] = await db.select({ analysis: analyses, document: documents }).from(analyses)
      .innerJoin(documents, eq(analyses.documentId, documents.id))
      .where(and(eq(analyses.id, analysisId), eq(documents.userId, user.id))).limit(1);
    if (!row) return jsonError("Analysis not found in this workspace.", 404);
    return Response.json({ ...row.analysis, createdAt: row.analysis.createdAt.toISOString(), document: { ...row.document, pendingText: undefined, uploadTimestamp: row.document.uploadTimestamp.toISOString() } });
  } catch {
    return jsonError("Could not load this analysis.", 500);
  }
}

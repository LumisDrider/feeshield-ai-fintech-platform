import { desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { analyses, comparisons, documents, users } from "@/db/schema";
import { getWorkspace, jsonError } from "@/lib/workspace";

export async function GET() {
  try {
    const user = await getWorkspace();
    const docs = await db.select().from(documents).where(eq(documents.userId, user.id)).orderBy(desc(documents.uploadTimestamp));
    const analysisRows = await db.select({ analysis: analyses }).from(analyses).innerJoin(documents, eq(analyses.documentId, documents.id)).where(eq(documents.userId, user.id));
    const comparisonRows = await db.select().from(comparisons).where(eq(comparisons.userId, user.id));
    const payload = { exportedAt: new Date().toISOString(), product: "FeeShield AI", workspace: { id: user.id, createdAt: user.createdAt, retentionDays: user.retentionDays, storeEvidence: user.storeEvidence }, documents: docs.map(({ pendingText: _pendingText, ...document }) => document), analyses: analysisRows.map((row) => row.analysis), comparisons: comparisonRows, note: "Pending full source text is never included in exports. Saved reports contain structured terms and, where enabled, source excerpts." };
    return new Response(JSON.stringify(payload, null, 2), { headers: { "Content-Type": "application/json", "Content-Disposition": `attachment; filename="feeshield-workspace-${new Date().toISOString().slice(0, 10)}.json"`, "Cache-Control": "private, no-store" } });
  } catch { return jsonError("Workspace export failed.", 500); }
}

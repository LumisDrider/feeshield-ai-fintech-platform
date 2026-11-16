import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { analyses, documents } from "@/db/schema";
import { createAnalysisPdf } from "@/lib/pdf-report";
import { getWorkspace, getWorkspaceById, jsonError } from "@/lib/workspace";

export const runtime = "nodejs";

export async function GET(request: Request, { params }: { params: Promise<{ analysisId: string }> }) {
  try {
    const { analysisId } = await params;
    const explicitWorkspace = new URL(request.url).searchParams.get("w") ?? undefined;
    const user = await getWorkspace(explicitWorkspace);

    const find = async (workspaceId: string) => {
      const [row] = await db.select({ analysis: analyses, document: documents }).from(analyses)
        .innerJoin(documents, eq(analyses.documentId, documents.id))
        .where(and(eq(analyses.id, analysisId), eq(documents.userId, workspaceId))).limit(1);
      return row ?? null;
    };

    let row = await find(user.id);
    // Retry with the explicit workspace id from the link when the session
    // identity does not own this report (e.g. cookies unavailable).
    if (!row && explicitWorkspace && explicitWorkspace !== user.id) {
      row = await find((await getWorkspaceById(explicitWorkspace)).id);
    }
    if (!row) return jsonError("Report not found in this workspace.", 404);

    const bytes = await createAnalysisPdf(row.analysis.fullResult, row.document.filename, row.analysis.createdAt.toISOString());
    return new Response(Buffer.from(bytes), { headers: { "Content-Type": "application/pdf", "Content-Disposition": `attachment; filename="FeeShield-${analysisId.slice(0, 8)}.pdf"`, "Cache-Control": "private, no-store" } });
  } catch (error) { console.error("PDF generation failed", error instanceof Error ? error.message : "unknown"); return jsonError("PDF report generation failed.", 500); }
}

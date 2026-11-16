import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { analyses, documents } from "@/db/schema";
import { runEngine } from "@/lib/engine";
import { deriveAgreementTitle, MAX_FILE_BYTES, MAX_TEXT_CHARS } from "@/lib/file-extractor";
import type { AnalysisResult } from "@/lib/types";
import { getWorkspace, jsonError } from "@/lib/workspace";

export const runtime = "nodejs";
const attempts = new Map<string, number[]>();

function allowed(userId: string) {
  const now = Date.now();
  const recent = (attempts.get(userId) ?? []).filter((time) => now - time < 10 * 60 * 1000);
  if (recent.length >= 12) return false;
  recent.push(now);
  attempts.set(userId, recent);
  return true;
}

export async function POST(request: Request) {
  let documentId = "";
  let userId = "";
  try {
    const body = await request.json() as {
      documentId?: string;
      editedText?: string;
      rawText?: string;
      title?: string;
    };
    const user = await getWorkspace();
    userId = user.id;
    if (!allowed(user.id)) return jsonError("Analysis rate limit reached. Please wait before starting another report.", 429);

    let sourceText = "";
    let isRawTextMode = false;

    if (typeof body.rawText === "string") {
      // Direct raw agreement text analysis — zero file upload needed.
      isRawTextMode = true;
      const trimmed = body.rawText.trim();
      if (trimmed.length < 40) return jsonError("Paste or type at least 40 characters of agreement text.", 422);
      const byteSize = new TextEncoder().encode(body.rawText).length;
      if (byteSize > MAX_FILE_BYTES) return jsonError("Agreement text exceeds the 8 MB limit.", 413);
      sourceText = body.rawText.slice(0, MAX_TEXT_CHARS);
      const title = deriveAgreementTitle(sourceText, body.title);
      const [created] = await db.insert(documents).values({
        userId: user.id,
        filename: title,
        fileType: "raw",
        fileSize: byteSize,
        processingStatus: "processing",
        pageCount: 1,
        extractionMethod: "Raw agreement text",
        pendingText: null,
      }).returning();
      documentId = created.id;
    } else {
      documentId = body.documentId ?? "";
      if (!/^[0-9a-f-]{36}$/i.test(documentId)) return jsonError("Provide either raw agreement text or a valid documentId.");
      const [document] = await db.select().from(documents).where(and(eq(documents.id, documentId), eq(documents.userId, user.id))).limit(1);
      if (!document) return jsonError("Document not found in this workspace.", 404);
      const candidate = typeof body.editedText === "string" && body.editedText.trim().length >= 40
        ? body.editedText.slice(0, MAX_TEXT_CHARS)
        : document.pendingText;
      if (!candidate || candidate.trim().length < 40) {
        return jsonError("Source text is no longer available. Upload the file again to re-analyse it.", 409);
      }
      sourceText = candidate;
      await db.update(documents).set({ processingStatus: "processing", errorMessage: null }).where(eq(documents.id, documentId));
    }

    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      start(controller) {
        const send = (payload: unknown) => controller.enqueue(encoder.encode(JSON.stringify(payload) + "\n"));
        if (isRawTextMode) {
          send({ type: "stage", stage: "preparing", message: "Agreement text validated — ready for clause scanning" });
        }
        send({ type: "stage", stage: "identifying", message: "Starting the isolated analysis engine" });
        runEngine<AnalysisResult>("analyze", { text: sourceText }, (event) => {
          if (event.type === "stage") send(event);
        }).then(async (engineResult) => {
          const result: AnalysisResult = user.storeEvidence ? engineResult : {
            ...engineResult,
            terms: engineResult.terms.map((term) => ({ ...term, quote: "[Source excerpt not retained: disabled in privacy settings]" })),
            risks: engineResult.risks.map((risk) => ({ ...risk, quote: "[Source excerpt not retained: disabled in privacy settings]" })),
            modeNotice: engineResult.modeNotice + " Source excerpt retention was disabled for this report.",
          };
          const [analysis] = await db.insert(analyses).values({
            documentId, contractType: result.general.contractType, extractedTerms: result.terms,
            analysisSummary: result.summary, riskResults: result.risks, calculationResults: result.costs, fullResult: result,
          }).returning();
          await db.update(documents).set({ processingStatus: "completed", pendingText: null, errorMessage: null }).where(eq(documents.id, documentId));
          send({ type: "result", analysisId: analysis.id, documentId, workspaceId: user.id, result });
        }).catch(async (error) => {
          // Keep pendingText on failure so the user can retry without re-uploading.
          await db.update(documents).set({ processingStatus: "failed", errorMessage: "Analysis could not be completed" }).where(eq(documents.id, documentId));
          send({ type: "error", error: error instanceof Error ? error.message : "Analysis failed." });
        }).finally(() => controller.close());
      },
    });
    return new Response(stream, { headers: { "Content-Type": "application/x-ndjson; charset=utf-8", "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("Analysis setup failed:", error instanceof Error ? error.message : "unknown", { documentId: documentId.slice(0, 8), userId: userId.slice(0, 8) });
    return jsonError("Analysis could not be started.", 500);
  }
}

import { db } from "@/db";
import { documents } from "@/db/schema";
import {
  cleanFilename,
  deriveAgreementTitle,
  extractTextFromUploadedFile,
  FileExtractionError,
  MAX_FILE_BYTES,
  MAX_TEXT_CHARS,
} from "@/lib/file-extractor";
import { getWorkspace, jsonError } from "@/lib/workspace";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const user = await getWorkspace();
    const contentType = request.headers.get("content-type") ?? "";
    let filename = "Raw agreement text";
    let fileType = "raw";
    let size = 0;
    let text = "";
    let pageCount = 1;
    let extractionMethod = "Raw agreement text";
    let ocrUsed = false;
    let aiUsed = false;

    if (contentType.includes("application/json")) {
      const body = await request.json() as { text?: string; title?: string };
      if (typeof body.text !== "string") return jsonError("Provide agreement text to analyse.", 400);
      text = body.text.slice(0, MAX_TEXT_CHARS);
      size = new TextEncoder().encode(text).length;
      if (size > MAX_FILE_BYTES) return jsonError("Agreement text exceeds the 8 MB limit.", 413);
      if (text.trim().length < 40) return jsonError("Paste at least 40 characters of agreement text for analysis.", 422);
      filename = deriveAgreementTitle(text, body.title);
    } else {
      const form = await request.formData();
      const fileValue = form.get("file");
      const pasted = form.get("text");

      if (fileValue instanceof File && fileValue.size > 0) {
        filename = cleanFilename(fileValue.name);
        size = fileValue.size;
        const extracted = await extractTextFromUploadedFile(fileValue);
        text = extracted.text;
        fileType = extracted.fileType;
        pageCount = extracted.pageCount;
        extractionMethod = extracted.extractionMethod;
        ocrUsed = extracted.ocrUsed;
        aiUsed = extracted.aiUsed;
      } else if (typeof pasted === "string") {
        text = pasted.slice(0, MAX_TEXT_CHARS);
        size = new TextEncoder().encode(text).length;
        if (size > MAX_FILE_BYTES) return jsonError("Agreement text exceeds the 8 MB limit.", 413);
        if (text.trim().length < 40) return jsonError("Paste at least 40 characters of agreement text for analysis.", 422);
        const rawTitle = typeof form.get("filename") === "string" ? String(form.get("filename")).trim() : "";
        filename = rawTitle ? cleanFilename(rawTitle) : deriveAgreementTitle(text);
        fileType = "raw";
        extractionMethod = "Raw agreement text";
      } else {
        return jsonError("Upload a supported file or provide agreement text.", 400);
      }
    }

    const [document] = await db.insert(documents).values({
      userId: user.id,
      filename,
      fileType,
      fileSize: size,
      processingStatus: "uploaded",
      pageCount,
      extractionMethod,
      pendingText: text,
    }).returning();

    const wordCount = text.trim() ? text.trim().split(/\s+/).length : 0;
    return Response.json({
      workspaceId: user.id,
      document: { ...document, pendingText: undefined, uploadTimestamp: document.uploadTimestamp.toISOString() },
      preview: text.slice(0, 12000),
      extractedText: text,
      pageCount,
      extractionMethod,
      ocrUsed,
      aiUsed,
      wordCount,
      charCount: text.length,
      textTruncated: text.length >= MAX_TEXT_CHARS,
    }, { status: 201 });
  } catch (error) {
    if (error instanceof FileExtractionError) return jsonError(error.message, error.status);
    console.error("Upload failed:", error instanceof Error ? error.message : "unknown error");
    return jsonError("The file could not be processed. Please try again or paste the agreement text directly.", 500);
  }
}

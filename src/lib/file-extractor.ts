import { deflateSync } from "node:zlib";

export const MAX_FILE_BYTES = 8 * 1024 * 1024;
export const MAX_TEXT_CHARS = 180_000;
export const MAX_PDF_PAGES = 80;
const MAX_OCR_PDF_PAGES = 12;

export const SUPPORTED_EXTENSIONS = new Set(["pdf", "docx", "txt", "md", "rtf", "csv", "png", "jpg", "jpeg", "webp"]);
const IMAGE_MIME: Record<string, string> = {
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  webp: "image/webp",
};

export interface ExtractedFileResult {
  text: string;
  fileType: string;
  pageCount: number;
  extractionMethod: string;
  ocrUsed: boolean;
  aiUsed: boolean;
}

export class FileExtractionError extends Error {
  status: number;
  constructor(message: string, status = 422) {
    super(message);
    this.status = status;
  }
}

export function cleanFilename(value: string) {
  return value.replace(/\\/g, "/").split("/").pop()?.replace(/[^a-zA-Z0-9._() -]/g, "_").slice(0, 160) || "document";
}

/** Derive a clean, human-readable title from raw agreement text without forcing a .txt filename. */
export function deriveAgreementTitle(text: string, provided?: string | null): string {
  const manual = provided?.trim();
  if (manual) return manual.slice(0, 140);
  const lines = text
    .split(/\r?\n/)
    .map((line) => line.replace(/\s+/g, " ").trim())
    .filter((line) => line.length >= 4 && !/^synthetic demonstration document/i.test(line));
  const heading = lines.find((line) => line.length <= 90 && !/^this\b/i.test(line)) ?? lines[0];
  if (heading) return heading.replace(/[:\-–—\s]+$/, "").slice(0, 90);
  return "Raw agreement text";
}

function decodeTextBuffer(bytes: Uint8Array): string {
  if (bytes.length >= 2 && bytes[0] === 0xff && bytes[1] === 0xfe) {
    return new TextDecoder("utf-16le", { fatal: false }).decode(bytes.subarray(2));
  }
  if (bytes.length >= 2 && bytes[0] === 0xfe && bytes[1] === 0xff) {
    return new TextDecoder("utf-16be", { fatal: false }).decode(bytes.subarray(2));
  }
  return new TextDecoder("utf-8", { fatal: false }).decode(bytes).replace(/^\uFEFF/, "");
}

function stripRtf(source: string): string {
  return source
    .replace(/\{\\\*[^{}]*\}/g, " ")
    .replace(/\{\\(?:fonttbl|colortbl|stylesheet|info|pict|header|footer)[^{}]*\}/gi, " ")
    .replace(/\\par[d]?/gi, "\n")
    .replace(/\\line\b/gi, "\n")
    .replace(/\\tab\b/gi, " ")
    .replace(/\\'([0-9a-f]{2})/gi, (_, hex: string) => String.fromCharCode(parseInt(hex, 16)))
    .replace(/\\[a-z]+-?\d* ?/gi, "")
    .replace(/[{}]/g, "")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function validateImageSignature(bytes: Uint8Array, extension: string): boolean {
  if (bytes.length < 12) return false;
  if (extension === "png") return bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47;
  if (extension === "jpg" || extension === "jpeg") return bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
  if (extension === "webp") {
    return bytes[0] === 0x52 && bytes[1] === 0x49 && bytes[2] === 0x46 && bytes[3] === 0x46 &&
      bytes[8] === 0x57 && bytes[9] === 0x45 && bytes[10] === 0x42 && bytes[11] === 0x50;
  }
  return false;
}

/* ---- Minimal pure-Node PNG encoder for raw pixel buffers from scanned PDFs ---- */
const CRC_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let i = 0; i < 256; i++) {
    let c = i;
    for (let k = 0; k < 8; k++) c = (c & 1) ? (0xedb88320 ^ (c >>> 1)) : (c >>> 1);
    table[i] = c >>> 0;
  }
  return table;
})();

function crc32(buffer: Buffer): number {
  let crc = 0xffffffff;
  for (let i = 0; i < buffer.length; i++) crc = CRC_TABLE[(crc ^ buffer[i]) & 0xff] ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
}

function pngChunk(type: string, data: Buffer): Buffer {
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length, 0);
  const typeBuf = Buffer.from(type, "ascii");
  const crcBuf = Buffer.alloc(4);
  crcBuf.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])), 0);
  return Buffer.concat([length, typeBuf, data, crcBuf]);
}

function rawPixelsToPng(data: Uint8ClampedArray, width: number, height: number, channels: 1 | 3 | 4): Buffer {
  const colorType = channels === 1 ? 0 : channels === 3 ? 2 : 6;
  const rowBytes = width * channels;
  const scanlines = Buffer.alloc((rowBytes + 1) * height);
  for (let y = 0; y < height; y++) {
    const outOffset = y * (rowBytes + 1);
    scanlines[outOffset] = 0; // filter: None
    const inOffset = y * rowBytes;
    for (let x = 0; x < rowBytes; x++) scanlines[outOffset + 1 + x] = data[inOffset + x] ?? 0;
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = colorType;
  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    pngChunk("IHDR", ihdr),
    pngChunk("IDAT", deflateSync(scanlines, { level: 3 })),
    pngChunk("IEND", Buffer.alloc(0)),
  ]);
}

async function extractTextWithAiVision(imageBuffers: Array<{ buffer: Buffer; mime: string }>): Promise<string | null> {
  const apiKey = process.env.AI_API_KEY;
  if (!apiKey || imageBuffers.length === 0) return null;
  const baseUrl = (process.env.AI_BASE_URL || "https://api.openai.com/v1").replace(/\/$/, "");
  const model = process.env.AI_VISION_MODEL || process.env.AI_MODEL || "gpt-4o-mini";
  const timeoutMs = Number(process.env.AI_TIMEOUT_SECONDS || "25") * 1000;
  try {
    const content: Array<Record<string, unknown>> = [
      {
        type: "text",
        text: "Transcribe every word, number, percentage, currency symbol, and financial clause visible in these financial agreement image(s) verbatim. Preserve paragraph breaks. Do not summarize, interpret, or invent missing text.",
      },
      ...imageBuffers.slice(0, 4).map((item) => ({
        type: "image_url",
        image_url: { url: `data:${item.mime};base64,${item.buffer.toString("base64")}` },
      })),
    ];
    const response = await fetch(`${baseUrl}/chat/completions`, {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      signal: AbortSignal.timeout(timeoutMs),
      body: JSON.stringify({ model, temperature: 0, messages: [{ role: "user", content }] }),
    });
    if (!response.ok) return null;
    const payload = await response.json() as { choices?: Array<{ message?: { content?: string } }> };
    const text = payload.choices?.[0]?.message?.content?.trim();
    return text && text.length >= 20 ? text : null;
  } catch {
    return null;
  }
}

async function runLocalOcr(buffers: Buffer[]): Promise<string> {
  const { createWorker } = await import("tesseract.js");
  const worker = await createWorker("eng", 1, { cachePath: "/tmp/tessdata" });
  try {
    const pages: string[] = [];
    for (const buffer of buffers) {
      const { data } = await worker.recognize(buffer);
      if (data.text?.trim()) pages.push(data.text.trim());
    }
    return pages.join("\f");
  } finally {
    await worker.terminate();
  }
}

async function extractPdfText(bytes: Uint8Array): Promise<ExtractedFileResult> {
  if (new TextDecoder().decode(bytes.slice(0, 5)) !== "%PDF-") {
    throw new FileExtractionError("The PDF header is invalid or the file is corrupted.", 422);
  }
  const { extractImages, extractText, extractTextItems, getDocumentProxy } = await import("unpdf");
  let pdf: Awaited<ReturnType<typeof getDocumentProxy>>;
  try {
    pdf = await getDocumentProxy(bytes, { maxImageSize: 16_777_216 });
  } catch {
    throw new FileExtractionError("The PDF could not be opened. It may be corrupted or password protected.", 422);
  }
  if (pdf.numPages > MAX_PDF_PAGES) {
    throw new FileExtractionError(`PDFs are limited to ${MAX_PDF_PAGES} pages in this workspace.`, 413);
  }
  const pageCount = pdf.numPages;

  // Pass 1: standard digital text extraction preserving pages.
  let text = "";
  try {
    const extracted = await extractText(pdf, { mergePages: false });
    text = Array.isArray(extracted.text) ? extracted.text.join("\f") : String(extracted.text ?? "");
  } catch {
    text = "";
  }

  // Pass 2: positioned text item recovery if pass 1 came up short.
  if (text.trim().length < 40) {
    try {
      const positioned = await extractTextItems(pdf);
      const recoveredPages = positioned.items.map((items) =>
        items.map((item) => item.str + (item.hasEOL ? "\n" : " ")).join("").replace(/[ \t]+\n/g, "\n").trim(),
      );
      const recovered = recoveredPages.join("\f");
      if (recovered.trim().length > text.trim().length) text = recovered;
    } catch {
      // Fall through to scanned-PDF OCR pass.
    }
  }

  if (text.trim().length >= 40) {
    return { text: text.slice(0, MAX_TEXT_CHARS), fileType: "pdf", pageCount, extractionMethod: "PDF digital text", ocrUsed: false, aiUsed: false };
  }

  // Pass 3: scanned PDF — extract embedded page images and run AI vision (if configured) or Tesseract OCR.
  const pagePngs: Buffer[] = [];
  const scanLimit = Math.min(pageCount, MAX_OCR_PDF_PAGES);
  for (let page = 1; page <= scanLimit; page++) {
    try {
      const images = await extractImages(pdf, page);
      // Pick the largest readable embedded image per scanned page.
      const sorted = images
        .filter((img) => img.width >= 32 && img.height >= 32 && img.data?.length)
        .sort((a, b) => b.width * b.height - a.width * a.height);
      if (sorted[0]) {
        const img = sorted[0];
        const channels: 1 | 3 | 4 = img.channels === 1 ? 1 : img.channels === 3 ? 3 : 4;
        pagePngs.push(rawPixelsToPng(img.data, img.width, img.height, channels));
      }
    } catch {
      // Skip unreadable page image and continue scanning remaining pages.
    }
  }

  if (pagePngs.length > 0) {
    const aiText = await extractTextWithAiVision(pagePngs.map((buffer) => ({ buffer, mime: "image/png" })));
    if (aiText && aiText.trim().length >= 40) {
      return { text: aiText.slice(0, MAX_TEXT_CHARS), fileType: "pdf", pageCount, extractionMethod: "Scanned PDF · AI Vision", ocrUsed: true, aiUsed: true };
    }
    try {
      const ocrText = await runLocalOcr(pagePngs);
      if (ocrText.trim().length >= 40) {
        return { text: ocrText.slice(0, MAX_TEXT_CHARS), fileType: "pdf", pageCount, extractionMethod: "Scanned PDF · OCR", ocrUsed: true, aiUsed: false };
      }
    } catch {
      // Handled below with clear message.
    }
  }

  throw new FileExtractionError(
    "No sufficient readable text could be extracted from this PDF. If it is a low-resolution scan, try a clearer file or switch to Raw agreement text.",
    422,
  );
}

export async function extractTextFromUploadedFile(file: File): Promise<ExtractedFileResult> {
  if (file.size <= 0) throw new FileExtractionError("The uploaded file is empty.", 422);
  if (file.size > MAX_FILE_BYTES) throw new FileExtractionError("This file is larger than the 8 MB limit.", 413);

  const safeName = cleanFilename(file.name);
  const extension = safeName.toLowerCase().includes(".") ? safeName.toLowerCase().split(".").pop() ?? "" : "";
  if (!SUPPORTED_EXTENSIONS.has(extension)) {
    throw new FileExtractionError("Unsupported file type. Upload a PDF, Word (.docx), TXT, MD, RTF, or contract image (PNG/JPG/WEBP).", 415);
  }

  const bytes = new Uint8Array(await file.arrayBuffer());

  if (extension === "pdf") {
    return extractPdfText(bytes);
  }

  if (extension === "docx") {
    if (bytes.length < 4 || bytes[0] !== 0x50 || bytes[1] !== 0x4b) {
      throw new FileExtractionError("The Word (.docx) file appears corrupted or is not a valid .docx archive.", 422);
    }
    try {
      const mammoth = await import("mammoth");
      const { value } = await mammoth.extractRawText({ buffer: Buffer.from(bytes) });
      const text = value.trim().slice(0, MAX_TEXT_CHARS);
      if (text.length < 40) throw new FileExtractionError("The Word document does not contain enough readable text to analyse.", 422);
      return { text, fileType: "docx", pageCount: 1, extractionMethod: "Word (.docx) text", ocrUsed: false, aiUsed: false };
    } catch (err) {
      if (err instanceof FileExtractionError) throw err;
      throw new FileExtractionError("The Word (.docx) document could not be read. Try re-saving it or pasting the agreement text.", 422);
    }
  }

  if (extension in IMAGE_MIME) {
    if (!validateImageSignature(bytes, extension)) {
      throw new FileExtractionError("The image header is invalid or the file is corrupted.", 422);
    }
    const buffer = Buffer.from(bytes);
    const aiText = await extractTextWithAiVision([{ buffer, mime: IMAGE_MIME[extension] }]);
    if (aiText && aiText.trim().length >= 40) {
      return { text: aiText.slice(0, MAX_TEXT_CHARS), fileType: extension, pageCount: 1, extractionMethod: "Image · AI Vision", ocrUsed: true, aiUsed: true };
    }
    try {
      const ocrText = await runLocalOcr([buffer]);
      if (ocrText.trim().length >= 40) {
        return { text: ocrText.slice(0, MAX_TEXT_CHARS), fileType: extension, pageCount: 1, extractionMethod: "Image · OCR", ocrUsed: true, aiUsed: false };
      }
    } catch {
      // Handled below.
    }
    throw new FileExtractionError("Not enough readable agreement text was detected in this image. Try a sharper crop or paste the agreement text.", 422);
  }

  // Plain text formats: txt, md, csv, rtf
  let text = decodeTextBuffer(bytes);
  let method = "Plain text";
  if (extension === "rtf") {
    text = stripRtf(text);
    method = "RTF text";
  } else if (extension === "md") {
    method = "Markdown text";
  }
  text = text.slice(0, MAX_TEXT_CHARS);
  if (text.trim().length < 40) {
    throw new FileExtractionError("The file has insufficient readable text for analysis (at least 40 characters required).", 422);
  }
  return { text, fileType: extension, pageCount: 1, extractionMethod: method, ocrUsed: false, aiUsed: false };
}

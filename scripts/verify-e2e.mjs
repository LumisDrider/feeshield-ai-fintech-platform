import fs from "node:fs/promises";
import assert from "node:assert/strict";
import { PDFDocument, StandardFonts } from "pdf-lib";

const base = process.env.BASE_URL || "http://127.0.0.1:3000";
const demos = JSON.parse(await fs.readFile(new URL("../src/data/demo-contracts.json", import.meta.url), "utf8"));
let cookie = "";

async function request(path, options = {}) {
  const response = await fetch(base + path, { ...options, headers: { ...(cookie ? { cookie } : {}), ...(options.headers || {}) } });
  const setCookie = response.headers.get("set-cookie");
  if (setCookie) cookie = setCookie.split(";")[0];
  return response;
}

function assertMonotonicStages(events, order) {
  const seen = events.filter((event) => event.type === "stage").map((event) => order.indexOf(event.stage));
  assert(seen.length >= 4, `expected at least 4 stages, saw ${seen.length}`);
  assert(seen.every((value) => value >= 0), "unknown stage emitted");
  assert(seen.every((value, index) => index === 0 || value >= seen[index - 1]), `stages went backwards: ${seen.join(",")}`);
}

async function createSamplePdf(text) {
  const pdf = await PDFDocument.create();
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const page = pdf.addPage([595, 842]);
  let y = 790;
  for (const line of text.split("\n")) {
    if (y < 60) break;
    page.drawText(line.slice(0, 92), { x: 42, y, size: 10, font });
    y -= 16;
  }
  return Buffer.from(await pdf.save());
}

/** Build an image-only "scanned" PDF: rasterize a text PDF's pages and embed them. */
async function createScannedPdf(text) {
  const { getDocumentProxy, renderPageAsImage } = await import("unpdf");
  const textBytes = await createSamplePdf(text);
  const proxy = await getDocumentProxy(new Uint8Array(textBytes));
  const pageCount = proxy.numPages;
  const scan = await PDFDocument.create();
  for (let pageNumber = 1; pageNumber <= pageCount; pageNumber++) {
    const png = await renderPageAsImage(proxy, pageNumber, { canvasImport: () => import("@napi-rs/canvas"), scale: 2 });
    const image = await scan.embedPng(Buffer.from(png));
    const page = scan.addPage([595, 842]);
    page.drawImage(image, { x: 0, y: 0, width: 595, height: 842 });
  }
  return Buffer.from(await scan.save());
}

const health = await request("/api/health");
assert.equal(health.status, 200);

// 1. Digital PDF file upload -> text extraction -> one-shot analysis -> PDF report
const pdfBytes = await createSamplePdf(demos[0].text);
const form = new FormData();
form.append("file", new Blob([pdfBytes], { type: "application/pdf" }), "clearpath-loan.pdf");
const upload = await request("/api/documents/upload", { method: "POST", body: form });
const uploaded = await upload.json();
assert.equal(upload.status, 201, uploaded.error);
assert.equal(uploaded.document.fileType, "pdf");
assert(uploaded.extractedText.includes("12,000"), "PDF text extraction missed principal");
assert(uploaded.wordCount > 50, "PDF extraction wordCount too small");

const fileAnalyze = await request("/api/documents/analyze", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ documentId: uploaded.document.id }),
});
assert.equal(fileAnalyze.status, 200);
const fileEvents = (await fileAnalyze.text()).trim().split("\n").map(JSON.parse);
assertMonotonicStages(fileEvents, ["uploading", "extracting", "identifying", "classifying", "calculating", "finalising"]);
const first = fileEvents.find((event) => event.type === "result");
assert(first, "No saved analysis result for uploaded PDF");
assert.equal(first.result.general.principal, 12000);
assert.equal(first.result.general.durationMonths, 36);
assert(first.result.costs.monthlyPayment > 0);

const fetched = await request(`/api/analysis/${first.analysisId}`);
assert.equal(fetched.status, 200);
const pdfReport = await request(`/api/reports/${first.analysisId}/pdf`);
assert.equal(pdfReport.status, 200);
assert.equal(Buffer.from(await pdfReport.arrayBuffer()).subarray(0, 4).toString(), "%PDF");
// The full report page must render (usable result), not just the API.
const reportPage = await request(`/analysis/${first.analysisId}`);
assert.equal(reportPage.status, 200, `report page status ${reportPage.status}`);
assert((await reportPage.text()).includes("Executive summary"), "report page missing summary section");

// 2. Direct Raw Agreement Text analysis (NO upload endpoint, NO .txt filename)
const rawAnalyze = await request("/api/documents/analyze", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ rawText: demos[2].text }),
});
assert.equal(rawAnalyze.status, 200);
const rawEvents = (await rawAnalyze.text()).trim().split("\n").map(JSON.parse);
assertMonotonicStages(rawEvents, ["preparing", "identifying", "classifying", "calculating", "finalising"]);
const second = rawEvents.find((event) => event.type === "result");
assert(second, "No saved analysis result for raw agreement text");
assert.equal(second.result.general.interestRateType, "variable");
assert.equal(second.result.costs.schedule.length, 0, "Balloon loan must not use standard schedule");

const secondMetaRes = await request(`/api/analysis/${second.analysisId}`);
const secondMeta = await secondMetaRes.json();
assert.equal(secondMeta.document.fileType, "raw");
assert(!secondMeta.document.filename.endsWith(".txt"), `Expected raw title without .txt, got ${secondMeta.document.filename}`);

// 3. Scanned (image-only) PDF upload -> OCR extraction -> analysis
const scanBytes = await createScannedPdf(demos[1].text);
assert(scanBytes.length > 1000);
const scanForm = new FormData();
scanForm.append("file", new Blob([scanBytes], { type: "application/pdf" }), "scanned-harbourstone.pdf");
const scanUpload = await request("/api/documents/upload", { method: "POST", body: scanForm });
const scanData = await scanUpload.json();
assert.equal(scanUpload.status, 201, scanData.error);
assert(scanData.ocrUsed === true, `expected OCR to run, got method=${scanData.extractionMethod}`);
assert(/harbourstone/i.test(scanData.extractedText ?? ""), "OCR text missing institution name");
assert(scanData.extractedText.includes("8,500") || scanData.extractedText.includes("8500"), "OCR text missing principal");

const scanAnalyze = await request("/api/documents/analyze", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ documentId: scanData.document.id }),
});
assert.equal(scanAnalyze.status, 200);
const scanEvents = (await scanAnalyze.text()).trim().split("\n").map(JSON.parse);
const scanResult = scanEvents.find((event) => event.type === "result");
assert(scanResult, "No analysis result for scanned PDF");
assert(scanResult.result.terms.length >= 3, "OCR analysis found too few clauses");

// 4. Comparison between the uploaded PDF analysis and raw agreement text analysis
const comparison = await request("/api/comparisons", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ analysisAId: first.analysisId, analysisBId: second.analysisId }),
});
const compared = await comparison.json();
assert.equal(comparison.status, 201, compared.error);
assert(compared.result.metrics.length >= 10);

// 5. REGRESSION: cookie-blocked browser must still reach its own documents.
//    Reproduces the reported bug — upload succeeds, then analyse 404s with
//    "Document not found in this workspace" because a new workspace was minted.
const dropForm = new FormData();
dropForm.append("file", new Blob([pdfBytes], { type: "application/pdf" }), "cookieless-loan.pdf");
// Deliberately send no cookies at all (simulates a dropped Secure cookie on HTTP).
const dropUpload = await fetch(`${base}/api/documents/upload`, { method: "POST", body: dropForm });
const dropData = await dropUpload.json();
assert.equal(dropUpload.status, 201, dropData.error);
assert(typeof dropData.workspaceId === "string" && dropData.workspaceId.length === 36, "upload must return workspaceId for session continuity");

// Analyse with the remembered workspace id but still no cookie — must succeed.
const dropAnalyze = await fetch(`${base}/api/documents/analyze`, {
  method: "POST",
  headers: { "Content-Type": "application/json", "x-feeshield-workspace": dropData.workspaceId },
  body: JSON.stringify({ documentId: dropData.document.id }),
});
assert.equal(dropAnalyze.status, 200, `cookie-blocked analyse failed: ${dropAnalyze.status}`);
const dropEvents = (await dropAnalyze.text()).trim().split("\n").map(JSON.parse);
const dropResult = dropEvents.find((event) => event.type === "result");
assert(dropResult, "cookie-blocked analysis produced no report");

// The finished report must stay reachable without cookies via the ?w= fallback
// (previously this rendered "report not found", looking like an auto-deleted report).
const dropReportPage = await fetch(`${base}/analysis/${dropResult.analysisId}?w=${dropData.workspaceId}`);
assert.equal(dropReportPage.status, 200, `report page unreachable without cookies: ${dropReportPage.status}`);
assert((await dropReportPage.text()).includes("Executive summary"), "cookie-blocked report page missing summary");
const dropPdf = await fetch(`${base}/api/reports/${dropResult.analysisId}/pdf?w=${dropData.workspaceId}`);
assert.equal(dropPdf.status, 200, `report PDF unreachable without cookies: ${dropPdf.status}`);
assert.equal(Buffer.from(await dropPdf.arrayBuffer()).subarray(0, 4).toString(), "%PDF");
await fetch(`${base}/api/documents/${dropData.document.id}?w=${dropData.workspaceId}`, { method: "DELETE" });

// 6. Cleanup test records
await request(`/api/documents/${uploaded.document.id}`, { method: "DELETE" });
await request(`/api/documents/${secondMeta.document.id}`, { method: "DELETE" });
await request(`/api/documents/${scanData.document.id}`, { method: "DELETE" });

console.log(JSON.stringify({
  ok: true,
  pdfUploadExtracted: { method: uploaded.extractionMethod, words: uploaded.wordCount, principal: first.result.general.principal, monthlyPayment: first.result.costs.monthlyPayment },
  scannedPdfOcr: { method: scanData.extractionMethod, ocrUsed: scanData.ocrUsed, words: scanData.wordCount, clauses: scanResult.result.terms.length },
  rawTextDirect: { title: secondMeta.document.filename, fileType: secondMeta.document.fileType, rateType: second.result.general.interestRateType, costStatus: second.result.costs.status },
  reportPageVerified: true,
  cookieBlockedSessionRecovered: true,
  comparisonMetrics: compared.result.metrics.length,
  pdfReportVerified: true,
  cleanup: true,
}, null, 2));

import { PDFDocument, PDFFont, PDFPage, StandardFonts, rgb } from "pdf-lib";
import type { AnalysisResult } from "@/lib/types";

function clean(value: unknown) {
  return String(value ?? "Not available").replace(/[“”]/g, '"').replace(/[‘’]/g, "'").replace(/[–—]/g, "-").replace(/€/g, "EUR ").replace(/£/g, "GBP ").replace(/₺/g, "TRY ").replace(/₹/g, "INR ").replace(/[^\x20-\x7E\n]/g, "");
}
function money(value: number | null | undefined, currency: string | null) { return value === null || value === undefined ? "Not available" : `${value.toFixed(2)} ${currency || "currency not stated"}`; }

class ReportWriter {
  pdf!: PDFDocument; page!: PDFPage; regular!: PDFFont; bold!: PDFFont; y = 0; pageNumber = 0;
  async init() { this.pdf = await PDFDocument.create(); this.regular = await this.pdf.embedFont(StandardFonts.Helvetica); this.bold = await this.pdf.embedFont(StandardFonts.HelveticaBold); this.addPage(); }
  addPage() { this.page = this.pdf.addPage([595.28, 841.89]); this.pageNumber++; this.y = 790; this.page.drawRectangle({ x: 0, y: 810, width: 595.28, height: 32, color: rgb(.043, .122, .2) }); this.text("FEESHIELD AI  /  FINANCIAL AGREEMENT INTELLIGENCE", 42, 821, 8, true, rgb(1,1,1)); }
  ensure(height: number) { if (this.y - height < 48) this.addPage(); }
  text(text: string, x: number, y: number, size = 10, bold = false, color = rgb(.09,.17,.23)) { this.page.drawText(clean(text), { x, y, size, font: bold ? this.bold : this.regular, color }); }
  wrap(text: string, size = 10, indent = 0, bold = false, color = rgb(.3,.4,.47), width = 511) {
    const font = bold ? this.bold : this.regular; const words = clean(text).split(/\s+/); const lines: string[] = []; let line = "";
    for (const word of words) { const next = line ? line + " " + word : word; if (font.widthOfTextAtSize(next, size) > width - indent && line) { lines.push(line); line = word; } else line = next; }
    if (line) lines.push(line);
    this.ensure(lines.length * (size + 4) + 3);
    for (const item of lines) { this.text(item, 42 + indent, this.y, size, bold, color); this.y -= size + 4; }
  }
  heading(text: string) { this.ensure(45); this.y -= 12; this.text(text.toUpperCase(), 42, this.y, 9, true, rgb(.03,.45,.41)); this.y -= 20; }
  gap(amount = 10) { this.y -= amount; }
  async finish() {
    const pages = this.pdf.getPages(); pages.forEach((page, index) => page.drawText(`Educational estimate - not financial or legal advice  |  Page ${index + 1} of ${pages.length}`, { x: 42, y: 24, size: 7, font: this.regular, color: rgb(.45,.52,.57) }));
    return this.pdf.save();
  }
}

export async function createAnalysisPdf(result: AnalysisResult, filename: string, createdAt: string) {
  const w = new ReportWriter(); await w.init();
  w.text("Financial Agreement Analysis", 42, w.y, 24, true); w.y -= 30;
  w.wrap(filename, 11, 0, true); w.wrap(`Generated ${new Date(createdAt).toLocaleString("en")}  |  Engine ${result.engineVersion}  |  ${result.analysisMode}`, 8);
  w.gap(8); w.wrap(result.summary, 11);
  w.heading("Document summary");
  const summary = [["Contract type", result.general.contractType], ["Institution", result.general.institution || "Not identified"], ["Principal", money(result.general.principal, result.general.currency)], ["Annual nominal interest", result.general.annualInterestRate === null ? "Not available" : `${result.general.annualInterestRate}% (${result.general.interestRateType})`], ["Duration", result.general.durationMonths ? `${result.general.durationMonths} months` : "Not available"], ["Repayment frequency", result.general.repaymentFrequency || "Not available"]];
  for (const [label, value] of summary) { w.ensure(18); w.text(label, 42, w.y, 9, true); w.wrap(value, 9, 185); w.y -= 3; }
  w.heading("Estimated costs"); w.wrap("These are modelled estimates, not a lender quotation. Conditional penalties and transaction charges are excluded from baseline totals.", 9);
  for (const [label, value] of [["Principal", money(result.costs.principal, result.costs.currency)], ["Monthly principal + interest", money(result.costs.monthlyPayment, result.costs.currency)], ["Estimated interest", money(result.costs.estimatedInterest, result.costs.currency)], ["Recurring charges", money(result.costs.recurringCharges, result.costs.currency)], ["One-time fees", money(result.costs.oneTimeFees, result.costs.currency)], ["Insurance", money(result.costs.insuranceCost, result.costs.currency)], ["Additional cost above principal", money(result.costs.additionalCost, result.costs.currency)], ["Total estimated repayment", money(result.costs.totalEstimatedRepayment, result.costs.currency)]]) { w.ensure(17); w.text(label, 42, w.y, 9); w.text(value, 340, w.y, 9, true); w.y -= 17; }
  w.heading("Potential cost concerns");
  const concerns = result.risks.filter((r) => r.level !== "LOW");
  if (!concerns.length) w.wrap("No moderate, high, or critical conditions were raised by the documented rules.", 9);
  for (const risk of concerns) { w.ensure(105); w.wrap(`${risk.level} - ${risk.title} (${risk.category}${risk.page ? `, page ${risk.page}` : ""})`, 10, 0, true, rgb(.55,.18,.15)); w.wrap(`Source: "${risk.quote}"`, 8); w.wrap(`Why it matters: ${risk.whyItMatters}`, 9); w.wrap(`Ask: ${risk.suggestedQuestion}`, 9); w.wrap(`Rule: ${risk.rule}`, 7); w.gap(8); }
  w.heading("Extracted financial terms");
  for (const term of result.terms) { w.ensure(80); w.wrap(`${term.label} | ${term.category} | ${term.displayValue} | ${term.recurrence}`, 9, 0, true); w.wrap(`"${term.quote}"${term.page ? ` (Page ${term.page})` : ""}`, 8); w.wrap(`${term.explanation} Evidence: ${term.evidenceType}; confidence: ${Math.round(term.confidence * 100)}%.`, 8); w.gap(6); }
  w.heading("Calculation assumptions"); result.costs.assumptions.forEach((a) => w.wrap(`- ${a}`, 8));
  if (result.missingInformation.length) { w.heading("Missing or incomplete information"); result.missingInformation.forEach((m) => w.wrap(`- ${m}`, 8)); }
  if (result.recommendations.length) { w.heading("Questions for the provider"); result.recommendations.forEach((q) => w.wrap(`- ${q}`, 9)); }
  w.heading("Analysis mode & disclaimer"); w.wrap(result.modeNotice, 8); w.wrap("FeeShield AI is an educational consumer transparency tool, not a bank, lender, credit-scoring service, legal adviser, or financial institution. Extracted values may be wrong or incomplete. No fee is labelled illegal, deceptive, fraudulent, or unlawful. Verify all terms against the original signed agreement and with the provider before making a decision.", 8);
  return w.finish();
}

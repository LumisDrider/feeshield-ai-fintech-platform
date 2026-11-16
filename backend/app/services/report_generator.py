"""Professional standalone FastAPI PDF report using ReportLab."""
from __future__ import annotations
import io
from typing import Any, Dict


def generate_pdf_report(result: Dict[str, Any], filename: str) -> bytes:
    try:
        from reportlab.lib import colors
        from reportlab.lib.enums import TA_LEFT
        from reportlab.lib.pagesizes import A4
        from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
        from reportlab.lib.units import mm
        from reportlab.platypus import PageBreak, Paragraph, SimpleDocTemplate, Spacer, Table, TableStyle
    except ImportError as exc:
        raise RuntimeError("PDF generation requires reportlab from backend/requirements.txt") from exc
    buffer = io.BytesIO(); doc = SimpleDocTemplate(buffer, pagesize=A4, rightMargin=18*mm, leftMargin=18*mm, topMargin=20*mm, bottomMargin=18*mm, title=f"FeeShield AI - {filename}")
    styles = getSampleStyleSheet(); navy = colors.HexColor("#0b1f33"); teal = colors.HexColor("#0b8f83"); muted = colors.HexColor("#627386")
    styles.add(ParagraphStyle(name="Small", parent=styles["BodyText"], fontSize=8, leading=12, textColor=muted, alignment=TA_LEFT))
    styles.add(ParagraphStyle(name="Section", parent=styles["Heading2"], fontSize=11, leading=15, textColor=teal, spaceBefore=12, spaceAfter=6))
    story = [Paragraph("Financial Agreement Analysis", styles["Title"]), Paragraph(filename, styles["Heading3"]), Paragraph(result["summary"], styles["BodyText"]), Spacer(1, 8*mm)]
    def money(value): return "Not available" if value is None else f"{value:,.2f} {result['costs'].get('currency') or ''}"
    story.append(Paragraph("ESTIMATED COSTS", styles["Section"]))
    rows = [["Component", "Amount"]] + [[label, money(result["costs"].get(key))] for label, key in [("Principal","principal"),("Estimated interest","estimatedInterest"),("Recurring charges","recurringCharges"),("One-time fees","oneTimeFees"),("Insurance","insuranceCost"),("Additional cost","additionalCost"),("Total estimated repayment","totalEstimatedRepayment")]]
    table = Table(rows, colWidths=[85*mm, 75*mm]); table.setStyle(TableStyle([("BACKGROUND",(0,0),(-1,0),navy),("TEXTCOLOR",(0,0),(-1,0),colors.white),("FONTNAME",(0,0),(-1,0),"Helvetica-Bold"),("FONTSIZE",(0,0),(-1,-1),8),("GRID",(0,0),(-1,-1),.3,colors.HexColor("#dfe6ec")),("ROWBACKGROUNDS",(0,1),(-1,-1),[colors.white,colors.HexColor("#f5f7f9")]),("PADDING",(0,0),(-1,-1),6)])); story.append(table)
    story.append(Paragraph("POTENTIAL COST CONCERNS", styles["Section"]))
    concerns = [risk for risk in result["risks"] if risk["level"] != "LOW"]
    if not concerns: story.append(Paragraph("No moderate, high, or critical conditions were raised by the documented rules.", styles["Small"]))
    for risk in concerns:
        story.append(Paragraph(f"{risk['level']} - {risk['title']}", styles["Heading4"])); story.append(Paragraph(f"Source: {risk['quote']}", styles["Small"])); story.append(Paragraph(risk["whyItMatters"], styles["Small"])); story.append(Paragraph(f"Ask: {risk['suggestedQuestion']}", styles["Small"])); story.append(Spacer(1, 3*mm))
    story.append(Paragraph("EXTRACTED FINANCIAL TERMS", styles["Section"]))
    for term in result["terms"]:
        story.append(Paragraph(f"{term['label']} - {term['displayValue']} ({term['recurrence']})", styles["Heading4"])); story.append(Paragraph(term["quote"], styles["Small"])); story.append(Paragraph(term["explanation"], styles["Small"]))
    story.append(Paragraph("CALCULATION ASSUMPTIONS", styles["Section"]))
    for assumption in result["costs"]["assumptions"]: story.append(Paragraph(f"- {assumption}", styles["Small"]))
    story.append(Paragraph("DISCLAIMER", styles["Section"])); story.append(Paragraph(result["modeNotice"] + " FeeShield AI provides educational document intelligence, not financial or legal advice. Verify all values against the original signed agreement.", styles["Small"]))
    def footer(canvas, document):
        canvas.saveState(); canvas.setFont("Helvetica", 7); canvas.setFillColor(muted); canvas.drawString(18*mm, 10*mm, f"FeeShield AI | Educational estimate | Page {document.page}"); canvas.restoreState()
    doc.build(story, onFirstPage=footer, onLaterPages=footer)
    return buffer.getvalue()

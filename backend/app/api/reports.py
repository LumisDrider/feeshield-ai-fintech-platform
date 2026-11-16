from __future__ import annotations
from fastapi import APIRouter, Depends, HTTPException, Response
from fastapi.concurrency import run_in_threadpool
from ..services.report_generator import generate_pdf_report
from .dependencies import current_workspace

router = APIRouter(tags=["Reports"])


@router.get("/api/reports/{analysis_id}/pdf")
async def report_pdf(analysis_id: str, workspace=Depends(current_workspace)):
    with workspace["connection"].cursor() as cursor:
        cursor.execute("""SELECT a.full_result, d.filename FROM analyses a JOIN documents d ON d.id = a.document_id
            WHERE a.id = %s AND d.user_id = %s""", (analysis_id, workspace["identity"]))
        row = cursor.fetchone()
    if not row: raise HTTPException(status_code=404, detail="Report not found in this workspace")
    try: content = await run_in_threadpool(generate_pdf_report, row["full_result"], row["filename"])
    except RuntimeError as exc: raise HTTPException(status_code=503, detail=str(exc)) from exc
    return Response(content=content, media_type="application/pdf", headers={"Content-Disposition": f'attachment; filename="FeeShield-{analysis_id[:8]}.pdf"', "Cache-Control": "private, no-store"})

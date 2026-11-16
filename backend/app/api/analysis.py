from __future__ import annotations
from fastapi import APIRouter, Depends, HTTPException, Request
from fastapi.concurrency import run_in_threadpool
from psycopg.types.json import Jsonb
from ..schemas.analysis import AnalysisResponse
from ..schemas.document import AnalysisRequest
from ..services.pipeline import analyse_text
from ..utils.security import rate_limit_analysis
from .dependencies import current_workspace

router = APIRouter(tags=["Analysis"])


@router.post("/api/documents/analyze", response_model=AnalysisResponse)
async def analyze_document(payload: AnalysisRequest, request: Request, workspace=Depends(current_workspace)):
    rate_limit_analysis(request)
    connection = workspace["connection"]
    with connection.cursor() as cursor:
        cursor.execute("SELECT * FROM documents WHERE id = %s AND user_id = %s", (str(payload.document_id), workspace["identity"]))
        document = cursor.fetchone()
        if not document: raise HTTPException(status_code=404, detail="Document not found in this workspace")
        if not document["pending_text"]: raise HTTPException(status_code=409, detail="Source text is no longer available; upload again to re-analyse")
        cursor.execute("UPDATE documents SET processing_status = 'processing' WHERE id = %s", (str(payload.document_id),))
    try:
        result = await run_in_threadpool(analyse_text, document["pending_text"])
        if not workspace["user"]["store_evidence"]:
            result["terms"] = [{**term, "quote": "[Source excerpt not retained: disabled in privacy settings]"} for term in result["terms"]]
            result["risks"] = [{**risk, "quote": "[Source excerpt not retained: disabled in privacy settings]"} for risk in result["risks"]]
        with connection.cursor() as cursor:
            cursor.execute("""INSERT INTO analyses (document_id, contract_type, extracted_terms, analysis_summary, risk_results, calculation_results, full_result)
                VALUES (%s,%s,%s,%s,%s,%s,%s) RETURNING id""", (str(payload.document_id), result["general"]["contractType"], Jsonb(result["terms"]), result["summary"], Jsonb(result["risks"]), Jsonb(result["costs"]), Jsonb(result)))
            analysis_id = cursor.fetchone()["id"]
            cursor.execute("UPDATE documents SET processing_status = 'completed', pending_text = NULL WHERE id = %s", (str(payload.document_id),))
        return {"analysis_id": analysis_id, "document_id": payload.document_id, "result": result}
    except Exception as exc:
        with connection.cursor() as cursor:
            cursor.execute("UPDATE documents SET processing_status = 'failed', pending_text = NULL, error_message = 'Analysis could not be completed' WHERE id = %s", (str(payload.document_id),))
        if isinstance(exc, ValueError): raise HTTPException(status_code=422, detail=str(exc)) from exc
        raise HTTPException(status_code=500, detail="Analysis could not be completed") from exc


@router.get("/api/analysis/{analysis_id}")
def get_analysis(analysis_id: str, workspace=Depends(current_workspace)):
    with workspace["connection"].cursor() as cursor:
        cursor.execute("""SELECT a.*, d.filename, d.user_id FROM analyses a JOIN documents d ON d.id = a.document_id
            WHERE a.id = %s AND d.user_id = %s""", (analysis_id, workspace["identity"]))
        row = cursor.fetchone()
    if not row: raise HTTPException(status_code=404, detail="Analysis not found in this workspace")
    row.pop("user_id", None)
    return row

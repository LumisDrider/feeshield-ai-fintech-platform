from __future__ import annotations
from fastapi import APIRouter, Depends, HTTPException
from psycopg.types.json import Jsonb
from ..schemas.analysis import ComparisonRequest, ComparisonResponse
from ..services.comparison_engine import compare_analyses
from .dependencies import current_workspace

router = APIRouter(tags=["Comparisons"])


@router.post("/api/comparisons", response_model=ComparisonResponse, status_code=201)
def create_comparison(payload: ComparisonRequest, workspace=Depends(current_workspace)):
    if payload.analysis_a_id == payload.analysis_b_id: raise HTTPException(status_code=400, detail="Choose two different analyses")
    connection = workspace["connection"]
    with connection.cursor() as cursor:
        cursor.execute("""SELECT a.id, a.full_result, d.id AS document_id, d.filename FROM analyses a JOIN documents d ON d.id = a.document_id
            WHERE a.id IN (%s,%s) AND d.user_id = %s""", (str(payload.analysis_a_id), str(payload.analysis_b_id), workspace["identity"]))
        rows = cursor.fetchall()
    if len(rows) != 2: raise HTTPException(status_code=404, detail="Both analyses must exist in this workspace")
    a = next(row for row in rows if str(row["id"]) == str(payload.analysis_a_id)); b = next(row for row in rows if str(row["id"]) == str(payload.analysis_b_id))
    result = compare_analyses(a["full_result"], b["full_result"], a["filename"], b["filename"], str(a["id"]), str(b["id"]))
    with connection.cursor() as cursor:
        cursor.execute("INSERT INTO comparisons (user_id, document_a_id, document_b_id, comparison_results) VALUES (%s,%s,%s,%s) RETURNING id", (workspace["identity"], a["document_id"], b["document_id"], Jsonb(result)))
        comparison_id = cursor.fetchone()["id"]
    return {"comparison_id": comparison_id, "result": result}


@router.get("/api/comparisons/{comparison_id}")
def get_comparison(comparison_id: str, workspace=Depends(current_workspace)):
    with workspace["connection"].cursor() as cursor:
        cursor.execute("SELECT * FROM comparisons WHERE id = %s AND user_id = %s", (comparison_id, workspace["identity"]))
        row = cursor.fetchone()
    if not row: raise HTTPException(status_code=404, detail="Comparison not found in this workspace")
    return row

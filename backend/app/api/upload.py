from __future__ import annotations
from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile
from fastapi.concurrency import run_in_threadpool
from ..services.document_extractor import MAX_BYTES, DocumentValidationError, extract_document
from ..services.ocr_service import OCRUnavailable
from ..utils.validation import safe_filename
from .dependencies import current_workspace
from ..schemas.document import DeleteResponse, UploadResponse

router = APIRouter(tags=["Documents"])


@router.post("/api/documents/upload", response_model=UploadResponse, status_code=201)
async def upload_document(file: UploadFile | None = File(None), text: str | None = Form(None), filename: str | None = Form(None), workspace=Depends(current_workspace)):
    try:
        if file is not None and file.filename:
            data = await file.read(MAX_BYTES + 1)
            name = safe_filename(file.filename)
        elif text is not None:
            data = text.encode("utf-8"); name = safe_filename(filename or "Pasted contract.txt")
            if not name.lower().endswith(".txt"): name += ".txt"
        else:
            raise HTTPException(status_code=400, detail="Choose a PDF/TXT file or paste contract text")
        extracted = await run_in_threadpool(extract_document, name, data)
    except (DocumentValidationError, OCRUnavailable) as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc
    connection = workspace["connection"]
    with connection.cursor() as cursor:
        cursor.execute("""INSERT INTO documents (user_id, filename, file_type, file_size, page_count, extraction_method, pending_text)
            VALUES (%s,%s,%s,%s,%s,%s,%s) RETURNING id, filename, file_type, file_size, upload_timestamp, processing_status, page_count, extraction_method""",
            (workspace["identity"], name, name.rsplit(".", 1)[-1].lower(), len(data), extracted["pages"], extracted["method"], extracted["text"]))
        document = cursor.fetchone()
    return {"document": document, "preview": extracted["text"][:12000], "page_count": extracted["pages"], "extraction_method": extracted["method"], "text_truncated": len(extracted["text"]) >= 180000}


@router.get("/api/documents/{document_id}")
def get_document(document_id: str, workspace=Depends(current_workspace)):
    with workspace["connection"].cursor() as cursor:
        cursor.execute("SELECT id, filename, file_type, file_size, upload_timestamp, processing_status, page_count, extraction_method FROM documents WHERE id = %s AND user_id = %s", (document_id, workspace["identity"]))
        document = cursor.fetchone()
    if not document: raise HTTPException(status_code=404, detail="Document not found in this workspace")
    return document


@router.delete("/api/documents/{document_id}", response_model=DeleteResponse)
def delete_document(document_id: str, workspace=Depends(current_workspace)):
    with workspace["connection"].cursor() as cursor:
        cursor.execute("DELETE FROM documents WHERE id = %s AND user_id = %s RETURNING id", (document_id, workspace["identity"]))
        deleted = cursor.fetchone()
    if not deleted: raise HTTPException(status_code=404, detail="Document not found in this workspace")
    return {"deleted": True, "document_id": deleted["id"]}

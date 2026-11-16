"""Validated PDF/TXT ingestion for the standalone FastAPI service."""
from __future__ import annotations
import io
import os
from pathlib import Path
from typing import Dict, Any

MAX_BYTES = int(float(os.getenv("MAX_FILE_SIZE_MB", "8")) * 1024 * 1024)
MAX_CHARS = int(os.getenv("MAX_DOCUMENT_CHARACTERS", "180000"))


class DocumentValidationError(ValueError):
    pass


def validate_upload(filename: str, data: bytes) -> str:
    safe_name = Path(filename).name
    if not data:
        raise DocumentValidationError("The uploaded file is empty.")
    if len(data) > MAX_BYTES:
        raise DocumentValidationError(f"File exceeds the {MAX_BYTES // (1024 * 1024)} MB limit.")
    suffix = Path(safe_name).suffix.lower()
    if suffix not in (".pdf", ".txt"):
        raise DocumentValidationError("Only PDF and TXT files are supported.")
    if suffix == ".pdf" and not data.startswith(b"%PDF-"):
        raise DocumentValidationError("The PDF header is invalid or the file is corrupted.")
    return suffix


def extract_document(filename: str, data: bytes, allow_ocr: bool = True) -> Dict[str, Any]:
    suffix = validate_upload(filename, data)
    if suffix == ".txt":
        try:
            text = data.decode("utf-8-sig")
        except UnicodeDecodeError:
            text = data.decode("latin-1")
        if len(text.strip()) < 40:
            raise DocumentValidationError("The document does not contain enough readable text to analyse.")
        return {"text": text[:MAX_CHARS], "pages": 1, "method": "txt", "ocrUsed": False}
    try:
        import fitz  # PyMuPDF
    except ImportError as exc:
        raise DocumentValidationError("PDF support requires PyMuPDF. Install backend/requirements.txt, or paste the contract text.") from exc
    try:
        pdf = fitz.open(stream=data, filetype="pdf")
        pages = [page.get_text("text") for page in pdf]
        page_count = len(pages)
        pdf.close()
    except Exception as exc:
        raise DocumentValidationError("The PDF could not be opened. It may be corrupted or password protected.") from exc
    text = "\f".join(pages)
    if len(text.strip()) < 40 and allow_ocr:
        from .ocr_service import ocr_pdf
        text = ocr_pdf(data)
        method = "pymupdf+ocr"
    else:
        method = "pymupdf"
    if len(text.strip()) < 40:
        raise DocumentValidationError("No sufficient readable text was found. OCR is unavailable; paste the contract text instead.")
    return {"text": text[:MAX_CHARS], "pages": page_count, "method": method, "ocrUsed": "ocr" in method}

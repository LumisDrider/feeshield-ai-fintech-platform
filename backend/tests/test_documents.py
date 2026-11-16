import pytest
from backend.app.services.document_extractor import DocumentValidationError, extract_document

fitz = pytest.importorskip("fitz")


def pdf_bytes(text="A sufficiently long digital PDF contract with an annual interest rate of 5%."):
    document = fitz.open(); page = document.new_page(); page.insert_text((72, 72), text); data = document.tobytes(); document.close(); return data


def test_valid_pdf_upload_extraction():
    result = extract_document("agreement.pdf", pdf_bytes())
    assert result["pages"] == 1
    assert "interest rate" in result["text"]
    assert result["method"] == "pymupdf"


def test_invalid_file_upload_rejected():
    with pytest.raises(DocumentValidationError): extract_document("payload.exe", b"MZ executable")
    with pytest.raises(DocumentValidationError): extract_document("fake.pdf", b"not a pdf")


def test_empty_document_rejected():
    with pytest.raises(DocumentValidationError): extract_document("empty.txt", b"")


def test_scanned_pdf_uses_ocr_when_available(monkeypatch):
    document = fitz.open(); document.new_page(); scanned = document.tobytes(); document.close()
    monkeypatch.setattr("backend.app.services.ocr_service.ocr_pdf", lambda data: "OCR recovered contract text with principal amount: $1,000 and loan term: 12 months.")
    result = extract_document("scan.pdf", scanned)
    assert result["ocrUsed"] is True
    assert "OCR recovered" in result["text"]

"""Optional OCR adapter. Unavailability is reported honestly, never simulated."""
from __future__ import annotations
import os


class OCRUnavailable(RuntimeError):
    pass


def ocr_pdf(data: bytes) -> str:
    try:
        import fitz
        import pytesseract
        from PIL import Image
    except ImportError as exc:
        raise OCRUnavailable("Scanned PDF OCR requires PyMuPDF, Pillow, pytesseract and a local Tesseract binary.") from exc
    tesseract_cmd = os.getenv("TESSERACT_CMD", "tesseract")
    pytesseract.pytesseract.tesseract_cmd = tesseract_cmd
    try:
        pdf = fitz.open(stream=data, filetype="pdf")
        output = []
        for page in pdf:
            pixmap = page.get_pixmap(matrix=fitz.Matrix(2, 2), alpha=False)
            image = Image.frombytes("RGB", [pixmap.width, pixmap.height], pixmap.samples)
            output.append(pytesseract.image_to_string(image))
        pdf.close()
        return "\f".join(output)
    except Exception as exc:
        raise OCRUnavailable("OCR could not process this scanned PDF. Check the local Tesseract installation or paste the text.") from exc

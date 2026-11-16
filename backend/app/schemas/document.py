from __future__ import annotations
from datetime import datetime
from typing import Optional
from uuid import UUID
from pydantic import BaseModel, Field


class DocumentOut(BaseModel):
    id: UUID
    filename: str
    file_type: str
    file_size: int
    upload_timestamp: datetime
    processing_status: str
    page_count: Optional[int] = None
    extraction_method: Optional[str] = None


class UploadResponse(BaseModel):
    document: DocumentOut
    preview: str = Field(max_length=12000)
    page_count: int
    extraction_method: str
    text_truncated: bool = False


class AnalysisRequest(BaseModel):
    document_id: UUID


class DeleteResponse(BaseModel):
    deleted: bool
    document_id: UUID

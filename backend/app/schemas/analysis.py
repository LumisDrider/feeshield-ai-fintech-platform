from __future__ import annotations
from typing import Any, Dict
from uuid import UUID
from pydantic import BaseModel


class AnalysisResponse(BaseModel):
    analysis_id: UUID
    document_id: UUID
    result: Dict[str, Any]


class ComparisonRequest(BaseModel):
    analysis_a_id: UUID
    analysis_b_id: UUID


class ComparisonResponse(BaseModel):
    comparison_id: UUID
    result: Dict[str, Any]

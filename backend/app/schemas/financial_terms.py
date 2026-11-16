from __future__ import annotations
from typing import Optional
from pydantic import BaseModel, Field


class FinancialTermSchema(BaseModel):
    category: str
    label: str
    value: Optional[float] = None
    unit: Optional[str] = None
    currency: Optional[str] = None
    recurrence: str = "unknown"
    quote: str
    page: Optional[int] = None
    confidence: float = Field(ge=0, le=1)
    explanation: str
    evidence_type: str

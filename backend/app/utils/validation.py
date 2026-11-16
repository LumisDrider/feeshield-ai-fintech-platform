from __future__ import annotations
import re
from pathlib import Path
from uuid import UUID
from fastapi import HTTPException


def safe_filename(filename: str | None) -> str:
    name = Path((filename or "document.txt").replace("\\", "/")).name
    return re.sub(r"[^a-zA-Z0-9._() -]", "_", name)[:160] or "document.txt"


def workspace_id(value: str) -> str:
    try:
        return str(UUID(value))
    except (ValueError, TypeError) as exc:
        raise HTTPException(status_code=401, detail="A valid private workspace session is required") from exc

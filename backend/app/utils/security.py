from __future__ import annotations
import time
from collections import defaultdict, deque
from fastapi import HTTPException, Request

_attempts = defaultdict(deque)


def rate_limit_analysis(request: Request) -> None:
    """Small in-process limiter; use a shared Redis limiter for multiple workers."""
    identity = getattr(request.state, "workspace_id", "unknown")
    now = time.monotonic(); recent = _attempts[identity]
    while recent and now - recent[0] > 600:
        recent.popleft()
    if len(recent) >= 12:
        raise HTTPException(status_code=429, detail="Analysis rate limit reached; retry later")
    recent.append(now)

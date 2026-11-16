"""FeeShield AI standalone FastAPI application. OpenAPI: /docs and /openapi.json."""
from __future__ import annotations
import logging
import os
import uuid
from contextlib import asynccontextmanager
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from .api import analysis, comparison, reports, upload
from .database.connection import connect, initialise_database

logging.basicConfig(level=os.getenv("LOG_LEVEL", "INFO"), format="%(asctime)s %(levelname)s %(name)s %(message)s")
logger = logging.getLogger("feeshield")


@asynccontextmanager
async def lifespan(app: FastAPI):
    initialise_database()
    logger.info("FeeShield AI backend started; document contents are not logged")
    yield

app = FastAPI(title="FeeShield AI API", version="1.0.0", description="Evidence-linked financial document extraction, risk analysis, deterministic cost modelling, comparison, and PDF reports.", lifespan=lifespan)
origins = [origin.strip() for origin in os.getenv("CORS_ORIGINS", "http://localhost:3000").split(",")]
app.add_middleware(CORSMiddleware, allow_origins=origins, allow_credentials=True, allow_methods=["GET","POST","DELETE","OPTIONS"], allow_headers=["Content-Type","X-Workspace-Id"])


@app.middleware("http")
async def workspace_session(request: Request, call_next):
    identity = request.headers.get("X-Workspace-Id") or request.cookies.get("feeshield_workspace")
    if not identity:
        try: uuid.UUID(identity or "")
        except ValueError: identity = str(uuid.uuid4())
    request.state.workspace_id = identity
    response = await call_next(request)
    if not request.cookies.get("feeshield_workspace"):
        response.set_cookie("feeshield_workspace", identity, httponly=True, secure=os.getenv("ENVIRONMENT") == "production", samesite="lax", max_age=31536000)
    return response


@app.exception_handler(Exception)
async def unhandled_error(request: Request, exc: Exception):
    logger.error("Unhandled request error on %s: %s", request.url.path, type(exc).__name__)
    return JSONResponse(status_code=500, content={"detail": "An internal error occurred"})


@app.get("/api/health", tags=["System"])
def health():
    try:
        with connect() as connection:
            with connection.cursor() as cursor: cursor.execute("SELECT 1")
        return {"status": "ok", "database": "connected", "engine": "1.0.0", "aiConfigured": bool(os.getenv("AI_API_KEY"))}
    except Exception as exc:
        return JSONResponse(status_code=503, content={"status": "degraded", "database": "unavailable", "errorType": type(exc).__name__})

app.include_router(upload.router)
app.include_router(analysis.router)
app.include_router(comparison.router)
app.include_router(reports.router)

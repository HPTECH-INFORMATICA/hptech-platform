import logging

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware

from app.db import base as _models
from app.api.router import api_router
from app.core.config import settings


security_logger = logging.getLogger("hptech.security")

app = FastAPI(
    title=settings.APP_NAME,
    version="1.0.0",
    description="API principal da HPTECH Platform",
)

origins = [
    origin.strip()
    for origin in settings.CORS_ORIGINS.split(",")
    if origin.strip()
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allow_headers=["Accept", "Authorization", "Content-Type"],
)


@app.middleware("http")
async def apply_security_headers(request: Request, call_next):
    response = await call_next(request)
    response.headers.setdefault("X-Content-Type-Options", "nosniff")
    response.headers.setdefault("X-Frame-Options", "DENY")
    response.headers.setdefault(
        "Referrer-Policy",
        "strict-origin-when-cross-origin",
    )

    if request.url.path.startswith(
        (
            "/api/v1/auth",
            "/api/v1/leads",
            "/api/v1/lead-history",
            "/api/v1/audit-logs",
            "/api/v1/appointments",
        )
    ):
        response.headers["Cache-Control"] = "private, no-store"

    if response.status_code in {401, 403, 429}:
        security_logger.info(
            "security.http.denied status=%s method=%s",
            response.status_code,
            request.method,
        )

    return response

app.include_router(api_router)


@app.get("/", tags=["Root"])
def root() -> dict[str, str]:
    return {
        "application": settings.APP_NAME,
        "status": "running",
        "version": "1.0.0",
    }

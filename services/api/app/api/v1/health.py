from fastapi import APIRouter, status
from fastapi.responses import JSONResponse
from sqlalchemy.exc import SQLAlchemyError

from app.db.database import test_database_connection

router = APIRouter(tags=["Health"])


@router.get("/health")
def health_check() -> dict[str, str]:
    return {
        "status": "ok",
        "service": "HPTECH Platform API",
        "version": "1.0.0",
    }


@router.get("/readiness")
def readiness_check() -> JSONResponse:
    try:
        test_database_connection()
    except SQLAlchemyError:
        return JSONResponse(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            content={"status": "unavailable"},
        )

    return JSONResponse(content={"status": "ready"})

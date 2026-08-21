from fastapi import APIRouter

from app.api.v1.health import router as health_router
from app.routers.auth import router as auth_router
from app.routers.lead import router as lead_router
from app.routers.lead_history import router as lead_history_router
from app.routers.user_admin import router as user_admin_router

api_router = APIRouter(prefix="/api/v1")

api_router.include_router(health_router)
api_router.include_router(auth_router)
api_router.include_router(lead_router)
api_router.include_router(lead_history_router)
api_router.include_router(user_admin_router)

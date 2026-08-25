from fastapi import APIRouter

from app.api.v1.health import router as health_router
from app.routers.access_control import router as access_control_router
from app.routers.audit_log import router as audit_log_router
from app.routers.company import router as company_router
from app.routers.auth import router as auth_router
from app.routers.lead import router as lead_router
from app.routers.lead_history import router as lead_history_router
from app.routers.service import router as service_router
from app.routers.user_admin import router as user_admin_router

api_router = APIRouter(prefix="/api/v1")

api_router.include_router(health_router)
api_router.include_router(access_control_router)
api_router.include_router(audit_log_router)
api_router.include_router(company_router)
api_router.include_router(auth_router)
api_router.include_router(lead_router)
api_router.include_router(lead_history_router)
api_router.include_router(service_router)
api_router.include_router(user_admin_router)

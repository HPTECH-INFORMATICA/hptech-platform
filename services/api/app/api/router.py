from fastapi import APIRouter

from app.api.v1.health import router as health_router
from app.routers.access_control import router as access_control_router
from app.routers.audit_log import router as audit_log_router
from app.routers.company import router as company_router
from app.routers.auth import router as auth_router
from app.routers.lead import router as lead_router
from app.routers.lead_history import router as lead_history_router
from app.routers.service import router as service_router
from app.routers.service_category import router as service_category_router
from app.routers.patient import router as patient_router
from app.routers.professional import router as professional_router
from app.routers.professional_availability import router as professional_availability_router
from app.routers.appointment import router as appointment_router
from app.routers.financial import router as financial_router
from app.routers.financial import summary_router as financial_summary_router
from app.routers.landing_page import (
    public_router as public_landing_page_router,
    router as landing_page_router,
)
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
api_router.include_router(service_category_router)
api_router.include_router(patient_router)
api_router.include_router(professional_router)
api_router.include_router(professional_availability_router)
api_router.include_router(appointment_router)
api_router.include_router(financial_summary_router)
api_router.include_router(financial_router)
api_router.include_router(landing_page_router)
api_router.include_router(public_landing_page_router)
api_router.include_router(user_admin_router)

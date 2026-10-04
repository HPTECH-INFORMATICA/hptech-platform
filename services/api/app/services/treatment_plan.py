import uuid
from datetime import UTC, datetime

from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import Session

from app.core.identity import AuthenticatedIdentity
from app.models.treatment_plan import TreatmentPlan, TreatmentPlanItem
from app.repositories.audit_log import AuditLogRepository
from app.repositories.service import ServiceRepository
from app.repositories.treatment_plan import TreatmentPlanRepository
from app.schemas.treatment_plan import TreatmentPlanCreate, TreatmentPlanListResponse, TreatmentPlanResponse, TreatmentPlanStatusUpdate, TreatmentPlanUpdate


class TreatmentPlanNotFoundError(RuntimeError): pass
class TreatmentPlanReferenceError(ValueError): pass
class TreatmentPlanPersistenceError(RuntimeError): pass


class TreatmentPlanDomain:
    @staticmethod
    def _validate_services(db: Session, company_id: uuid.UUID, data: TreatmentPlanCreate) -> None:
        for item in data.items:
            service = ServiceRepository.get_by_id(db, company_id, item.service_id)
            if service is None or not service.is_active:
                raise TreatmentPlanReferenceError("Todos os serviços do plano devem estar ativos e pertencer à clínica.")

    @staticmethod
    def _items(company_id: uuid.UUID, data: TreatmentPlanCreate) -> list[TreatmentPlanItem]:
        return [TreatmentPlanItem(company_id=company_id, service_id=item.service_id, paid_sessions=item.paid_sessions, complimentary_sessions=item.complimentary_sessions) for item in data.items]

    @staticmethod
    def _commit(db: Session, plan: TreatmentPlan) -> TreatmentPlan:
        try:
            db.commit(); db.refresh(plan); return plan
        except SQLAlchemyError as error:
            db.rollback(); raise TreatmentPlanPersistenceError from error

    @classmethod
    def list(cls, db: Session, identity: AuthenticatedIdentity, *, page: int, page_size: int, is_active: bool | None) -> TreatmentPlanListResponse:
        items, total = TreatmentPlanRepository.list_by_company(db, identity.company.id, page=page, page_size=page_size, is_active=is_active)
        return TreatmentPlanListResponse(items=[TreatmentPlanResponse.model_validate(item) for item in items], total=total, page=page, page_size=page_size)

    @classmethod
    def create(cls, db: Session, identity: AuthenticatedIdentity, data: TreatmentPlanCreate) -> TreatmentPlan:
        cls._validate_services(db, identity.company.id, data)
        plan = TreatmentPlan(company_id=identity.company.id, name=data.name, description=data.description, price=data.price, validity_days=data.validity_days, is_active=True, items=cls._items(identity.company.id, data))
        db.add(plan); db.flush()
        AuditLogRepository.add(db, company_id=identity.company.id, actor_user_id=identity.user.id, target_type="TREATMENT_PLAN", target_id=plan.id, action="TREATMENT_PLAN_CREATED", details={"state": "ACTIVE"})
        return cls._commit(db, plan)

    @classmethod
    def update(cls, db: Session, identity: AuthenticatedIdentity, plan_id: uuid.UUID, data: TreatmentPlanUpdate) -> TreatmentPlan:
        plan = TreatmentPlanRepository.get_by_id(db, identity.company.id, plan_id, for_update=True)
        if plan is None: raise TreatmentPlanNotFoundError
        cls._validate_services(db, identity.company.id, data)
        plan.name, plan.description, plan.price, plan.validity_days = data.name, data.description, data.price, data.validity_days
        plan.items = cls._items(identity.company.id, data)
        AuditLogRepository.add(db, company_id=identity.company.id, actor_user_id=identity.user.id, target_type="TREATMENT_PLAN", target_id=plan.id, action="TREATMENT_PLAN_UPDATED", details={"fields": ["name", "description", "price", "validity_days", "items"]})
        return cls._commit(db, plan)

    @classmethod
    def change_status(cls, db: Session, identity: AuthenticatedIdentity, plan_id: uuid.UUID, data: TreatmentPlanStatusUpdate) -> TreatmentPlan:
        plan = TreatmentPlanRepository.get_by_id(db, identity.company.id, plan_id, for_update=True)
        if plan is None: raise TreatmentPlanNotFoundError
        plan.is_active = data.is_active
        AuditLogRepository.add(db, company_id=identity.company.id, actor_user_id=identity.user.id, target_type="TREATMENT_PLAN", target_id=plan.id, action="TREATMENT_PLAN_STATUS_CHANGED", details={"state": "ACTIVE" if data.is_active else "INACTIVE"})
        return cls._commit(db, plan)

    @classmethod
    def soft_delete(cls, db: Session, identity: AuthenticatedIdentity, plan_id: uuid.UUID) -> None:
        plan = TreatmentPlanRepository.get_by_id(db, identity.company.id, plan_id, for_update=True)
        if plan is None: raise TreatmentPlanNotFoundError
        plan.is_active = False; plan.deleted_at = datetime.now(UTC)
        AuditLogRepository.add(db, company_id=identity.company.id, actor_user_id=identity.user.id, target_type="TREATMENT_PLAN", target_id=plan.id, action="TREATMENT_PLAN_SOFT_DELETED", details={"state": "DELETED"})
        cls._commit(db, plan)

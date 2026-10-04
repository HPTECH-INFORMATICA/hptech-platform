import uuid

from sqlalchemy import func, select
from sqlalchemy.orm import Session, selectinload

from app.models.treatment_plan import TreatmentPlan, TreatmentPlanItem


class TreatmentPlanRepository:
    @staticmethod
    def get_by_id(db: Session, company_id: uuid.UUID, plan_id: uuid.UUID, *, for_update: bool = False) -> TreatmentPlan | None:
        statement = select(TreatmentPlan).options(
            selectinload(TreatmentPlan.items).selectinload(TreatmentPlanItem.service)
        ).where(TreatmentPlan.company_id == company_id, TreatmentPlan.id == plan_id, TreatmentPlan.deleted_at.is_(None))
        if for_update:
            statement = statement.with_for_update()
        return db.execute(statement).scalar_one_or_none()

    @staticmethod
    def list_by_company(db: Session, company_id: uuid.UUID, *, page: int, page_size: int, is_active: bool | None) -> tuple[list[TreatmentPlan], int]:
        filters = [TreatmentPlan.company_id == company_id, TreatmentPlan.deleted_at.is_(None)]
        if is_active is not None:
            filters.append(TreatmentPlan.is_active.is_(is_active))
        total = db.scalar(select(func.count()).select_from(TreatmentPlan).where(*filters)) or 0
        statement = select(TreatmentPlan).options(
            selectinload(TreatmentPlan.items).selectinload(TreatmentPlanItem.service)
        ).where(*filters).order_by(TreatmentPlan.name, TreatmentPlan.id).offset((page - 1) * page_size).limit(page_size)
        return list(db.execute(statement).scalars().all()), total

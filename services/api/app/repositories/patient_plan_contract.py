import uuid

from sqlalchemy import func, select
from sqlalchemy.orm import Session, selectinload

from app.models.patient_plan_contract import PatientPlanContract, PatientPlanContractItem


class PatientPlanContractRepository:
    @staticmethod
    def get_by_id(db: Session, company_id: uuid.UUID, contract_id: uuid.UUID) -> PatientPlanContract | None:
        statement = select(PatientPlanContract).options(
            selectinload(PatientPlanContract.items).selectinload(PatientPlanContractItem.ledger_entries),
            selectinload(PatientPlanContract.transactions),
        ).where(PatientPlanContract.company_id == company_id, PatientPlanContract.id == contract_id)
        return db.execute(statement).scalar_one_or_none()

    @staticmethod
    def list_by_patient(db: Session, company_id: uuid.UUID, patient_id: uuid.UUID, *, page: int, page_size: int) -> tuple[list[PatientPlanContract], int]:
        filters = [PatientPlanContract.company_id == company_id, PatientPlanContract.patient_id == patient_id]
        total = db.scalar(select(func.count()).select_from(PatientPlanContract).where(*filters)) or 0
        statement = select(PatientPlanContract).options(
            selectinload(PatientPlanContract.items).selectinload(PatientPlanContractItem.ledger_entries),
            selectinload(PatientPlanContract.transactions),
        ).where(*filters).order_by(PatientPlanContract.contracted_at.desc()).offset((page - 1) * page_size).limit(page_size)
        return list(db.execute(statement).scalars().all()), total

import uuid

from sqlalchemy import func, or_, select
from sqlalchemy.orm import Session

from app.models.patient import Patient
from app.schemas.patient import PatientCreate


class PatientRepository:
    @staticmethod
    def create(db: Session, company_id: uuid.UUID, data: PatientCreate) -> Patient:
        patient = Patient(company_id=company_id, is_active=True, **data.model_dump())
        db.add(patient)
        db.flush()
        return patient

    @staticmethod
    def get_by_id(
        db: Session,
        company_id: uuid.UUID,
        patient_id: uuid.UUID,
        *,
        for_update: bool = False,
    ) -> Patient | None:
        statement = select(Patient).where(
            Patient.company_id == company_id,
            Patient.id == patient_id,
            Patient.deleted_at.is_(None),
        )
        if for_update:
            statement = statement.with_for_update()
        return db.execute(statement).scalar_one_or_none()

    @staticmethod
    def list_by_company(
        db: Session,
        company_id: uuid.UUID,
        *,
        page: int,
        page_size: int,
        search: str | None,
        is_active: bool | None,
    ) -> tuple[list[Patient], int]:
        filters = [
            Patient.company_id == company_id,
            Patient.deleted_at.is_(None),
        ]
        if search and (term := search.strip()):
            filters.append(
                or_(
                    Patient.name.icontains(term, autoescape=True),
                    Patient.email.icontains(term, autoescape=True),
                    Patient.phone.icontains(term, autoescape=True),
                    Patient.whatsapp.icontains(term, autoescape=True),
                    Patient.document.icontains(term, autoescape=True),
                )
            )
        if is_active is not None:
            filters.append(Patient.is_active.is_(is_active))

        total = db.scalar(
            select(func.count()).select_from(Patient).where(*filters)
        ) or 0
        statement = (
            select(Patient)
            .where(*filters)
            .order_by(Patient.name.asc(), Patient.id.asc())
            .offset((page - 1) * page_size)
            .limit(page_size)
        )
        return list(db.execute(statement).scalars().all()), total

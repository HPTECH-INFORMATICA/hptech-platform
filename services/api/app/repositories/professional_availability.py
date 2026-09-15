import uuid
from datetime import date

from sqlalchemy import delete, func, select
from sqlalchemy.orm import Session

from app.models.professional_availability import (
    ProfessionalAvailabilityException,
    ProfessionalWeeklyAvailability,
)


class ProfessionalAvailabilityRepository:
    @staticmethod
    def list_weekly(
        db: Session, company_id: uuid.UUID, professional_id: uuid.UUID
    ) -> list[ProfessionalWeeklyAvailability]:
        statement = (
            select(ProfessionalWeeklyAvailability)
            .where(
                ProfessionalWeeklyAvailability.company_id == company_id,
                ProfessionalWeeklyAvailability.professional_id == professional_id,
            )
            .order_by(
                ProfessionalWeeklyAvailability.weekday,
                ProfessionalWeeklyAvailability.start_time,
                ProfessionalWeeklyAvailability.end_time,
                ProfessionalWeeklyAvailability.id,
            )
        )
        return list(db.execute(statement).scalars().all())

    @staticmethod
    def replace_weekly(
        db: Session,
        company_id: uuid.UUID,
        professional_id: uuid.UUID,
        intervals: list[tuple[int, object, object]],
    ) -> None:
        db.execute(
            delete(ProfessionalWeeklyAvailability).where(
                ProfessionalWeeklyAvailability.company_id == company_id,
                ProfessionalWeeklyAvailability.professional_id == professional_id,
            )
        )
        db.add_all(
            ProfessionalWeeklyAvailability(
                company_id=company_id,
                professional_id=professional_id,
                weekday=weekday,
                start_time=start_time,
                end_time=end_time,
            )
            for weekday, start_time, end_time in intervals
        )
        db.flush()

    @staticmethod
    def list_exceptions(
        db: Session,
        company_id: uuid.UUID,
        professional_id: uuid.UUID,
        *,
        date_from: date | None,
        date_to: date | None,
        page: int,
        page_size: int,
    ) -> tuple[list[ProfessionalAvailabilityException], int]:
        filters = [
            ProfessionalAvailabilityException.company_id == company_id,
            ProfessionalAvailabilityException.professional_id == professional_id,
        ]
        if date_from is not None:
            filters.append(ProfessionalAvailabilityException.local_date >= date_from)
        if date_to is not None:
            filters.append(ProfessionalAvailabilityException.local_date <= date_to)
        total = db.scalar(
            select(func.count())
            .select_from(ProfessionalAvailabilityException)
            .where(*filters)
        ) or 0
        statement = (
            select(ProfessionalAvailabilityException)
            .where(*filters)
            .order_by(
                ProfessionalAvailabilityException.local_date,
                ProfessionalAvailabilityException.start_time.asc().nullsfirst(),
                ProfessionalAvailabilityException.end_time.asc().nullsfirst(),
                ProfessionalAvailabilityException.id,
            )
            .offset((page - 1) * page_size)
            .limit(page_size)
        )
        return list(db.execute(statement).scalars().all()), total

    @staticmethod
    def list_exceptions_on_date(
        db: Session,
        company_id: uuid.UUID,
        professional_id: uuid.UUID,
        local_date: date,
        *,
        exclude_id: uuid.UUID | None = None,
    ) -> list[ProfessionalAvailabilityException]:
        filters = [
            ProfessionalAvailabilityException.company_id == company_id,
            ProfessionalAvailabilityException.professional_id == professional_id,
            ProfessionalAvailabilityException.local_date == local_date,
        ]
        if exclude_id is not None:
            filters.append(ProfessionalAvailabilityException.id != exclude_id)
        return list(db.execute(select(ProfessionalAvailabilityException).where(*filters)).scalars().all())

    @staticmethod
    def list_exceptions_between(
        db: Session,
        company_id: uuid.UUID,
        professional_id: uuid.UUID,
        date_from: date,
        date_to: date,
    ) -> list[ProfessionalAvailabilityException]:
        statement = select(ProfessionalAvailabilityException).where(
            ProfessionalAvailabilityException.company_id == company_id,
            ProfessionalAvailabilityException.professional_id == professional_id,
            ProfessionalAvailabilityException.local_date >= date_from,
            ProfessionalAvailabilityException.local_date <= date_to,
        )
        return list(db.execute(statement).scalars().all())

    @staticmethod
    def get_exception(
        db: Session,
        company_id: uuid.UUID,
        professional_id: uuid.UUID,
        exception_id: uuid.UUID,
        *,
        for_update: bool = False,
    ) -> ProfessionalAvailabilityException | None:
        statement = select(ProfessionalAvailabilityException).where(
            ProfessionalAvailabilityException.company_id == company_id,
            ProfessionalAvailabilityException.professional_id == professional_id,
            ProfessionalAvailabilityException.id == exception_id,
        )
        if for_update:
            statement = statement.with_for_update()
        return db.execute(statement).scalar_one_or_none()

    @staticmethod
    def add_exception(
        db: Session, exception: ProfessionalAvailabilityException
    ) -> None:
        db.add(exception)
        db.flush()

    @staticmethod
    def delete_exception(
        db: Session, exception: ProfessionalAvailabilityException
    ) -> None:
        db.delete(exception)

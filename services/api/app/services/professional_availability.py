import uuid
from datetime import datetime
from zoneinfo import ZoneInfo

from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import Session

from app.core.identity import AuthenticatedIdentity
from app.models.professional_availability import ProfessionalAvailabilityException
from app.repositories.audit_log import AuditLogRepository
from app.repositories.professional import ProfessionalRepository
from app.repositories.professional_availability import ProfessionalAvailabilityRepository
from app.schemas.professional_availability import (
    AvailabilityExceptionCreate,
    AvailabilityExceptionKind,
    AvailabilityExceptionListResponse,
    AvailabilityExceptionResponse,
    AvailabilityExceptionUpdate,
    WeeklyAvailabilityResponse,
    WeeklyAvailabilityUpdate,
    WeeklyInterval,
    _validate_exception_times,
)


class AvailabilityNotFoundError(RuntimeError):
    pass


class AvailabilityValidationError(RuntimeError):
    pass


class AvailabilityPersistenceError(RuntimeError):
    pass


class ProfessionalAvailabilityDomain:
    @staticmethod
    def _professional(db: Session, identity: AuthenticatedIdentity, professional_id: uuid.UUID, *, lock: bool = False):
        professional = ProfessionalRepository.get_by_id(
            db, identity.company.id, professional_id, for_update=lock
        )
        if professional is None:
            raise AvailabilityNotFoundError
        return professional

    @staticmethod
    def _today(identity: AuthenticatedIdentity):
        return datetime.now(ZoneInfo(identity.company.timezone)).date()

    @staticmethod
    def _commit(db: Session) -> None:
        try:
            db.commit()
        except SQLAlchemyError as error:
            db.rollback()
            raise AvailabilityPersistenceError from error

    @staticmethod
    def _normalize_weekly(data: WeeklyAvailabilityUpdate) -> list[tuple[int, object, object]]:
        intervals = sorted(
            ((item.weekday, item.start_time, item.end_time) for item in data.intervals),
            key=lambda item: item,
        )
        previous = None
        for current in intervals:
            if previous is not None and previous[0] == current[0] and current[1] < previous[2]:
                raise AvailabilityValidationError("Os intervalos semanais não podem se sobrepor.")
            previous = current
        return intervals

    @staticmethod
    def _validate_exception_set(
        kind: AvailabilityExceptionKind,
        start_time,
        end_time,
        existing: list[ProfessionalAvailabilityException],
    ) -> None:
        try:
            _validate_exception_times(kind, start_time, end_time)
        except ValueError as error:
            raise AvailabilityValidationError(str(error)) from error
        full_day = start_time is None
        if full_day and existing:
            raise AvailabilityValidationError("Indisponibilidade integral deve ser exclusiva na data.")
        if any(item.start_time is None for item in existing):
            raise AvailabilityValidationError("Já existe indisponibilidade integral nesta data.")
        if start_time is not None and end_time is not None:
            for item in existing:
                if item.start_time is not None and item.end_time is not None:
                    if start_time < item.end_time and item.start_time < end_time:
                        raise AvailabilityValidationError("As exceções não podem se sobrepor.")

    @classmethod
    def get_weekly(cls, db: Session, identity: AuthenticatedIdentity, professional_id: uuid.UUID) -> WeeklyAvailabilityResponse:
        cls._professional(db, identity, professional_id)
        items = ProfessionalAvailabilityRepository.list_weekly(db, identity.company.id, professional_id)
        return WeeklyAvailabilityResponse(
            professional_id=professional_id,
            timezone=identity.company.timezone,
            intervals=[WeeklyInterval.model_validate(item, from_attributes=True) for item in items],
        )

    @classmethod
    def replace_weekly(cls, db: Session, identity: AuthenticatedIdentity, professional_id: uuid.UUID, data: WeeklyAvailabilityUpdate) -> WeeklyAvailabilityResponse:
        cls._professional(db, identity, professional_id, lock=True)
        normalized = cls._normalize_weekly(data)
        current = ProfessionalAvailabilityRepository.list_weekly(db, identity.company.id, professional_id)
        current_values = [(item.weekday, item.start_time, item.end_time) for item in current]
        if current_values == normalized:
            return WeeklyAvailabilityResponse(
                professional_id=professional_id,
                timezone=identity.company.timezone,
                intervals=[WeeklyInterval.model_validate(item, from_attributes=True) for item in current],
            )
        try:
            ProfessionalAvailabilityRepository.replace_weekly(db, identity.company.id, professional_id, normalized)
            weekdays = sorted({item[0] for item in current_values} | {item[0] for item in normalized})
            AuditLogRepository.add(
                db, company_id=identity.company.id, actor_user_id=identity.user.id,
                target_type="PROFESSIONAL", target_id=professional_id,
                action="PROFESSIONAL_AVAILABILITY_WEEKLY_UPDATED",
                details={"previous_count": len(current_values), "new_count": len(normalized), "weekdays": weekdays},
            )
            cls._commit(db)
        except SQLAlchemyError as error:
            db.rollback()
            raise AvailabilityPersistenceError from error
        return cls.get_weekly(db, identity, professional_id)

    @classmethod
    def list_exceptions(cls, db: Session, identity: AuthenticatedIdentity, professional_id: uuid.UUID, *, date_from, date_to, page: int, page_size: int) -> AvailabilityExceptionListResponse:
        cls._professional(db, identity, professional_id)
        if date_from is not None and date_to is not None and date_from > date_to:
            raise AvailabilityValidationError("date_from deve ser anterior ou igual a date_to.")
        items, total = ProfessionalAvailabilityRepository.list_exceptions(
            db, identity.company.id, professional_id, date_from=date_from, date_to=date_to, page=page, page_size=page_size
        )
        return AvailabilityExceptionListResponse(
            items=[AvailabilityExceptionResponse.model_validate(item) for item in items], total=total,
            page=page, page_size=page_size, timezone=identity.company.timezone,
        )

    @classmethod
    def create_exception(cls, db: Session, identity: AuthenticatedIdentity, professional_id: uuid.UUID, data: AvailabilityExceptionCreate) -> ProfessionalAvailabilityException:
        cls._professional(db, identity, professional_id, lock=True)
        if data.local_date < cls._today(identity):
            raise AvailabilityValidationError("Não é permitido criar exceção em data passada.")
        existing = ProfessionalAvailabilityRepository.list_exceptions_on_date(db, identity.company.id, professional_id, data.local_date)
        cls._validate_exception_set(data.kind, data.start_time, data.end_time, existing)
        exception = ProfessionalAvailabilityException(
            company_id=identity.company.id, professional_id=professional_id, local_date=data.local_date,
            kind=data.kind.value, start_time=data.start_time, end_time=data.end_time,
        )
        try:
            ProfessionalAvailabilityRepository.add_exception(db, exception)
            AuditLogRepository.add(
                db, company_id=identity.company.id, actor_user_id=identity.user.id,
                target_type="PROFESSIONAL_AVAILABILITY_EXCEPTION", target_id=exception.id,
                action="PROFESSIONAL_AVAILABILITY_EXCEPTION_CREATED",
                details={"kind": data.kind.value, "scope": "FULL_DAY" if data.start_time is None else "PARTIAL"},
            )
            cls._commit(db)
            db.refresh(exception)
            return exception
        except SQLAlchemyError as error:
            db.rollback()
            raise AvailabilityPersistenceError from error

    @classmethod
    def update_exception(cls, db: Session, identity: AuthenticatedIdentity, professional_id: uuid.UUID, exception_id: uuid.UUID, data: AvailabilityExceptionUpdate) -> ProfessionalAvailabilityException:
        cls._professional(db, identity, professional_id, lock=True)
        exception = ProfessionalAvailabilityRepository.get_exception(db, identity.company.id, professional_id, exception_id, for_update=True)
        if exception is None:
            raise AvailabilityNotFoundError
        today = cls._today(identity)
        if exception.local_date < today:
            raise AvailabilityValidationError("Não é permitido editar exceção passada.")
        changes = data.model_dump(exclude_unset=True)
        final_date = changes.get("local_date", exception.local_date)
        final_kind = changes.get("kind", AvailabilityExceptionKind(exception.kind))
        final_start = changes.get("start_time", exception.start_time)
        final_end = changes.get("end_time", exception.end_time)
        if final_date < today:
            raise AvailabilityValidationError("Não é permitido mover exceção para data passada.")
        existing = ProfessionalAvailabilityRepository.list_exceptions_on_date(
            db, identity.company.id, professional_id, final_date, exclude_id=exception.id
        )
        cls._validate_exception_set(final_kind, final_start, final_end, existing)
        changed = []
        normalized = {"local_date": final_date, "kind": final_kind.value, "start_time": final_start, "end_time": final_end}
        for field, value in normalized.items():
            if getattr(exception, field) != value:
                setattr(exception, field, value)
                changed.append(field)
        if not changed:
            return exception
        AuditLogRepository.add(
            db, company_id=identity.company.id, actor_user_id=identity.user.id,
            target_type="PROFESSIONAL_AVAILABILITY_EXCEPTION", target_id=exception.id,
            action="PROFESSIONAL_AVAILABILITY_EXCEPTION_UPDATED", details={"fields": changed},
        )
        cls._commit(db)
        db.refresh(exception)
        return exception

    @classmethod
    def delete_exception(cls, db: Session, identity: AuthenticatedIdentity, professional_id: uuid.UUID, exception_id: uuid.UUID) -> None:
        cls._professional(db, identity, professional_id, lock=True)
        exception = ProfessionalAvailabilityRepository.get_exception(db, identity.company.id, professional_id, exception_id, for_update=True)
        if exception is None:
            raise AvailabilityNotFoundError
        if exception.local_date < cls._today(identity):
            raise AvailabilityValidationError("Exceções passadas são preservadas para consulta.")
        AuditLogRepository.add(
            db, company_id=identity.company.id, actor_user_id=identity.user.id,
            target_type="PROFESSIONAL_AVAILABILITY_EXCEPTION", target_id=exception.id,
            action="PROFESSIONAL_AVAILABILITY_EXCEPTION_DELETED",
            details={"kind": exception.kind, "scope": "FULL_DAY" if exception.start_time is None else "PARTIAL"},
        )
        ProfessionalAvailabilityRepository.delete_exception(db, exception)
        cls._commit(db)

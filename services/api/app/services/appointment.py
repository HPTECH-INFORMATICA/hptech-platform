from collections.abc import Iterable
import uuid
from datetime import UTC, datetime, timedelta
from zoneinfo import ZoneInfo

from sqlalchemy.exc import IntegrityError, SQLAlchemyError
from sqlalchemy.orm import Session

from app.core.timezones import normalize_iana_timezone
from app.core.identity import AuthenticatedIdentity, UserRole
from app.models.appointment import Appointment
from app.models.patient_plan_contract import (
    PatientPlanContractItem,
    SessionLedgerEntry,
)
from app.models.transaction import Transaction
from app.repositories.appointment import AppointmentRepository
from app.repositories.audit_log import AuditLogRepository
from app.repositories.financial import FinancialRepository
from app.repositories.lead import LeadRepository
from app.repositories.patient import PatientRepository
from app.repositories.patient_plan_contract import PatientPlanContractRepository
from app.repositories.professional import ProfessionalRepository
from app.repositories.professional_availability import (
    ProfessionalAvailabilityRepository,
)
from app.repositories.service import ServiceRepository
from app.schemas.appointment import (
    AppointmentCivilDateTime,
    AppointmentCreate,
    AppointmentDelete,
    AppointmentListResponse,
    AppointmentResponse,
    AppointmentReschedule,
    AppointmentStatus,
    AppointmentUpdate,
)
from app.schemas.financial import TransactionStatus, TransactionType
from app.services.effective_availability import interval_is_effectively_available


class AppointmentTimeError(ValueError):
    pass


class AppointmentLifecycleError(ValueError):
    pass


class AppointmentNotFoundError(RuntimeError):
    pass


class AppointmentReferenceError(ValueError):
    pass


class AppointmentAvailabilityError(ValueError):
    pass


class AppointmentConflictError(RuntimeError):
    pass


class AppointmentPersistenceError(RuntimeError):
    pass


ALLOWED_STATUS_TRANSITIONS: dict[
    AppointmentStatus,
    frozenset[AppointmentStatus],
] = {
    AppointmentStatus.SCHEDULED: frozenset(
        {
            AppointmentStatus.CONFIRMED,
            AppointmentStatus.CANCELED,
            AppointmentStatus.NO_SHOW,
            AppointmentStatus.IN_PROGRESS,
        }
    ),
    AppointmentStatus.CONFIRMED: frozenset(
        {
            AppointmentStatus.IN_PROGRESS,
            AppointmentStatus.CANCELED,
            AppointmentStatus.NO_SHOW,
        }
    ),
    AppointmentStatus.IN_PROGRESS: frozenset({AppointmentStatus.COMPLETED}),
    AppointmentStatus.COMPLETED: frozenset(),
    AppointmentStatus.CANCELED: frozenset(),
    AppointmentStatus.NO_SHOW: frozenset(),
}

MUTABLE_FIELDS_BY_STATUS: dict[AppointmentStatus, frozenset[str]] = {
    AppointmentStatus.SCHEDULED: frozenset(
        {
            "patient_id",
            "professional_id",
            "service_id",
            "duration_minutes",
            "notes",
        }
    ),
    AppointmentStatus.CONFIRMED: frozenset(
        {
            "patient_id",
            "professional_id",
            "service_id",
            "duration_minutes",
            "notes",
        }
    ),
    AppointmentStatus.IN_PROGRESS: frozenset({"notes"}),
    AppointmentStatus.COMPLETED: frozenset(),
    AppointmentStatus.CANCELED: frozenset(),
    AppointmentStatus.NO_SHOW: frozenset(),
}


def resolve_company_civil_datetime(
    value: AppointmentCivilDateTime,
    timezone_name: str,
) -> datetime:
    """Resolve a civil time to UTC without silently choosing a DST occurrence."""

    try:
        zone = ZoneInfo(normalize_iana_timezone(timezone_name))
    except ValueError as error:
        raise AppointmentTimeError(str(error)) from error

    candidates: dict[int, datetime] = {}
    for fold in (0, 1):
        zoned = value.local_datetime.replace(tzinfo=zone, fold=fold)
        instant = zoned.astimezone(UTC)
        round_trip = instant.astimezone(zone).replace(tzinfo=None)
        if round_trip != value.local_datetime:
            continue
        offset = zoned.utcoffset()
        if offset is None:
            continue
        offset_minutes = int(offset.total_seconds() // 60)
        candidates[offset_minutes] = instant

    if not candidates:
        raise AppointmentTimeError(
            "A data e hora informadas não existem no fuso horário da empresa."
        )

    if len(candidates) > 1 and value.utc_offset_minutes is None:
        raise AppointmentTimeError(
            "A data e hora são ambíguas; informe utc_offset_minutes explicitamente."
        )

    if value.utc_offset_minutes is not None:
        selected = candidates.get(value.utc_offset_minutes)
        if selected is None:
            raise AppointmentTimeError(
                "O offset informado não corresponde à data, hora e fuso da empresa."
            )
        return selected

    return next(iter(candidates.values()))


def require_status_transition(
    current: AppointmentStatus,
    target: AppointmentStatus,
) -> None:
    if target not in ALLOWED_STATUS_TRANSITIONS[current]:
        raise AppointmentLifecycleError(
            f"Transição de {current.value} para {target.value} não permitida."
        )


def require_mutable_fields(
    status: AppointmentStatus,
    fields: Iterable[str],
) -> None:
    requested = set(fields)
    forbidden = requested - MUTABLE_FIELDS_BY_STATUS[status]
    if forbidden:
        names = ", ".join(sorted(forbidden))
        raise AppointmentLifecycleError(
            f"Os campos não podem ser alterados em {status.value}: {names}."
        )


class AppointmentDomain:
    @staticmethod
    def _available_sessions(item: PatientPlanContractItem, bucket: str) -> int:
        additions = {"CREDIT", "RELEASE", "RESTORE"}
        return sum(
            entry.quantity if entry.event_type in additions else -entry.quantity
            for entry in item.ledger_entries
            if entry.bucket == bucket
        )

    @classmethod
    def _plan_item(
        cls,
        db: Session,
        identity: AuthenticatedIdentity,
        item_id: uuid.UUID,
        *,
        patient_id: uuid.UUID,
        service_id: uuid.UUID,
        starts_at: datetime,
    ) -> tuple[PatientPlanContractItem, str]:
        item = PatientPlanContractRepository.get_item_by_id(
            db,
            identity.company.id,
            item_id,
            for_update=True,
        )
        if item is None:
            raise AppointmentReferenceError("Item de plano não encontrado.")
        contract = item.contract
        appointment_date = starts_at.astimezone(
            ZoneInfo(normalize_iana_timezone(identity.company.timezone))
        ).date()
        if contract.status != "ACTIVE":
            raise AppointmentReferenceError("O contrato do plano não está ativo.")
        if contract.patient_id != patient_id:
            raise AppointmentReferenceError(
                "O plano selecionado não pertence ao paciente."
            )
        if item.service_id != service_id:
            raise AppointmentReferenceError(
                "O serviço agendado não pertence ao item do plano."
            )
        if not contract.starts_on <= appointment_date <= contract.expires_on:
            raise AppointmentReferenceError(
                "A data do agendamento está fora da vigência do plano."
            )
        if cls._available_sessions(item, "PAID") > 0:
            return item, "PAID"
        if cls._available_sessions(item, "COURTESY") > 0:
            return item, "COURTESY"
        raise AppointmentLifecycleError(
            "O paciente não possui sessões disponíveis neste plano."
        )

    @staticmethod
    def _ledger_event(
        db: Session,
        identity: AuthenticatedIdentity,
        appointment: Appointment,
        item: PatientPlanContractItem,
        event_type: str,
        bucket: str,
        reason: str,
    ) -> SessionLedgerEntry:
        entry = SessionLedgerEntry(
            company_id=identity.company.id,
            contract_id=item.contract_id,
            contract_item_id=item.id,
            appointment_id=appointment.id,
            event_type=event_type,
            bucket=bucket,
            quantity=1,
            actor_user_id=identity.user.id,
            reason=reason,
        )
        db.add(entry)
        return entry

    @classmethod
    def _settle_plan_session(
        cls,
        db: Session,
        identity: AuthenticatedIdentity,
        appointment: Appointment,
        target: AppointmentStatus | None,
    ) -> None:
        item = getattr(appointment, "patient_plan_contract_item", None)
        if item is None:
            return
        entries = list(getattr(appointment, "session_ledger_entries", []))
        reservation = next(
            (entry for entry in entries if entry.event_type == "RESERVE"),
            None,
        )
        if reservation is None:
            raise AppointmentLifecycleError(
                "A reserva da sessão do plano não foi encontrada."
            )
        event_types = {entry.event_type for entry in entries}
        if target is AppointmentStatus.COMPLETED:
            if "CONSUME" in event_types:
                return
            if "RELEASE" not in event_types:
                cls._ledger_event(
                    db,
                    identity,
                    appointment,
                    item,
                    "RELEASE",
                    reservation.bucket,
                    "Liberação técnica da reserva para consumo",
                )
            cls._ledger_event(
                db,
                identity,
                appointment,
                item,
                "CONSUME",
                reservation.bucket,
                "Sessão consumida no atendimento concluído",
            )
        elif target in {AppointmentStatus.CANCELED, AppointmentStatus.NO_SHOW}:
            if "RELEASE" not in event_types and "CONSUME" not in event_types:
                cls._ledger_event(
                    db,
                    identity,
                    appointment,
                    item,
                    "RELEASE",
                    reservation.bucket,
                    "Sessão devolvida pelo encerramento do agendamento",
                )
        elif target is None and "CONSUME" in event_types and "RESTORE" not in event_types:
            cls._ledger_event(
                db,
                identity,
                appointment,
                item,
                "RESTORE",
                reservation.bucket,
                "Sessão restaurada pela exclusão auditada do atendimento",
            )
        elif target is None and "RELEASE" not in event_types:
            cls._ledger_event(
                db,
                identity,
                appointment,
                item,
                "RELEASE",
                reservation.bucket,
                "Sessão devolvida pela exclusão auditada do agendamento",
            )

    @staticmethod
    def _own_professional_id(
        db: Session,
        identity: AuthenticatedIdentity,
    ) -> uuid.UUID | None:
        if identity.role is not UserRole.PROFESSIONAL:
            return None
        professional = ProfessionalRepository.get_by_user_id(
            db,
            identity.company.id,
            identity.user.id,
        )
        if professional is None or not professional.is_active or professional.deleted_at is not None:
            raise AppointmentNotFoundError
        return professional.id

    @classmethod
    def _enforce_scope(
        cls,
        db: Session,
        identity: AuthenticatedIdentity,
        appointment: Appointment,
    ) -> None:
        own_id = cls._own_professional_id(db, identity)
        if own_id is not None and appointment.clinical_professional_id != own_id:
            raise AppointmentNotFoundError

    @staticmethod
    def _appointment(
        db: Session,
        identity: AuthenticatedIdentity,
        appointment_id: uuid.UUID,
        *,
        lock: bool = False,
    ) -> Appointment:
        appointment = AppointmentRepository.get_by_id(
            db,
            identity.company.id,
            appointment_id,
            for_update=lock,
        )
        if appointment is None:
            raise AppointmentNotFoundError
        AppointmentDomain._enforce_scope(db, identity, appointment)
        return appointment

    @staticmethod
    def _references(
        db: Session,
        identity: AuthenticatedIdentity,
        *,
        patient_id: uuid.UUID,
        professional_id: uuid.UUID,
        service_id: uuid.UUID,
        lead_id: uuid.UUID | None,
    ):
        company_id = identity.company.id
        patient = PatientRepository.get_by_id(db, company_id, patient_id)
        professional = ProfessionalRepository.get_by_id(
            db, company_id, professional_id
        )
        service = ServiceRepository.get_by_id(db, company_id, service_id)
        lead = (
            LeadRepository.get_by_id(db, company_id, lead_id)
            if lead_id is not None
            else None
        )
        if patient is None or not patient.is_active:
            raise AppointmentReferenceError("Paciente inválido ou inativo.")
        if professional is None or not professional.is_active:
            raise AppointmentReferenceError("Profissional inválido ou inativo.")
        if service is None or not service.is_active:
            raise AppointmentReferenceError("Serviço inválido ou inativo.")
        if lead_id is not None and lead is None:
            raise AppointmentReferenceError("Lead inválido.")
        if lead is not None and lead.patient_id not in (None, patient.id):
            raise AppointmentReferenceError(
                "O Lead informado está vinculado a outro paciente."
            )
        return patient, professional, service

    @staticmethod
    def _ensure_schedule(
        db: Session,
        identity: AuthenticatedIdentity,
        professional,
        starts_at: datetime,
        ends_at: datetime,
        *,
        exclude_id: uuid.UUID | None = None,
    ) -> None:
        zone = ZoneInfo(identity.company.timezone)
        local_start = starts_at.astimezone(zone).date()
        local_end = ends_at.astimezone(zone).date()
        weekly = ProfessionalAvailabilityRepository.list_weekly(
            db, identity.company.id, professional.id
        )
        exceptions = ProfessionalAvailabilityRepository.list_exceptions_between(
            db,
            identity.company.id,
            professional.id,
            local_start,
            local_end,
        )
        if not interval_is_effectively_available(
            starts_at,
            ends_at,
            identity.company.timezone,
            weekly,
            exceptions,
            professional_active=professional.is_active,
        ):
            raise AppointmentAvailabilityError(
                "O horário está fora da disponibilidade do profissional."
            )
        if AppointmentRepository.find_overlap(
            db,
            identity.company.id,
            professional.id,
            starts_at=starts_at,
            ends_at=ends_at,
            exclude_appointment_id=exclude_id,
        ) is not None:
            raise AppointmentConflictError

    @staticmethod
    def _commit(db: Session, appointment: Appointment) -> Appointment:
        try:
            db.commit()
            db.refresh(appointment)
            return appointment
        except IntegrityError as error:
            db.rollback()
            constraint = getattr(
                getattr(error.orig, "diag", None),
                "constraint_name",
                None,
            )
            if constraint == "ex_appointments_professional_schedule_overlap":
                raise AppointmentConflictError from error
            raise AppointmentPersistenceError from error
        except SQLAlchemyError as error:
            db.rollback()
            raise AppointmentPersistenceError from error

    @staticmethod
    def _audit(
        db: Session,
        identity: AuthenticatedIdentity,
        appointment: Appointment,
        action: str,
        details: dict[str, object],
    ) -> None:
        AuditLogRepository.add(
            db,
            company_id=identity.company.id,
            actor_user_id=identity.user.id,
            target_type="APPOINTMENT",
            target_id=appointment.id,
            action=action,
            details=details,
        )

    @classmethod
    def create(
        cls,
        db: Session,
        identity: AuthenticatedIdentity,
        data: AppointmentCreate,
    ) -> Appointment:
        _, professional, service = cls._references(
            db,
            identity,
            patient_id=data.patient_id,
            professional_id=data.professional_id,
            service_id=data.service_id,
            lead_id=data.lead_id,
        )
        starts_at = resolve_company_civil_datetime(
            data.starts_at, identity.company.timezone
        )
        ends_at = starts_at + timedelta(minutes=service.duration_minutes)
        plan_item = None
        plan_bucket = None
        if data.patient_plan_contract_item_id is not None:
            plan_item, plan_bucket = cls._plan_item(
                db,
                identity,
                data.patient_plan_contract_item_id,
                patient_id=data.patient_id,
                service_id=data.service_id,
                starts_at=starts_at,
            )
        cls._ensure_schedule(db, identity, professional, starts_at, ends_at)
        appointment = Appointment(
            company_id=identity.company.id,
            patient_id=data.patient_id,
            clinical_professional_id=data.professional_id,
            professional_id=None,
            service_id=data.service_id,
            patient_plan_contract_item_id=(plan_item.id if plan_item else None),
            lead_id=data.lead_id,
            service_name_snapshot=service.name,
            service_duration_minutes_snapshot=service.duration_minutes,
            service_price_snapshot=service.price,
            title=service.name,
            description=None,
            starts_at=starts_at,
            ends_at=ends_at,
            status=AppointmentStatus.SCHEDULED.value,
            notes=data.notes,
        )
        try:
            AppointmentRepository.add(db, appointment)
            if plan_item is not None and plan_bucket is not None:
                cls._ledger_event(
                    db,
                    identity,
                    appointment,
                    plan_item,
                    "RESERVE",
                    plan_bucket,
                    "Sessão reservada pelo agendamento",
                )
            cls._audit(
                db,
                identity,
                appointment,
                "APPOINTMENT_CREATED",
                {"status": AppointmentStatus.SCHEDULED.value},
            )
        except IntegrityError as error:
            db.rollback()
            constraint = getattr(
                getattr(error.orig, "diag", None),
                "constraint_name",
                None,
            )
            if constraint == "ex_appointments_professional_schedule_overlap":
                raise AppointmentConflictError from error
            raise AppointmentPersistenceError from error
        except SQLAlchemyError as error:
            db.rollback()
            raise AppointmentPersistenceError from error
        return cls._commit(db, appointment)

    @classmethod
    def detail(
        cls,
        db: Session,
        identity: AuthenticatedIdentity,
        appointment_id: uuid.UUID,
    ) -> Appointment:
        return cls._appointment(db, identity, appointment_id)

    @classmethod
    def list(
        cls,
        db: Session,
        identity: AuthenticatedIdentity,
        **filters,
    ) -> AppointmentListResponse:
        page = filters["page"]
        page_size = filters["page_size"]
        own_id = cls._own_professional_id(db, identity)
        if own_id is not None:
            filters["professional_id"] = own_id
        items, total = AppointmentRepository.list_by_company(
            db, identity.company.id, **filters
        )
        return AppointmentListResponse(
            items=[AppointmentResponse.model_validate(item) for item in items],
            total=total,
            page=page,
            page_size=page_size,
        )

    @classmethod
    def transition(
        cls,
        db: Session,
        identity: AuthenticatedIdentity,
        appointment_id: uuid.UUID,
        target: AppointmentStatus,
    ) -> Appointment:
        appointment = cls._appointment(db, identity, appointment_id, lock=True)
        current = AppointmentStatus(appointment.status)
        require_status_transition(current, target)

        cls._settle_plan_session(db, identity, appointment, target)

        if (
            target is AppointmentStatus.COMPLETED
            and getattr(appointment, "patient_plan_contract_item_id", None) is None
            and appointment.service_price_snapshot > 0
            and FinancialRepository.get_active_income_by_appointment(
                db,
                identity.company.id,
                appointment.id,
            )
            is None
        ):
            due_date = appointment.ends_at.astimezone(
                ZoneInfo(normalize_iana_timezone(identity.company.timezone))
            ).date()
            transaction = Transaction(
                company_id=identity.company.id,
                lead_id=appointment.lead_id,
                appointment_id=appointment.id,
                description=f"Atendimento — {appointment.service_name_snapshot}",
                transaction_type=TransactionType.INCOME.value,
                category="Atendimento",
                amount=appointment.service_price_snapshot,
                due_date=due_date,
                paid_date=None,
                status=TransactionStatus.PENDING.value,
                payment_method=None,
                notes=None,
            )
            FinancialRepository.add(db, transaction)
            if hasattr(appointment, "transactions"):
                appointment.transactions.append(transaction)
            AuditLogRepository.add(
                db,
                company_id=identity.company.id,
                actor_user_id=identity.user.id,
                target_type="FINANCIAL_TRANSACTION",
                target_id=transaction.id,
                action="FINANCIAL_TRANSACTION_CREATED",
                details={"type": TransactionType.INCOME.value, "status": "PENDING"},
            )
        appointment.status = target.value
        action = (
            "APPOINTMENT_CANCELED"
            if target is AppointmentStatus.CANCELED
            else "APPOINTMENT_STATUS_CHANGED"
        )
        cls._audit(
            db,
            identity,
            appointment,
            action,
            {"from": current.value, "to": target.value},
        )
        return cls._commit(db, appointment)

    @classmethod
    def reschedule(
        cls,
        db: Session,
        identity: AuthenticatedIdentity,
        appointment_id: uuid.UUID,
        data: AppointmentReschedule,
    ) -> Appointment:
        appointment = cls._appointment(db, identity, appointment_id, lock=True)
        status = AppointmentStatus(appointment.status)
        require_mutable_fields(status, {"duration_minutes"})
        duration = (
            data.duration_minutes
            or appointment.service_duration_minutes_snapshot
        )
        starts_at = resolve_company_civil_datetime(
            data.starts_at,
            identity.company.timezone,
        )
        plan_item = getattr(appointment, "patient_plan_contract_item", None)
        if plan_item is not None:
            appointment_date = starts_at.astimezone(
                ZoneInfo(normalize_iana_timezone(identity.company.timezone))
            ).date()
            if not (
                plan_item.contract.starts_on
                <= appointment_date
                <= plan_item.contract.expires_on
            ):
                raise AppointmentReferenceError(
                    "A nova data está fora da vigência do plano."
                )
        ends_at = starts_at + timedelta(minutes=duration)
        professional = ProfessionalRepository.get_by_id(
            db, identity.company.id, appointment.clinical_professional_id
        )
        if professional is None or not professional.is_active:
            raise AppointmentReferenceError("Profissional inválido ou inativo.")
        cls._ensure_schedule(
            db,
            identity,
            professional,
            starts_at,
            ends_at,
            exclude_id=appointment.id,
        )
        if appointment.starts_at == starts_at and appointment.ends_at == ends_at:
            return appointment
        duration_changed = duration != appointment.service_duration_minutes_snapshot
        appointment.starts_at = starts_at
        appointment.ends_at = ends_at
        appointment.service_duration_minutes_snapshot = duration
        cls._audit(
            db,
            identity,
            appointment,
            "APPOINTMENT_RESCHEDULED",
            {"duration_changed": duration_changed},
        )
        return cls._commit(db, appointment)

    @classmethod
    def update(
        cls,
        db: Session,
        identity: AuthenticatedIdentity,
        appointment_id: uuid.UUID,
        data: AppointmentUpdate,
    ) -> Appointment:
        appointment = cls._appointment(db, identity, appointment_id, lock=True)
        status = AppointmentStatus(appointment.status)
        changes = data.model_dump(exclude_unset=True)
        if (
            getattr(appointment, "patient_plan_contract_item_id", None) is not None
            and {"patient_id", "service_id"}.intersection(changes)
        ):
            raise AppointmentLifecycleError(
                "Paciente e serviço não podem ser alterados em uma sessão vinculada a plano."
            )
        is_master_note_correction = (
            identity.role in {UserRole.OWNER, UserRole.ADMIN}
            and set(changes) == {"notes"}
        )
        if not is_master_note_correction:
            require_mutable_fields(status, changes)

        if set(changes) == {"notes"}:
            if appointment.notes == changes["notes"]:
                return appointment
            appointment.notes = changes["notes"]
            cls._audit(
                db,
                identity,
                appointment,
                "APPOINTMENT_UPDATED",
                {"fields": ["notes"]},
            )
            return cls._commit(db, appointment)

        patient_id = changes.get("patient_id", appointment.patient_id)
        professional_id = changes.get(
            "professional_id", appointment.clinical_professional_id
        )
        service_id = changes.get("service_id", appointment.service_id)
        _, professional, service = cls._references(
            db,
            identity,
            patient_id=patient_id,
            professional_id=professional_id,
            service_id=service_id,
            lead_id=appointment.lead_id,
        )

        service_changed = service_id != appointment.service_id
        default_duration = (
            service.duration_minutes
            if service_changed
            else appointment.service_duration_minutes_snapshot
        )
        duration = changes.get("duration_minutes", default_duration)
        ends_at = appointment.starts_at + timedelta(minutes=duration)
        schedule_changed = any(
            field in changes
            for field in ("professional_id", "service_id", "duration_minutes")
        )
        if schedule_changed:
            cls._ensure_schedule(
                db,
                identity,
                professional,
                appointment.starts_at,
                ends_at,
                exclude_id=appointment.id,
            )

        changed: list[str] = []
        values = {
            "patient_id": patient_id,
            "clinical_professional_id": professional_id,
            "service_id": service_id,
            "notes": changes.get("notes", appointment.notes),
            "ends_at": ends_at,
            "service_duration_minutes_snapshot": duration,
            "service_name_snapshot": (
                service.name if service_changed else appointment.service_name_snapshot
            ),
            "service_price_snapshot": (
                service.price if service_changed else appointment.service_price_snapshot
            ),
            "title": service.name if service_changed else appointment.title,
        }
        for field, value in values.items():
            if getattr(appointment, field) != value:
                setattr(appointment, field, value)
                changed.append(field)
        if not changed:
            return appointment
        public_fields = sorted(
            {
                "professional_id" if field == "clinical_professional_id" else field
                for field in changed
                if field not in {"title"}
            }
        )
        cls._audit(
            db,
            identity,
            appointment,
            "APPOINTMENT_UPDATED",
            {"fields": public_fields},
        )
        return cls._commit(db, appointment)

    @classmethod
    def soft_delete(
        cls,
        db: Session,
        identity: AuthenticatedIdentity,
        appointment_id: uuid.UUID,
        data: AppointmentDelete,
    ) -> None:
        if identity.role not in {UserRole.OWNER, UserRole.ADMIN}:
            raise AppointmentLifecycleError(
                "Somente usuários master podem remover agendamentos."
            )
        appointment = cls._appointment(db, identity, appointment_id, lock=True)
        cls._settle_plan_session(db, identity, appointment, None)
        appointment.deleted_at = datetime.now(UTC)
        cls._audit(
            db,
            identity,
            appointment,
            "APPOINTMENT_SOFT_DELETED",
            {"status": appointment.status, "reason": data.reason},
        )
        try:
            db.commit()
        except SQLAlchemyError as error:
            db.rollback()
            raise AppointmentPersistenceError from error

from datetime import UTC, datetime
from decimal import Decimal
from types import SimpleNamespace
from unittest.mock import MagicMock
from uuid import uuid4

from app.repositories.appointment import AppointmentRepository
from app.repositories.audit_log import AuditLogRepository
from app.repositories.financial import FinancialRepository
from app.core.identity import UserRole
from app.schemas.appointment import (
    AppointmentCreate,
    AppointmentStatus,
    AppointmentUpdate,
)
from app.services.appointment import AppointmentDomain
from app.services.audit_log import sanitize_audit_metadata


def identity() -> SimpleNamespace:
    return SimpleNamespace(
        company=SimpleNamespace(id=uuid4(), timezone="America/Sao_Paulo"),
        user=SimpleNamespace(id=uuid4()),
        role=UserRole.OWNER,
    )


def test_create_derives_snapshots_duration_tenant_and_audit(monkeypatch) -> None:
    current_identity = identity()
    db = MagicMock()
    patient = SimpleNamespace(id=uuid4(), is_active=True)
    professional = SimpleNamespace(id=uuid4(), is_active=True)
    service = SimpleNamespace(
        id=uuid4(),
        is_active=True,
        name="Consulta inicial",
        duration_minutes=45,
        price=Decimal("150.00"),
    )
    data = AppointmentCreate(
        patient_id=patient.id,
        professional_id=professional.id,
        service_id=service.id,
        starts_at={"local_datetime": datetime(2026, 9, 15, 9)},
        notes="Retorno",
    )
    monkeypatch.setattr(
        AppointmentDomain,
        "_references",
        MagicMock(return_value=(patient, professional, service)),
    )
    ensure_schedule = MagicMock()
    monkeypatch.setattr(AppointmentDomain, "_ensure_schedule", ensure_schedule)
    add = MagicMock(side_effect=lambda _db, item: item)
    audit = MagicMock()
    monkeypatch.setattr(AppointmentRepository, "add", add)
    monkeypatch.setattr(AuditLogRepository, "add", audit)

    result = AppointmentDomain.create(db, current_identity, data)

    assert result.company_id == current_identity.company.id
    assert result.professional_id is None
    assert result.clinical_professional_id == professional.id
    assert result.service_name_snapshot == service.name
    assert result.service_duration_minutes_snapshot == 45
    assert result.service_price_snapshot == Decimal("150.00")
    assert (result.ends_at - result.starts_at).total_seconds() == 45 * 60
    assert result.status == AppointmentStatus.SCHEDULED.value
    ensure_schedule.assert_called_once()
    assert audit.call_args.kwargs["action"] == "APPOINTMENT_CREATED"
    assert audit.call_args.kwargs["details"] == {"status": "SCHEDULED"}
    db.commit.assert_called_once_with()
    db.refresh.assert_called_once_with(result)


def test_cancel_uses_specific_audit_event(monkeypatch) -> None:
    current_identity = identity()
    db = MagicMock()
    appointment = SimpleNamespace(id=uuid4(), status="CONFIRMED")
    monkeypatch.setattr(
        AppointmentRepository,
        "get_by_id",
        MagicMock(return_value=appointment),
    )
    audit = MagicMock()
    monkeypatch.setattr(AuditLogRepository, "add", audit)

    result = AppointmentDomain.transition(
        db,
        current_identity,
        appointment.id,
        AppointmentStatus.CANCELED,
    )

    assert result.status == "CANCELED"
    assert audit.call_args.kwargs["action"] == "APPOINTMENT_CANCELED"
    assert audit.call_args.kwargs["details"] == {
        "from": "CONFIRMED",
        "to": "CANCELED",
    }


def test_complete_creates_pending_receivable_in_same_transaction(monkeypatch) -> None:
    current_identity = identity()
    appointment_id = uuid4()
    lead_id = uuid4()
    appointment = SimpleNamespace(
        id=appointment_id,
        company_id=current_identity.company.id,
        lead_id=lead_id,
        status="IN_PROGRESS",
        service_name_snapshot="Consulta inicial",
        service_price_snapshot=Decimal("150.00"),
        ends_at=datetime(2026, 9, 15, 15, 0, tzinfo=UTC),
    )
    monkeypatch.setattr(
        AppointmentRepository,
        "get_by_id",
        MagicMock(return_value=appointment),
    )
    monkeypatch.setattr(
        FinancialRepository,
        "get_active_income_by_appointment",
        MagicMock(return_value=None),
    )
    created = []

    def add(_db, transaction):
        transaction.id = uuid4()
        created.append(transaction)
        return transaction

    monkeypatch.setattr(FinancialRepository, "add", add)
    audit = MagicMock()
    monkeypatch.setattr(AuditLogRepository, "add", audit)
    db = MagicMock()

    result = AppointmentDomain.transition(
        db,
        current_identity,
        appointment_id,
        AppointmentStatus.COMPLETED,
    )

    assert result.status == "COMPLETED"
    assert len(created) == 1
    receivable = created[0]
    assert receivable.company_id == current_identity.company.id
    assert receivable.appointment_id == appointment_id
    assert receivable.lead_id == lead_id
    assert receivable.amount == Decimal("150.00")
    assert receivable.due_date.isoformat() == "2026-09-15"
    assert receivable.status == "PENDING"
    assert audit.call_count == 2
    assert [call.kwargs["action"] for call in audit.call_args_list] == [
        "FINANCIAL_TRANSACTION_CREATED",
        "APPOINTMENT_STATUS_CHANGED",
    ]
    db.commit.assert_called_once_with()


def test_complete_free_service_does_not_create_receivable(monkeypatch) -> None:
    current_identity = identity()
    appointment = SimpleNamespace(
        id=uuid4(),
        company_id=current_identity.company.id,
        lead_id=None,
        status="IN_PROGRESS",
        service_name_snapshot="Retorno gratuito",
        service_price_snapshot=Decimal("0.00"),
        ends_at=datetime(2026, 9, 15, 15, 0, tzinfo=UTC),
    )
    monkeypatch.setattr(
        AppointmentRepository,
        "get_by_id",
        MagicMock(return_value=appointment),
    )
    financial_add = MagicMock()
    monkeypatch.setattr(FinancialRepository, "add", financial_add)
    monkeypatch.setattr(AuditLogRepository, "add", MagicMock())

    result = AppointmentDomain.transition(
        MagicMock(),
        current_identity,
        appointment.id,
        AppointmentStatus.COMPLETED,
    )

    assert result.status == "COMPLETED"
    financial_add.assert_not_called()


def test_appointment_audit_metadata_is_strictly_allowlisted() -> None:
    assert sanitize_audit_metadata(
        "APPOINTMENT_UPDATED",
        {"fields": ["service_id"], "notes": "não registrar"},
    ) == {"fields": ["service_id"]}
    assert sanitize_audit_metadata(
        "APPOINTMENT_RESCHEDULED",
        {"duration_changed": True, "starts_at": "não registrar"},
    ) == {"duration_changed": True}


def test_notes_only_update_does_not_revalidate_historical_references(
    monkeypatch,
) -> None:
    current_identity = identity()
    db = MagicMock()
    appointment = SimpleNamespace(
        id=uuid4(),
        status="IN_PROGRESS",
        notes="Antes",
    )
    monkeypatch.setattr(
        AppointmentRepository,
        "get_by_id",
        MagicMock(return_value=appointment),
    )
    references = MagicMock()
    monkeypatch.setattr(AppointmentDomain, "_references", references)
    monkeypatch.setattr(AuditLogRepository, "add", MagicMock())

    result = AppointmentDomain.update(
        db,
        current_identity,
        appointment.id,
        AppointmentUpdate(notes="Depois"),
    )

    assert result.notes == "Depois"
    references.assert_not_called()

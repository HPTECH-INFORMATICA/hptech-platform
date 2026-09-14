from datetime import UTC, datetime
from decimal import Decimal
from types import SimpleNamespace
from uuid import uuid4

import pytest
from pydantic import ValidationError

from app.schemas.appointment import (
    AppointmentCivilDateTime,
    AppointmentCreate,
    AppointmentResponse,
    AppointmentStatus,
    AppointmentUpdate,
)
from app.services.appointment import (
    AppointmentLifecycleError,
    AppointmentTimeError,
    require_mutable_fields,
    require_status_transition,
    resolve_company_civil_datetime,
)


def civil(
    local_datetime: datetime,
    offset: int | None = None,
) -> AppointmentCivilDateTime:
    return AppointmentCivilDateTime(
        local_datetime=local_datetime,
        utc_offset_minutes=offset,
    )


def test_create_contract_is_civil_and_rejects_backend_owned_fields() -> None:
    payload = {
        "patient_id": uuid4(),
        "professional_id": uuid4(),
        "service_id": uuid4(),
        "starts_at": {"local_datetime": "2026-09-14T09:00:00"},
        "notes": "  Retorno operacional  ",
    }

    result = AppointmentCreate.model_validate(payload)

    assert result.notes == "Retorno operacional"
    with pytest.raises(ValidationError):
        AppointmentCreate.model_validate({**payload, "company_id": uuid4()})
    with pytest.raises(ValidationError):
        AppointmentCreate.model_validate({**payload, "status": "COMPLETED"})
    with pytest.raises(ValidationError):
        AppointmentCreate.model_validate(
            {**payload, "ends_at": "2026-09-14T10:00:00Z"}
        )


def test_civil_input_rejects_aware_datetime() -> None:
    with pytest.raises(ValidationError):
        AppointmentCivilDateTime(
            local_datetime=datetime(2026, 9, 14, 9, tzinfo=UTC)
        )


def test_company_timezone_resolves_unambiguous_civil_time() -> None:
    instant = resolve_company_civil_datetime(
        civil(datetime(2026, 9, 14, 9)),
        "America/Sao_Paulo",
    )

    assert instant == datetime(2026, 9, 14, 12, tzinfo=UTC)


def test_company_timezone_rejects_nonexistent_dst_time() -> None:
    with pytest.raises(AppointmentTimeError, match="não existem"):
        resolve_company_civil_datetime(
            civil(datetime(2024, 3, 10, 2, 30)),
            "America/New_York",
        )


def test_company_timezone_requires_and_validates_ambiguous_dst_offset() -> None:
    local_datetime = datetime(2024, 11, 3, 1, 30)

    with pytest.raises(AppointmentTimeError, match="ambíguas"):
        resolve_company_civil_datetime(
            civil(local_datetime),
            "America/New_York",
        )
    assert resolve_company_civil_datetime(
        civil(local_datetime, -240),
        "America/New_York",
    ) == datetime(2024, 11, 3, 5, 30, tzinfo=UTC)
    assert resolve_company_civil_datetime(
        civil(local_datetime, -300),
        "America/New_York",
    ) == datetime(2024, 11, 3, 6, 30, tzinfo=UTC)
    with pytest.raises(AppointmentTimeError, match="não corresponde"):
        resolve_company_civil_datetime(
            civil(local_datetime, -180),
            "America/New_York",
        )


def test_lifecycle_allows_only_frozen_transitions() -> None:
    require_status_transition(
        AppointmentStatus.SCHEDULED,
        AppointmentStatus.CONFIRMED,
    )
    require_status_transition(
        AppointmentStatus.CONFIRMED,
        AppointmentStatus.IN_PROGRESS,
    )
    require_status_transition(
        AppointmentStatus.IN_PROGRESS,
        AppointmentStatus.COMPLETED,
    )

    with pytest.raises(AppointmentLifecycleError):
        require_status_transition(
            AppointmentStatus.SCHEDULED,
            AppointmentStatus.COMPLETED,
        )
    with pytest.raises(AppointmentLifecycleError):
        require_status_transition(
            AppointmentStatus.COMPLETED,
            AppointmentStatus.SCHEDULED,
        )


def test_mutability_follows_lifecycle_contract() -> None:
    require_mutable_fields(
        AppointmentStatus.SCHEDULED,
        {
            "patient_id",
            "professional_id",
            "service_id",
            "duration_minutes",
            "notes",
        },
    )
    require_mutable_fields(AppointmentStatus.IN_PROGRESS, {"notes"})

    with pytest.raises(AppointmentLifecycleError):
        require_mutable_fields(AppointmentStatus.IN_PROGRESS, {"service_id"})
    with pytest.raises(AppointmentLifecycleError):
        require_mutable_fields(AppointmentStatus.CANCELED, {"notes"})


def test_update_is_non_empty_and_status_is_not_patchable() -> None:
    with pytest.raises(ValidationError):
        AppointmentUpdate()
    with pytest.raises(ValidationError):
        AppointmentUpdate.model_validate({"patient_id": None})
    with pytest.raises(ValidationError):
        AppointmentUpdate.model_validate({"status": "CONFIRMED"})

    assert AppointmentUpdate(notes="  ").notes is None


def test_response_exposes_clinical_professional_as_professional_id() -> None:
    now = datetime.now(UTC)
    clinical_professional_id = uuid4()
    source = SimpleNamespace(
        id=uuid4(),
        patient_id=uuid4(),
        clinical_professional_id=clinical_professional_id,
        professional_id=uuid4(),
        service_id=uuid4(),
        lead_id=None,
        service_name_snapshot="Consulta",
        service_duration_minutes_snapshot=60,
        service_price_snapshot=Decimal("120.00"),
        starts_at=now,
        ends_at=now,
        status="SCHEDULED",
        notes=None,
        created_at=now,
        updated_at=now,
    )

    response = AppointmentResponse.model_validate(source)

    assert response.professional_id == clinical_professional_id
    assert "clinical_professional_id" not in response.model_dump()

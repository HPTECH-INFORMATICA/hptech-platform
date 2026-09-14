from collections.abc import Iterable
from datetime import UTC, datetime
from zoneinfo import ZoneInfo

from app.core.timezones import normalize_iana_timezone
from app.schemas.appointment import AppointmentCivilDateTime, AppointmentStatus


class AppointmentTimeError(ValueError):
    pass


class AppointmentLifecycleError(ValueError):
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

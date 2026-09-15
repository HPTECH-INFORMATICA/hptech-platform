from datetime import UTC, date, datetime, time
from types import SimpleNamespace

import pytest

from app.services.effective_availability import (
    effective_civil_intervals,
    interval_is_effectively_available,
)


def weekly(weekday: int, start: time, end: time) -> SimpleNamespace:
    return SimpleNamespace(weekday=weekday, start_time=start, end_time=end)


def exception(
    local_date: date,
    kind: str,
    start: time | None,
    end: time | None,
) -> SimpleNamespace:
    return SimpleNamespace(
        local_date=local_date,
        kind=kind,
        start_time=start,
        end_time=end,
    )


def test_effective_contract_adds_available_and_subtracts_unavailable() -> None:
    day = date(2026, 9, 14)
    result = effective_civil_intervals(
        day,
        [weekly(0, time(9), time(17))],
        [
            exception(day, "AVAILABLE", time(8), time(9)),
            exception(day, "UNAVAILABLE", time(12), time(13)),
        ],
        professional_active=True,
    )

    assert [(item.starts_at.time(), item.ends_at.time()) for item in result] == [
        (time(8), time(12)),
        (time(13), time(17)),
    ]


def test_full_day_unavailable_and_inactive_professional_are_fail_closed() -> None:
    day = date(2026, 9, 14)
    weekly_rules = [weekly(0, time(9), time(17))]

    assert effective_civil_intervals(
        day,
        weekly_rules,
        [exception(day, "UNAVAILABLE", None, None)],
        professional_active=True,
    ) == []
    assert effective_civil_intervals(
        day,
        weekly_rules,
        [],
        professional_active=False,
    ) == []


def test_interval_uses_company_timezone_and_half_open_boundaries() -> None:
    rules = [weekly(0, time(9), time(10))]

    assert interval_is_effectively_available(
        datetime(2026, 9, 14, 12, tzinfo=UTC),
        datetime(2026, 9, 14, 13, tzinfo=UTC),
        "America/Sao_Paulo",
        rules,
        [],
        professional_active=True,
    )
    assert not interval_is_effectively_available(
        datetime(2026, 9, 14, 13, tzinfo=UTC),
        datetime(2026, 9, 14, 14, tzinfo=UTC),
        "America/Sao_Paulo",
        rules,
        [],
        professional_active=True,
    )


def test_interval_rejects_invalid_instants() -> None:
    with pytest.raises(ValueError, match="timezone"):
        interval_is_effectively_available(
            datetime(2026, 9, 14, 9),
            datetime(2026, 9, 14, 10),
            "America/Sao_Paulo",
            [],
            [],
            professional_active=True,
        )

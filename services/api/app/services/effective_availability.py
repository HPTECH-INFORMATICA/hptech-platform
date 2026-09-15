from dataclasses import dataclass
from datetime import date, datetime, time, timedelta
from typing import Protocol
from zoneinfo import ZoneInfo

from app.core.timezones import normalize_iana_timezone


class WeeklyAvailabilityLike(Protocol):
    weekday: int
    start_time: time
    end_time: time


class AvailabilityExceptionLike(Protocol):
    local_date: date
    kind: str
    start_time: time | None
    end_time: time | None


@dataclass(frozen=True, order=True)
class CivilInterval:
    starts_at: datetime
    ends_at: datetime


def _merge(intervals: list[CivilInterval]) -> list[CivilInterval]:
    merged: list[CivilInterval] = []
    for interval in sorted(intervals):
        if not merged or interval.starts_at > merged[-1].ends_at:
            merged.append(interval)
            continue
        previous = merged[-1]
        merged[-1] = CivilInterval(
            previous.starts_at,
            max(previous.ends_at, interval.ends_at),
        )
    return merged


def _subtract(
    available: list[CivilInterval],
    blocked: CivilInterval,
) -> list[CivilInterval]:
    result: list[CivilInterval] = []
    for interval in available:
        if blocked.ends_at <= interval.starts_at or blocked.starts_at >= interval.ends_at:
            result.append(interval)
            continue
        if interval.starts_at < blocked.starts_at:
            result.append(CivilInterval(interval.starts_at, blocked.starts_at))
        if blocked.ends_at < interval.ends_at:
            result.append(CivilInterval(blocked.ends_at, interval.ends_at))
    return result


def effective_civil_intervals(
    local_date: date,
    weekly: list[WeeklyAvailabilityLike],
    exceptions: list[AvailabilityExceptionLike],
    *,
    professional_active: bool,
) -> list[CivilInterval]:
    if not professional_active:
        return []

    available = [
        CivilInterval(
            datetime.combine(local_date, item.start_time),
            datetime.combine(local_date, item.end_time),
        )
        for item in weekly
        if item.weekday == local_date.weekday()
    ]
    day_exceptions = [
        item for item in exceptions if item.local_date == local_date
    ]
    for item in day_exceptions:
        if item.kind == "AVAILABLE" and item.start_time and item.end_time:
            available.append(
                CivilInterval(
                    datetime.combine(local_date, item.start_time),
                    datetime.combine(local_date, item.end_time),
                )
            )

    available = _merge(available)
    for item in day_exceptions:
        if item.kind != "UNAVAILABLE":
            continue
        if item.start_time is None or item.end_time is None:
            return []
        blocked = CivilInterval(
            datetime.combine(local_date, item.start_time),
            datetime.combine(local_date, item.end_time),
        )
        available = _subtract(available, blocked)
    return available


def interval_is_effectively_available(
    starts_at: datetime,
    ends_at: datetime,
    timezone_name: str,
    weekly: list[WeeklyAvailabilityLike],
    exceptions: list[AvailabilityExceptionLike],
    *,
    professional_active: bool,
) -> bool:
    if starts_at.utcoffset() is None or ends_at.utcoffset() is None:
        raise ValueError("Os instantes devem possuir timezone.")
    if starts_at >= ends_at:
        raise ValueError("O instante inicial deve ser anterior ao final.")

    zone = ZoneInfo(normalize_iana_timezone(timezone_name))
    local_start = starts_at.astimezone(zone).replace(tzinfo=None)
    local_end = ends_at.astimezone(zone).replace(tzinfo=None)
    current_date = local_start.date()

    while current_date <= local_end.date():
        day_start = datetime.combine(current_date, time.min)
        next_day = day_start + timedelta(days=1)
        segment_start = max(local_start, day_start)
        segment_end = min(local_end, next_day)
        if segment_start < segment_end:
            intervals = effective_civil_intervals(
                current_date,
                weekly,
                exceptions,
                professional_active=professional_active,
            )
            if not any(
                item.starts_at <= segment_start and segment_end <= item.ends_at
                for item in intervals
            ):
                return False
        current_date += timedelta(days=1)
    return True

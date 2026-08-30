from collections.abc import AsyncIterator
from dataclasses import replace
from datetime import date, datetime, time, timedelta, timezone
from unittest.mock import MagicMock
from uuid import uuid4

import pytest
from httpx import ASGITransport, AsyncClient
from pydantic import ValidationError
from sqlalchemy.exc import SQLAlchemyError

from app.core.identity import (
    AuthenticatedIdentity,
    CompanyStatus,
    Permission,
    PermissionAction,
    PermissionModule,
    UserRole,
)
from app.core.rbac import permissions_for_role
from app.db.session import get_db
from app.dependencies.auth import get_current_user
from app.main import app
from app.models.company import Company
from app.models.professional import Professional
from app.models.professional_availability import (
    ProfessionalAvailabilityException,
    ProfessionalWeeklyAvailability,
)
from app.models.user import User
from app.repositories.audit_log import AuditLogRepository
from app.repositories.professional import ProfessionalRepository
from app.repositories.professional_availability import ProfessionalAvailabilityRepository
from app.schemas.professional_availability import (
    AvailabilityExceptionCreate,
    AvailabilityExceptionKind,
    AvailabilityExceptionUpdate,
    WeeklyAvailabilityUpdate,
)
from app.services.audit_log import sanitize_audit_metadata
from app.services.professional_availability import (
    AvailabilityPersistenceError,
    AvailabilityValidationError,
    ProfessionalAvailabilityDomain,
)


pytestmark = pytest.mark.anyio


def make_identity(role: UserRole = UserRole.OWNER) -> AuthenticatedIdentity:
    now = datetime.now(timezone.utc)
    company = Company(
        id=uuid4(), name="Empresa Exemplo", slug=f"empresa-{uuid4()}",
        status=CompanyStatus.ACTIVE, timezone="America/Sao_Paulo",
        created_at=now, updated_at=now,
    )
    user = User(
        id=uuid4(), company_id=company.id, name="Pessoa Exemplo",
        email=f"{uuid4()}@example.com", password_hash="hash-seguro-de-teste",
        role=role, is_active=True, created_at=now, updated_at=now,
    )
    user.company = company
    return AuthenticatedIdentity(
        user=user, company=company, role=role, permissions=permissions_for_role(role)
    )


def make_professional(identity: AuthenticatedIdentity, **values) -> Professional:
    now = datetime.now(timezone.utc)
    defaults = dict(
        id=uuid4(), company_id=identity.company.id, user_id=None,
        display_name="Profissional Exemplo", is_active=True,
        created_at=now, updated_at=now, deleted_at=None,
    )
    defaults.update(values)
    return Professional(**defaults)


def make_exception(identity: AuthenticatedIdentity, professional_id, **values):
    now = datetime.now(timezone.utc)
    defaults = dict(
        id=uuid4(), company_id=identity.company.id, professional_id=professional_id,
        local_date=date.today() + timedelta(days=2), kind="AVAILABLE",
        start_time=time(9), end_time=time(10), created_at=now, updated_at=now,
    )
    defaults.update(values)
    return ProfessionalAvailabilityException(**defaults)


@pytest.fixture
async def client() -> AsyncIterator[AsyncClient]:
    app.dependency_overrides[get_db] = lambda: MagicMock()
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://testserver") as value:
        yield value
    app.dependency_overrides.clear()


async def test_availability_routes_require_authentication(client: AsyncClient) -> None:
    professional_id = uuid4()
    assert (await client.get(f"/api/v1/professionals/{professional_id}/availability/weekly")).status_code == 401
    assert (await client.get(f"/api/v1/professionals/{professional_id}/availability/exceptions")).status_code == 401


async def test_view_can_read_but_cannot_mutate(client: AsyncClient, monkeypatch: pytest.MonkeyPatch) -> None:
    identity = make_identity(UserRole.VIEWER)
    app.dependency_overrides[get_current_user] = lambda: identity
    monkeypatch.setattr(
        ProfessionalAvailabilityDomain, "get_weekly",
        lambda *_args: {"professional_id": uuid4(), "timezone": "America/Sao_Paulo", "intervals": []},
    )
    professional_id = uuid4()
    assert (await client.get(f"/api/v1/professionals/{professional_id}/availability/weekly")).status_code == 200
    assert (await client.put(f"/api/v1/professionals/{professional_id}/availability/weekly", json={"intervals": []})).status_code == 403


async def test_update_override_allows_mutation(client: AsyncClient, monkeypatch: pytest.MonkeyPatch) -> None:
    identity = make_identity(UserRole.VIEWER)
    identity = replace(identity, permissions=identity.permissions + (
        Permission(PermissionModule.PROFESSIONALS, frozenset({PermissionAction.UPDATE})),
    ))
    app.dependency_overrides[get_current_user] = lambda: identity
    monkeypatch.setattr(
        ProfessionalAvailabilityDomain, "replace_weekly",
        lambda *_args: {"professional_id": _args[2], "timezone": "America/Sao_Paulo", "intervals": []},
    )
    response = await client.put(f"/api/v1/professionals/{uuid4()}/availability/weekly", json={"intervals": []})
    assert response.status_code == 200


@pytest.mark.parametrize("weekday", [-1, 7])
def test_weekday_outside_iso_range_is_invalid(weekday: int) -> None:
    with pytest.raises(ValidationError):
        WeeklyAvailabilityUpdate(intervals=[{"weekday": weekday, "start_time": "09:00", "end_time": "10:00"}])


@pytest.mark.parametrize("start,end", [("09:00", "09:00"), ("10:00", "09:00")])
def test_weekly_empty_or_overnight_interval_is_invalid(start: str, end: str) -> None:
    with pytest.raises(ValidationError):
        WeeklyAvailabilityUpdate(intervals=[{"weekday": 0, "start_time": start, "end_time": end}])


def test_weekly_overlap_is_rejected_and_adjacency_is_allowed() -> None:
    overlapping = WeeklyAvailabilityUpdate(intervals=[
        {"weekday": 0, "start_time": "09:00", "end_time": "12:00"},
        {"weekday": 0, "start_time": "11:00", "end_time": "13:00"},
    ])
    with pytest.raises(AvailabilityValidationError):
        ProfessionalAvailabilityDomain._normalize_weekly(overlapping)
    adjacent = WeeklyAvailabilityUpdate(intervals=[
        {"weekday": 0, "start_time": "09:00", "end_time": "12:00"},
        {"weekday": 0, "start_time": "12:00", "end_time": "13:00"},
    ])
    assert len(ProfessionalAvailabilityDomain._normalize_weekly(adjacent)) == 2


@pytest.mark.parametrize(
    "payload",
    [
        {"local_date": "2099-01-01", "kind": "AVAILABLE"},
        {"local_date": "2099-01-01", "kind": "AVAILABLE", "start_time": "09:00"},
        {"local_date": "2099-01-01", "kind": "UNAVAILABLE", "start_time": "10:00", "end_time": "09:00"},
    ],
)
def test_invalid_exception_time_combinations(payload: dict[str, str]) -> None:
    with pytest.raises(ValidationError):
        AvailabilityExceptionCreate(**payload)


def test_full_day_unavailable_is_valid() -> None:
    data = AvailabilityExceptionCreate(local_date=date(2099, 1, 1), kind="UNAVAILABLE")
    assert data.start_time is None and data.end_time is None


def test_full_day_is_exclusive_and_timed_adjacency_is_allowed() -> None:
    identity = make_identity()
    professional_id = uuid4()
    timed = make_exception(identity, professional_id)
    with pytest.raises(AvailabilityValidationError):
        ProfessionalAvailabilityDomain._validate_exception_set(
            AvailabilityExceptionKind.UNAVAILABLE, None, None, [timed]
        )
    ProfessionalAvailabilityDomain._validate_exception_set(
        AvailabilityExceptionKind.AVAILABLE, time(10), time(11), [timed]
    )


def test_timed_exception_overlap_is_rejected() -> None:
    identity = make_identity()
    existing = make_exception(identity, uuid4(), start_time=time(9), end_time=time(11))
    with pytest.raises(AvailabilityValidationError):
        ProfessionalAvailabilityDomain._validate_exception_set(
            AvailabilityExceptionKind.UNAVAILABLE, time(10), time(12), [existing]
        )


def test_empty_patch_is_invalid() -> None:
    with pytest.raises(ValidationError):
        AvailabilityExceptionUpdate()


def test_company_timezone_defines_today(monkeypatch: pytest.MonkeyPatch) -> None:
    identity = make_identity()
    assert ProfessionalAvailabilityDomain._today(identity) in {date.today(), date.today() + timedelta(days=1)}


def test_weekly_noop_does_not_commit_or_audit(monkeypatch: pytest.MonkeyPatch) -> None:
    identity = make_identity()
    professional = make_professional(identity)
    interval = MagicMock(weekday=0, start_time=time(9), end_time=time(12))
    db = MagicMock()
    monkeypatch.setattr(ProfessionalRepository, "get_by_id", lambda *_args, **_kwargs: professional)
    monkeypatch.setattr(ProfessionalAvailabilityRepository, "list_weekly", lambda *_args: [interval])
    audit = MagicMock()
    monkeypatch.setattr(AuditLogRepository, "add", audit)
    result = ProfessionalAvailabilityDomain.replace_weekly(
        db, identity, professional.id,
        WeeklyAvailabilityUpdate(intervals=[{"weekday": 0, "start_time": "09:00", "end_time": "12:00"}]),
    )
    assert result.intervals[0].weekday == 0
    db.commit.assert_not_called()
    audit.assert_not_called()


def test_past_create_uses_company_civil_date(monkeypatch: pytest.MonkeyPatch) -> None:
    identity = make_identity()
    professional = make_professional(identity)
    monkeypatch.setattr(ProfessionalRepository, "get_by_id", lambda *_args, **_kwargs: professional)
    monkeypatch.setattr(ProfessionalAvailabilityDomain, "_today", lambda *_args: date(2030, 1, 2))
    with pytest.raises(AvailabilityValidationError):
        ProfessionalAvailabilityDomain.create_exception(
            MagicMock(), identity, professional.id,
            AvailabilityExceptionCreate(
                local_date=date(2030, 1, 1), kind="AVAILABLE", start_time=time(9), end_time=time(10)
            ),
        )


def test_past_delete_is_rejected_to_preserve_history(monkeypatch: pytest.MonkeyPatch) -> None:
    identity = make_identity()
    professional = make_professional(identity)
    exception = make_exception(identity, professional.id, local_date=date(2029, 1, 1))
    monkeypatch.setattr(ProfessionalRepository, "get_by_id", lambda *_args, **_kwargs: professional)
    monkeypatch.setattr(ProfessionalAvailabilityRepository, "get_exception", lambda *_args, **_kwargs: exception)
    monkeypatch.setattr(ProfessionalAvailabilityDomain, "_today", lambda *_args: date(2030, 1, 1))
    with pytest.raises(AvailabilityValidationError):
        ProfessionalAvailabilityDomain.delete_exception(MagicMock(), identity, professional.id, exception.id)


def test_weekly_failure_rolls_back_atomically(monkeypatch: pytest.MonkeyPatch) -> None:
    identity = make_identity()
    professional = make_professional(identity)
    db = MagicMock()
    monkeypatch.setattr(ProfessionalRepository, "get_by_id", lambda *_args, **_kwargs: professional)
    monkeypatch.setattr(ProfessionalAvailabilityRepository, "list_weekly", lambda *_args: [])
    monkeypatch.setattr(
        ProfessionalAvailabilityRepository,
        "replace_weekly",
        lambda *_args: (_ for _ in ()).throw(SQLAlchemyError()),
    )
    with pytest.raises(AvailabilityPersistenceError):
        ProfessionalAvailabilityDomain.replace_weekly(
            db,
            identity,
            professional.id,
            WeeklyAvailabilityUpdate(
                intervals=[{"weekday": 0, "start_time": "09:00", "end_time": "10:00"}]
            ),
        )
    db.rollback.assert_called_once()
    db.commit.assert_not_called()


def test_exception_noop_does_not_commit_or_audit(monkeypatch: pytest.MonkeyPatch) -> None:
    identity = make_identity()
    professional = make_professional(identity)
    exception = make_exception(identity, professional.id)
    db = MagicMock()
    monkeypatch.setattr(ProfessionalRepository, "get_by_id", lambda *_args, **_kwargs: professional)
    monkeypatch.setattr(ProfessionalAvailabilityRepository, "get_exception", lambda *_args, **_kwargs: exception)
    monkeypatch.setattr(ProfessionalAvailabilityRepository, "list_exceptions_on_date", lambda *_args, **_kwargs: [])
    audit = MagicMock()
    monkeypatch.setattr(AuditLogRepository, "add", audit)
    result = ProfessionalAvailabilityDomain.update_exception(
        db,
        identity,
        professional.id,
        exception.id,
        AvailabilityExceptionUpdate(start_time=time(9)),
    )
    assert result is exception
    db.commit.assert_not_called()
    audit.assert_not_called()


def test_invalid_exception_date_range_is_rejected(monkeypatch: pytest.MonkeyPatch) -> None:
    identity = make_identity()
    professional = make_professional(identity)
    monkeypatch.setattr(ProfessionalRepository, "get_by_id", lambda *_args, **_kwargs: professional)
    with pytest.raises(AvailabilityValidationError):
        ProfessionalAvailabilityDomain.list_exceptions(
            MagicMock(), identity, professional.id,
            date_from=date(2030, 1, 2), date_to=date(2030, 1, 1), page=1, page_size=20,
        )


def test_availability_audit_metadata_is_sanitized() -> None:
    assert sanitize_audit_metadata(
        "PROFESSIONAL_AVAILABILITY_WEEKLY_UPDATED",
        {"previous_count": 1, "new_count": 2, "weekdays": [0], "unsafe": "discarded"},
    ) == {"previous_count": 1, "new_count": 2, "weekdays": [0]}


def test_model_contains_tenant_safe_foreign_keys_and_checks() -> None:
    weekly_constraints = {
        constraint.name
        for constraint in ProfessionalWeeklyAvailability.__table__.constraints
    }
    exception_constraints = {constraint.name for constraint in ProfessionalAvailabilityException.__table__.constraints}
    assert "fk_professional_weekly_company_professional" in weekly_constraints
    assert "ck_professional_weekly_weekday" in weekly_constraints
    assert "fk_professional_exception_company_professional" in exception_constraints
    assert "ck_professional_exception_time_pair" in exception_constraints

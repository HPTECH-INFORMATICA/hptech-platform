from datetime import datetime, timezone
from unittest.mock import MagicMock
from uuid import UUID, uuid4

import pytest
from sqlalchemy.exc import IntegrityError

from app.core.identity import AuthenticatedIdentity, CompanyStatus, UserRole
from app.core.rbac import permissions_for_role
from app.models.company import Company
from app.models.user import User
from app.repositories.audit_log import AuditLogRepository
from app.repositories.user import UserRepository
from app.schemas.user_admin import UserAdminUpdate
from app.services.user_admin import (
    UserAdminConflictError,
    UserAdminForbiddenError,
    UserAdminNotFoundError,
    UserAdminService,
)


def make_identity(role: UserRole = UserRole.OWNER) -> AuthenticatedIdentity:
    company = Company(
        id=uuid4(), name="Empresa Teste", slug=str(uuid4()), status=CompanyStatus.ACTIVE
    )
    user = make_user(company.id, role=role)
    user.company = company
    return AuthenticatedIdentity(
        user=user,
        company=company,
        role=role,
        permissions=permissions_for_role(role),
    )


def make_user(
    company_id: UUID,
    *,
    role: UserRole = UserRole.VIEWER,
    active: bool = True,
) -> User:
    now = datetime.now(timezone.utc)
    return User(
        id=uuid4(),
        company_id=company_id,
        name="Pessoa Teste",
        email=f"{uuid4()}@example.com",
        password_hash="hash-seguro-de-teste",
        role=role,
        is_active=active,
        created_at=now,
        updated_at=now,
    )


def install_target(
    monkeypatch: pytest.MonkeyPatch,
    target: User | None,
) -> None:
    monkeypatch.setattr(
        UserRepository,
        "get_by_company_and_id",
        lambda _db, _company_id, _user_id, *, for_update=False: target,
    )


def capture_audit(monkeypatch: pytest.MonkeyPatch) -> list[dict[str, object]]:
    events: list[dict[str, object]] = []
    monkeypatch.setattr(
        AuditLogRepository,
        "add",
        lambda _db, **kwargs: events.append(kwargs),
    )
    return events


def test_detail_is_tenant_scoped(monkeypatch: pytest.MonkeyPatch) -> None:
    identity = make_identity()
    requested_id = uuid4()
    seen: list[tuple[UUID, UUID]] = []
    monkeypatch.setattr(
        UserRepository,
        "get_by_company_and_id",
        lambda _db, company_id, user_id, **_kwargs: seen.append(
            (company_id, user_id)
        )
        or None,
    )

    with pytest.raises(UserAdminNotFoundError):
        UserAdminService.detail(MagicMock(), identity, requested_id)

    assert seen == [(identity.company.id, requested_id)]


def test_detail_returns_user_from_same_tenant(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    identity = make_identity()
    target = make_user(identity.company.id)
    install_target(monkeypatch, target)

    assert UserAdminService.detail(MagicMock(), identity, target.id) is target


def test_admin_cannot_mutate_owner(monkeypatch: pytest.MonkeyPatch) -> None:
    identity = make_identity(UserRole.ADMIN)
    target = make_user(identity.company.id, role=UserRole.OWNER)
    install_target(monkeypatch, target)

    with pytest.raises(UserAdminForbiddenError):
        UserAdminService.update(
            MagicMock(), identity, target.id, UserAdminUpdate(name="Novo nome")
        )


@pytest.mark.parametrize("operation", ["role", "status", "delete"])
def test_self_protection(
    monkeypatch: pytest.MonkeyPatch,
    operation: str,
) -> None:
    identity = make_identity()
    install_target(monkeypatch, identity.user)

    with pytest.raises(UserAdminForbiddenError):
        if operation == "role":
            UserAdminService.change_role(
                MagicMock(), identity, identity.user.id, UserRole.ADMIN
            )
        elif operation == "status":
            UserAdminService.set_active(
                MagicMock(), identity, identity.user.id, False
            )
        else:
            UserAdminService.soft_delete(MagicMock(), identity, identity.user.id)


@pytest.mark.parametrize("operation", ["role", "status", "delete"])
def test_last_owner_is_protected_with_company_lock(
    monkeypatch: pytest.MonkeyPatch,
    operation: str,
) -> None:
    identity = make_identity()
    target = make_user(identity.company.id, role=UserRole.OWNER)
    install_target(monkeypatch, target)
    calls: list[str] = []
    monkeypatch.setattr(
        UserRepository,
        "lock_company",
        lambda _db, _company_id: calls.append("lock"),
    )
    monkeypatch.setattr(
        UserRepository,
        "count_active_owners",
        lambda _db, _company_id: calls.append("count") or 1,
    )

    with pytest.raises(UserAdminConflictError):
        if operation == "role":
            UserAdminService.change_role(
                MagicMock(), identity, target.id, UserRole.ADMIN
            )
        elif operation == "status":
            UserAdminService.set_active(MagicMock(), identity, target.id, False)
        else:
            UserAdminService.soft_delete(MagicMock(), identity, target.id)

    assert calls == ["lock", "count"]


def test_owner_change_is_allowed_when_two_are_active(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    identity = make_identity()
    target = make_user(identity.company.id, role=UserRole.OWNER)
    install_target(monkeypatch, target)
    monkeypatch.setattr(UserRepository, "lock_company", lambda *_args: None)
    monkeypatch.setattr(UserRepository, "count_active_owners", lambda *_args: 2)
    events = capture_audit(monkeypatch)

    result = UserAdminService.change_role(
        MagicMock(), identity, target.id, UserRole.ADMIN
    )

    assert result.role == UserRole.ADMIN.value
    assert events[0]["action"] == "USER_ROLE_CHANGED"


def test_admin_cannot_promote_to_owner(monkeypatch: pytest.MonkeyPatch) -> None:
    identity = make_identity(UserRole.ADMIN)
    target = make_user(identity.company.id)
    install_target(monkeypatch, target)

    with pytest.raises(UserAdminForbiddenError):
        UserAdminService.change_role(
            MagicMock(), identity, target.id, UserRole.OWNER
        )


def test_owner_can_promote_another_user_to_owner(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    identity = make_identity()
    target = make_user(identity.company.id, role=UserRole.ADMIN)
    install_target(monkeypatch, target)
    events = capture_audit(monkeypatch)

    UserAdminService.change_role(MagicMock(), identity, target.id, UserRole.OWNER)

    assert target.role == UserRole.OWNER.value
    assert events[0]["details"] == {"from": "ADMIN", "to": "OWNER"}


def test_duplicate_normalized_email_conflicts(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    identity = make_identity()
    target = make_user(identity.company.id)
    duplicate = make_user(uuid4())
    duplicate.email = "test@example.com"
    install_target(monkeypatch, target)
    monkeypatch.setattr(
        UserRepository, "get_unique_by_email", lambda *_args: duplicate
    )

    with pytest.raises(UserAdminConflictError):
        UserAdminService.update(
            MagicMock(),
            identity,
            target.id,
            UserAdminUpdate(email=" Test@Example.com "),
        )


def test_email_is_normalized_on_success(monkeypatch: pytest.MonkeyPatch) -> None:
    identity = make_identity()
    target = make_user(identity.company.id)
    install_target(monkeypatch, target)
    monkeypatch.setattr(UserRepository, "get_unique_by_email", lambda *_args: None)
    events = capture_audit(monkeypatch)

    UserAdminService.update(
        MagicMock(),
        identity,
        target.id,
        UserAdminUpdate(email=" New.User@Example.com "),
    )

    assert target.email == "new.user@example.com"
    assert events[0]["details"] == {"fields": ["email"]}


def test_block_and_reactivate_create_sanitized_events(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    identity = make_identity()
    target = make_user(identity.company.id)
    install_target(monkeypatch, target)
    events = capture_audit(monkeypatch)

    UserAdminService.set_active(MagicMock(), identity, target.id, False)
    UserAdminService.set_active(MagicMock(), identity, target.id, True)

    assert target.is_active is True
    assert [event["action"] for event in events] == [
        "USER_BLOCKED",
        "USER_REACTIVATED",
    ]
    assert [event["details"] for event in events] == [
        {"from": True, "to": False},
        {"from": False, "to": True},
    ]


def test_soft_delete_keeps_row_and_records_event(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    identity = make_identity()
    target = make_user(identity.company.id)
    install_target(monkeypatch, target)
    events = capture_audit(monkeypatch)

    UserAdminService.soft_delete(MagicMock(), identity, target.id)

    assert target.is_active is False
    assert target.deleted_at is not None
    assert events[0]["action"] == "USER_SOFT_DELETED"


@pytest.mark.parametrize("kind", ["update", "role", "status"])
def test_no_op_does_not_create_audit(
    monkeypatch: pytest.MonkeyPatch,
    kind: str,
) -> None:
    identity = make_identity()
    target = make_user(identity.company.id, role=UserRole.ADMIN)
    install_target(monkeypatch, target)
    events = capture_audit(monkeypatch)

    if kind == "update":
        UserAdminService.update(
            MagicMock(), identity, target.id, UserAdminUpdate(name=target.name)
        )
    elif kind == "role":
        UserAdminService.change_role(
            MagicMock(), identity, target.id, UserRole.ADMIN
        )
    else:
        UserAdminService.set_active(MagicMock(), identity, target.id, True)

    assert events == []


def test_audit_metadata_is_allowlisted(monkeypatch: pytest.MonkeyPatch) -> None:
    identity = make_identity()
    target = make_user(identity.company.id)
    install_target(monkeypatch, target)
    events = capture_audit(monkeypatch)

    UserAdminService.update(
        MagicMock(), identity, target.id, UserAdminUpdate(name="Nome Novo")
    )

    assert events == [
        {
            "company_id": identity.company.id,
            "actor_user_id": identity.user.id,
            "target_type": "USER",
            "target_id": target.id,
            "action": "USER_UPDATED",
            "details": {"fields": ["name"]},
        }
    ]
    serialized = repr(events).lower()
    assert "password" not in serialized
    assert "authorization" not in serialized
    assert "secret" not in serialized


def test_commit_rolls_back_on_integrity_error() -> None:
    db = MagicMock()
    db.commit.side_effect = IntegrityError("statement", {}, Exception("conflict"))

    with pytest.raises(UserAdminConflictError):
        UserAdminService.commit(db)

    db.rollback.assert_called_once_with()

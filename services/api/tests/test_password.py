from datetime import datetime, timedelta, timezone
from unittest.mock import MagicMock
from uuid import uuid4

import pytest
from fastapi import HTTPException
from pydantic import ValidationError

from app.core.identity import CompanyStatus, UserRole
from app.core.security import (
    create_access_token,
    decode_access_token,
    hash_password,
    verify_password,
)
from app.dependencies.auth import get_current_user
from app.models.company import Company
from app.models.password_reset_token import PasswordResetToken
from app.models.user import User
from app.repositories.audit_log import AuditLogRepository
from app.repositories.password_reset import PasswordResetRepository
from app.repositories.user import UserRepository
from app.schemas.password import ChangePasswordRequest, ResetPasswordRequest
from app.services.auth import AuthService
from app.services.invitation_notifier import PasswordResetMessage
from app.services.password import (
    CurrentPasswordInvalidError,
    PasswordResetInvalidError,
    PasswordService,
    SamePasswordError,
    hash_password_reset_token,
)
from tests.test_auth import credentials


def make_user(*, password: str = "senha-atual", auth_version: int = 1) -> User:
    company = Company(
        id=uuid4(),
        name="Empresa de teste",
        slug="empresa-password-test",
        status=CompanyStatus.ACTIVE,
    )
    return User(
        id=uuid4(),
        company_id=company.id,
        company=company,
        name="Usuário de teste",
        email="usuario@example.com",
        password_hash=hash_password(password),
        auth_version=auth_version,
        role=UserRole.VIEWER,
        is_active=True,
    )


def test_auth_version_rejects_access_token_issued_before_increment(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    user = make_user(auth_version=2)
    old_token = create_access_token(user.id, auth_version=1)
    current_token = create_access_token(user.id, auth_version=2)
    monkeypatch.setattr(UserRepository, "get_by_id", lambda _db, _id: user)

    with pytest.raises(HTTPException) as error:
        get_current_user(credentials(old_token), MagicMock())

    assert error.value.status_code == 401
    assert get_current_user(credentials(current_token), MagicMock()).user is user


def test_authenticate_issues_current_auth_version(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    user = make_user(auth_version=4)
    monkeypatch.setattr(
        UserRepository,
        "get_unique_by_email",
        lambda _db, _email: user,
    )

    result = AuthService.authenticate(MagicMock(), user.email, "senha-atual")

    assert decode_access_token(result.access_token).auth_version == 4


def test_request_reset_persists_only_hash_and_revokes_previous(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    user = make_user()
    db = MagicMock()
    notifier = MagicMock()
    added: list[PasswordResetToken] = []
    revoked: list[tuple[object, object]] = []
    monkeypatch.setattr(
        UserRepository,
        "get_unique_by_email",
        lambda _db, _email: user,
    )
    monkeypatch.setattr(
        PasswordResetRepository,
        "add",
        lambda _db, token: added.append(token) or token,
    )
    monkeypatch.setattr(
        PasswordResetRepository,
        "revoke_pending",
        lambda _db, user_id, now: revoked.append((user_id, now)),
    )
    monkeypatch.setattr(AuditLogRepository, "add", lambda *_args, **_kwargs: None)

    PasswordService.request_reset(db, "  Usuario@Example.COM ", notifier)

    message: PasswordResetMessage = notifier.send_password_reset.call_args.args[0]
    plaintext = message.reset_url.split("#token=", 1)[1]
    assert revoked[0][0] == user.id
    assert added[0].token_hash == hash_password_reset_token(plaintext)
    assert plaintext != added[0].token_hash
    assert plaintext not in repr(db.mock_calls)


def test_request_reset_for_unknown_user_has_no_delivery(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    notifier = MagicMock()
    monkeypatch.setattr(
        UserRepository,
        "get_unique_by_email",
        lambda _db, _email: None,
    )

    PasswordService.request_reset(MagicMock(), "unknown@example.com", notifier)

    notifier.send_password_reset.assert_not_called()


@pytest.mark.parametrize("state", ["used", "revoked", "expired"])
def test_reset_password_rejects_invalid_token_states(
    monkeypatch: pytest.MonkeyPatch,
    state: str,
) -> None:
    now = datetime.now(timezone.utc)
    reset = PasswordResetToken(
        id=uuid4(),
        user_id=uuid4(),
        token_hash="a" * 64,
        expires_at=now + timedelta(minutes=10),
        created_at=now,
        used_at=now if state == "used" else None,
        revoked_at=now if state == "revoked" else None,
    )
    if state == "expired":
        reset.expires_at = now - timedelta(seconds=1)
    monkeypatch.setattr(
        PasswordResetRepository,
        "get_by_hash_for_update",
        lambda _db, _hash: reset,
    )

    with pytest.raises(PasswordResetInvalidError):
        PasswordService.reset_password(MagicMock(), "valid-looking-token", "nova-senha")


def test_reset_password_changes_hash_version_and_consumes_token(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    user = make_user(auth_version=3)
    now = datetime.now(timezone.utc)
    reset = PasswordResetToken(
        id=uuid4(),
        user_id=user.id,
        token_hash="b" * 64,
        expires_at=now + timedelta(minutes=10),
        created_at=now,
    )
    db = MagicMock()
    revoke = MagicMock()
    monkeypatch.setattr(
        PasswordResetRepository,
        "get_by_hash_for_update",
        lambda _db, _hash: reset,
    )
    monkeypatch.setattr(UserRepository, "get_by_id", lambda _db, _id: user)
    monkeypatch.setattr(PasswordResetRepository, "revoke_pending", revoke)
    monkeypatch.setattr(AuditLogRepository, "add", lambda *_args, **_kwargs: None)

    PasswordService.reset_password(db, "valid-looking-token", "nova-senha")

    assert verify_password("nova-senha", user.password_hash)
    assert user.auth_version == 4
    assert reset.used_at is not None
    revoke.assert_called_once_with(db, user.id, reset.used_at, exclude_id=reset.id)
    db.commit.assert_called_once()


def test_change_password_updates_hash_version_and_audit(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    user = make_user(auth_version=2)
    identity = AuthService.identity_from_user(user)
    db = MagicMock()
    audit = MagicMock()
    monkeypatch.setattr(
        UserRepository,
        "get_by_company_and_id",
        lambda *_args, **_kwargs: user,
    )
    monkeypatch.setattr(AuditLogRepository, "add", audit)

    PasswordService.change_password(db, identity, "senha-atual", "nova-senha")

    assert verify_password("nova-senha", user.password_hash)
    assert user.auth_version == 3
    assert audit.call_args.kwargs["action"] == "PASSWORD_CHANGED"
    db.commit.assert_called_once()


@pytest.mark.parametrize(
    ("current", "new", "error_type"),
    [
        ("incorreta", "nova-senha", CurrentPasswordInvalidError),
        ("senha-atual", "senha-atual", SamePasswordError),
    ],
)
def test_change_password_rejects_invalid_current_or_reused_password(
    monkeypatch: pytest.MonkeyPatch,
    current: str,
    new: str,
    error_type: type[RuntimeError],
) -> None:
    user = make_user()
    identity = AuthService.identity_from_user(user)
    monkeypatch.setattr(
        UserRepository,
        "get_by_company_and_id",
        lambda *_args, **_kwargs: user,
    )

    with pytest.raises(error_type):
        PasswordService.change_password(MagicMock(), identity, current, new)


@pytest.mark.parametrize("schema", [ResetPasswordRequest, ChangePasswordRequest])
def test_password_schemas_forbid_privileged_mass_assignment(schema: type) -> None:
    payload = (
        {"token": "x" * 32, "password": "nova-senha"}
        if schema is ResetPasswordRequest
        else {"current_password": "senha-atual", "new_password": "nova-senha"}
    )
    payload["auth_version"] = 99

    with pytest.raises(ValidationError):
        schema.model_validate(payload)

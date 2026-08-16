from datetime import datetime, timedelta, timezone
from unittest.mock import MagicMock
from uuid import uuid4

import pytest
from fastapi import HTTPException
from fastapi.security import HTTPAuthorizationCredentials
from jose import jwt

from app.core.config import settings
from app.core.identity import CompanyStatus, UserRole
from app.core.security import create_access_token, hash_password
from app.dependencies.auth import get_current_user
from app.models.company import Company
from app.models.user import User
from app.repositories.user import (
    AmbiguousUserEmailError,
    UserRepository,
    normalize_email,
)
from app.services.auth import AuthenticationError, AuthService


def make_user(
    *,
    password: str = "senha-segura",
    role: UserRole = UserRole.VIEWER,
    is_active: bool = True,
    user_deleted: bool = False,
    company_status: CompanyStatus = CompanyStatus.ACTIVE,
    company_deleted: bool = False,
) -> User:
    company = Company(
        id=uuid4(),
        name="Empresa de teste",
        slug="empresa-teste",
        status=company_status,
        deleted_at=(datetime.now(timezone.utc) if company_deleted else None),
    )
    return User(
        id=uuid4(),
        company_id=company.id,
        company=company,
        name="Usuário de teste",
        email="usuario@example.com",
        password_hash=hash_password(password),
        role=role,
        is_active=is_active,
        deleted_at=(datetime.now(timezone.utc) if user_deleted else None),
    )


def credentials(token: str) -> HTTPAuthorizationCredentials:
    return HTTPAuthorizationCredentials(
        scheme="Bearer",
        credentials=token,
    )


def test_normalize_email_is_case_insensitive() -> None:
    assert normalize_email("  Usuario@Example.COM ") == "usuario@example.com"


def test_repository_rejects_ambiguous_normalized_email() -> None:
    db = MagicMock()
    db.execute.return_value.scalars.return_value.all.return_value = [
        make_user(),
        make_user(),
    ]

    with pytest.raises(AmbiguousUserEmailError):
        UserRepository.get_unique_by_email(db, "usuario@example.com")


@pytest.mark.parametrize(
    "company_status",
    [CompanyStatus.ACTIVE, CompanyStatus.TRIAL],
)
def test_authenticate_accepts_active_and_trial_company(
    monkeypatch: pytest.MonkeyPatch,
    company_status: CompanyStatus,
) -> None:
    user = make_user(company_status=company_status)
    captured_email: list[str] = []

    def find_user(_db: object, email: str) -> User:
        captured_email.append(email)
        return user

    monkeypatch.setattr(UserRepository, "get_unique_by_email", find_user)

    result = AuthService.authenticate(
        MagicMock(),
        "  Usuario@Example.COM ",
        "senha-segura",
    )

    assert captured_email == ["usuario@example.com"]
    assert result.identity.user is user
    assert result.identity.company is user.company
    assert result.identity.role == UserRole.VIEWER
    assert result.access_token


@pytest.mark.parametrize("user", [None, make_user()])
def test_authenticate_uses_same_error_for_unknown_email_or_wrong_password(
    monkeypatch: pytest.MonkeyPatch,
    user: User | None,
) -> None:
    monkeypatch.setattr(
        UserRepository,
        "get_unique_by_email",
        lambda _db, _email: user,
    )

    with pytest.raises(AuthenticationError) as error:
        AuthService.authenticate(
            MagicMock(),
            "usuario@example.com",
            "senha-incorreta",
        )

    assert str(error.value) == ""


def test_authenticate_rejects_ambiguous_email(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    def ambiguous(_db: object, _email: str) -> User:
        raise AmbiguousUserEmailError

    monkeypatch.setattr(UserRepository, "get_unique_by_email", ambiguous)

    with pytest.raises(AuthenticationError):
        AuthService.authenticate(
            MagicMock(),
            "usuario@example.com",
            "senha-segura",
        )


@pytest.mark.parametrize(
    "user",
    [
        make_user(is_active=False),
        make_user(user_deleted=True),
        make_user(company_status=CompanyStatus.SUSPENDED),
        make_user(company_status=CompanyStatus.CANCELED),
        make_user(company_deleted=True),
    ],
)
def test_authenticate_rejects_blocked_identity(
    monkeypatch: pytest.MonkeyPatch,
    user: User,
) -> None:
    monkeypatch.setattr(
        UserRepository,
        "get_unique_by_email",
        lambda _db, _email: user,
    )

    with pytest.raises(AuthenticationError):
        AuthService.authenticate(
            MagicMock(),
            "usuario@example.com",
            "senha-segura",
        )


def test_get_current_user_reloads_identity_from_database(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    user = make_user(role=UserRole.ADMIN)
    token = create_access_token(user.id)
    captured_id: list[object] = []

    def find_user(_db: object, user_id: object) -> User:
        captured_id.append(user_id)
        return user

    monkeypatch.setattr(UserRepository, "get_by_id", find_user)

    identity = get_current_user(credentials(token), MagicMock())

    assert captured_id == [user.id]
    assert identity.user is user
    assert identity.company is user.company
    assert identity.role == UserRole.ADMIN


@pytest.mark.parametrize(
    "token",
    [
        "token-adulterado",
        create_access_token(uuid4(), expires_delta=timedelta(seconds=-1)),
    ],
)
def test_get_current_user_rejects_invalid_or_expired_token(token: str) -> None:
    with pytest.raises(HTTPException) as error:
        get_current_user(credentials(token), MagicMock())

    assert error.value.status_code == 401


def test_get_current_user_rejects_missing_token() -> None:
    with pytest.raises(HTTPException) as error:
        get_current_user(None, MagicMock())

    assert error.value.status_code == 401


def test_get_current_user_rejects_non_access_token() -> None:
    token = create_access_token(uuid4())
    payload = jwt.decode(
        token,
        settings.JWT_SECRET.get_secret_value(),
        algorithms=[settings.JWT_ALGORITHM],
    )
    payload["type"] = "refresh"
    invalid_token = jwt.encode(
        payload,
        settings.JWT_SECRET.get_secret_value(),
        algorithm=settings.JWT_ALGORITHM,
    )

    with pytest.raises(HTTPException) as error:
        get_current_user(credentials(invalid_token), MagicMock())

    assert error.value.status_code == 401


def test_get_current_user_rejects_invalid_subject() -> None:
    token = create_access_token(uuid4())
    payload = jwt.decode(
        token,
        settings.JWT_SECRET.get_secret_value(),
        algorithms=[settings.JWT_ALGORITHM],
    )
    payload["sub"] = "not-a-user-id"
    invalid_token = jwt.encode(
        payload,
        settings.JWT_SECRET.get_secret_value(),
        algorithm=settings.JWT_ALGORITHM,
    )

    with pytest.raises(HTTPException) as error:
        get_current_user(credentials(invalid_token), MagicMock())

    assert error.value.status_code == 401


def test_get_current_user_rejects_unknown_subject(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.setattr(
        UserRepository,
        "get_by_id",
        lambda _db, _user_id: None,
    )

    with pytest.raises(HTTPException) as error:
        get_current_user(
            credentials(create_access_token(uuid4())),
            MagicMock(),
        )

    assert error.value.status_code == 401


@pytest.mark.parametrize(
    "user",
    [
        make_user(is_active=False),
        make_user(user_deleted=True),
        make_user(company_status=CompanyStatus.SUSPENDED),
        make_user(company_status=CompanyStatus.CANCELED),
        make_user(company_deleted=True),
    ],
)
def test_get_current_user_rejects_identity_blocked_after_issuance(
    monkeypatch: pytest.MonkeyPatch,
    user: User,
) -> None:
    token = create_access_token(user.id)
    monkeypatch.setattr(
        UserRepository,
        "get_by_id",
        lambda _db, _user_id: user,
    )

    with pytest.raises(HTTPException) as error:
        get_current_user(credentials(token), MagicMock())

    assert error.value.status_code == 401

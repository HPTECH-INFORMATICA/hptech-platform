from collections.abc import AsyncIterator
from unittest.mock import MagicMock
from uuid import uuid4

import pytest
from httpx import ASGITransport, AsyncClient

from app.core.identity import (
    AuthenticatedIdentity,
    CompanyStatus,
    UserRole,
)
from app.db.session import get_db
from app.dependencies.auth import get_current_user
from app.main import app
from app.models.company import Company
from app.models.user import User
from app.repositories.user import UserRepository
from app.core.security import create_access_token, hash_password
from app.core.rbac import permissions_for_role
from app.services.auth import AuthService
from app.services.login_rate_limit import LoginRateLimiter, LoginRateLimitExceeded


pytestmark = pytest.mark.anyio


@pytest.fixture(autouse=True)
def isolate_login_rate_limit(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setattr(LoginRateLimiter, "ensure_allowed", lambda *_args: None)
    monkeypatch.setattr(LoginRateLimiter, "record_failure", lambda *_args: None)
    monkeypatch.setattr(LoginRateLimiter, "clear", lambda *_args: None)


def make_identity() -> AuthenticatedIdentity:
    company = Company(
        id=uuid4(),
        name="Empresa de teste",
        slug="empresa-teste",
        status=CompanyStatus.ACTIVE,
    )
    user = User(
        id=uuid4(),
        company_id=company.id,
        company=company,
        name="Usuário de teste",
        email="usuario@example.com",
        password_hash=hash_password("senha-segura"),
        role=UserRole.ADMIN,
        is_active=True,
    )
    return AuthenticatedIdentity(
        user=user,
        company=company,
        role=UserRole.ADMIN,
        permissions=permissions_for_role(UserRole.ADMIN),
    )


@pytest.fixture
async def client() -> AsyncIterator[AsyncClient]:
    app.dependency_overrides[get_db] = lambda: MagicMock()

    async with AsyncClient(
        transport=ASGITransport(app=app),
        base_url="http://testserver",
    ) as test_client:
        yield test_client

    app.dependency_overrides.clear()


async def test_login_returns_bearer_token_without_sensitive_data(
    client: AsyncClient,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    identity = make_identity()
    monkeypatch.setattr(
        UserRepository,
        "get_unique_by_email",
        lambda _db, _email: identity.user,
    )

    response = await client.post(
        "/api/v1/auth/login",
        json={
            "email": "Usuario@Example.COM",
            "password": "senha-segura",
        },
    )

    assert response.status_code == 200
    body = response.json()
    assert body["access_token"]
    assert body["token_type"] == "bearer"
    assert body["expires_in"] > 0
    assert "password" not in body
    assert "password_hash" not in body


async def test_login_rate_limit_returns_429_and_retry_after(
    client: AsyncClient,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    def reject(*_args: object) -> None:
        raise LoginRateLimitExceeded(120)

    monkeypatch.setattr(LoginRateLimiter, "ensure_allowed", reject)

    response = await client.post(
        "/api/v1/auth/login",
        json={"email": "usuario@example.com", "password": "senha-segura"},
    )

    assert response.status_code == 429
    assert response.headers["retry-after"] == "120"
    assert response.json() == {
        "detail": "Muitas tentativas de acesso. Tente novamente mais tarde."
    }


@pytest.mark.parametrize(
    "repository_user,password",
    [(None, "senha-segura"), (make_identity().user, "senha-incorreta")],
)
async def test_login_uses_generic_error_for_invalid_credentials(
    client: AsyncClient,
    monkeypatch: pytest.MonkeyPatch,
    repository_user: User | None,
    password: str,
) -> None:
    monkeypatch.setattr(
        UserRepository,
        "get_unique_by_email",
        lambda _db, _email: repository_user,
    )

    response = await client.post(
        "/api/v1/auth/login",
        json={
            "email": "usuario@example.com",
            "password": password,
        },
    )

    assert response.status_code == 401
    assert response.json() == {"detail": "Email ou senha inválidos."}


@pytest.mark.parametrize(
    "payload",
    [
        {},
        {"email": "invalido", "password": "senha-segura"},
        {"email": f"{'a' * 151}@example.com", "password": "senha-segura"},
        {"email": "usuario@example.com", "password": "x" * 73},
        {
            "email": "usuario@example.com",
            "password": "senha-segura",
            "role": "OWNER",
        },
    ],
)
async def test_login_rejects_invalid_or_sensitive_extra_payload(
    client: AsyncClient,
    payload: dict[str, str],
) -> None:
    response = await client.post("/api/v1/auth/login", json=payload)

    assert response.status_code == 422


async def test_auth_me_returns_current_identity_without_sensitive_data(
    client: AsyncClient,
) -> None:
    identity = make_identity()
    app.dependency_overrides[get_current_user] = lambda: identity

    response = await client.get("/api/v1/auth/me")

    assert response.status_code == 200
    assert response.json() == {
        "id": str(identity.user.id),
        "name": identity.user.name,
        "email": identity.user.email,
        "role": "ADMIN",
        "active": True,
        "company": {
            "id": str(identity.company.id),
            "name": identity.company.name,
            "slug": identity.company.slug,
            "status": "ACTIVE",
        },
        "permissions": [
            {"module": "DASHBOARD", "actions": ["VIEW"]},
            {
                "module": "CRM",
                "actions": ["CREATE", "DELETE", "UPDATE", "VIEW"],
            },
            {"module": "COMPANY", "actions": ["VIEW"]},
            {
                "module": "USERS",
                "actions": ["BLOCK", "DELETE", "MANAGE_ROLE", "UPDATE", "VIEW"],
            },
        ],
    }
    assert "password_hash" not in response.text
    assert "JWT_SECRET" not in response.text


@pytest.mark.parametrize(
    ("role", "crm_actions"),
    [
        (UserRole.OWNER, ["CREATE", "DELETE", "UPDATE", "VIEW"]),
        (UserRole.MANAGER, ["CREATE", "UPDATE", "VIEW"]),
        (UserRole.VIEWER, ["VIEW"]),
    ],
)
async def test_auth_me_returns_permissions_from_current_database_role(
    client: AsyncClient,
    role: UserRole,
    crm_actions: list[str],
) -> None:
    identity = make_identity()
    identity.user.role = role
    identity = AuthService.identity_from_user(identity.user)
    app.dependency_overrides[get_current_user] = lambda: identity

    response = await client.get("/api/v1/auth/me")

    assert response.status_code == 200
    assert response.json()["role"] == role
    expected_permissions = [
        {"module": "DASHBOARD", "actions": ["VIEW"]},
        {"module": "CRM", "actions": crm_actions},
    ]
    if role is UserRole.OWNER:
        expected_permissions.append({"module": "COMPANY", "actions": ["VIEW"]})
        expected_permissions.append(
            {
                "module": "USERS",
                "actions": ["BLOCK", "DELETE", "MANAGE_ROLE", "UPDATE", "VIEW"],
            }
        )

    assert response.json()["permissions"] == expected_permissions


async def test_auth_me_rejects_missing_token(client: AsyncClient) -> None:
    response = await client.get("/api/v1/auth/me")

    assert response.status_code == 401
    assert response.headers["www-authenticate"] == "Bearer"


async def test_auth_me_rejects_invalid_token(client: AsyncClient) -> None:
    response = await client.get(
        "/api/v1/auth/me",
        headers={"Authorization": "Bearer token-adulterado"},
    )

    assert response.status_code == 401


@pytest.mark.parametrize(
    "blocked_state,identity",
    [
        ("inactive-user", make_identity()),
        ("suspended-company", make_identity()),
    ],
)
async def test_auth_me_rejects_identity_blocked_after_token_issuance(
    client: AsyncClient,
    monkeypatch: pytest.MonkeyPatch,
    blocked_state: str,
    identity: AuthenticatedIdentity,
) -> None:
    if blocked_state == "inactive-user":
        identity.user.is_active = False
    else:
        identity.company.status = CompanyStatus.SUSPENDED

    token = create_access_token(identity.user.id)
    monkeypatch.setattr(
        UserRepository,
        "get_by_id",
        lambda _db, _user_id: identity.user,
    )

    response = await client.get(
        "/api/v1/auth/me",
        headers={"Authorization": f"Bearer {token}"},
    )

    assert response.status_code == 401

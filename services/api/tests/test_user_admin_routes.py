from collections.abc import AsyncIterator
from datetime import datetime, timezone
from unittest.mock import MagicMock
from uuid import uuid4

import pytest
from httpx import ASGITransport, AsyncClient

from app.core.identity import AuthenticatedIdentity, CompanyStatus, UserRole
from app.core.rbac import permissions_for_role
from app.db.session import get_db
from app.dependencies.auth import get_current_user
from app.main import app
from app.models.company import Company
from app.models.user import User
from app.services.user_admin import (
    UserAdminConflictError,
    UserAdminForbiddenError,
    UserAdminNotFoundError,
    UserAdminService,
)


pytestmark = pytest.mark.anyio


def make_identity(role: UserRole = UserRole.OWNER) -> AuthenticatedIdentity:
    company = Company(
        id=uuid4(), name="Empresa Teste", slug=str(uuid4()),
        status=CompanyStatus.ACTIVE, timezone="America/Sao_Paulo"
    )
    user = make_user(company.id, role=role)
    user.company = company
    return AuthenticatedIdentity(
        user=user,
        company=company,
        role=role,
        permissions=permissions_for_role(role),
    )


def make_user(company_id, *, role: UserRole = UserRole.VIEWER) -> User:
    now = datetime.now(timezone.utc)
    return User(
        id=uuid4(),
        company_id=company_id,
        name="Pessoa Teste",
        email=f"{uuid4()}@example.com",
        password_hash="hash-seguro-de-teste",
        role=role,
        is_active=True,
        created_at=now,
        updated_at=now,
    )


@pytest.fixture
async def client() -> AsyncIterator[AsyncClient]:
    app.dependency_overrides[get_db] = lambda: MagicMock()
    async with AsyncClient(
        transport=ASGITransport(app=app), base_url="http://testserver"
    ) as test_client:
        yield test_client
    app.dependency_overrides.clear()


def authenticate_as(identity: AuthenticatedIdentity) -> None:
    app.dependency_overrides[get_current_user] = lambda: identity


@pytest.mark.parametrize(
    ("method", "path", "payload"),
    [
        ("GET", "/api/v1/users", None),
        ("GET", f"/api/v1/users/{uuid4()}", None),
        ("PATCH", f"/api/v1/users/{uuid4()}", {"name": "Novo nome"}),
        ("PATCH", f"/api/v1/users/{uuid4()}/role", {"role": "MANAGER"}),
        ("PATCH", f"/api/v1/users/{uuid4()}/status", {"is_active": False}),
        ("DELETE", f"/api/v1/users/{uuid4()}", None),
    ],
)
async def test_user_endpoints_require_authentication(
    client: AsyncClient,
    method: str,
    path: str,
    payload: dict[str, object] | None,
) -> None:
    response = await client.request(method, path, json=payload)
    assert response.status_code == 401


async def test_viewer_cannot_list_users(client: AsyncClient) -> None:
    authenticate_as(make_identity(UserRole.VIEWER))
    response = await client.get("/api/v1/users")
    assert response.status_code == 403


@pytest.mark.parametrize("role", [UserRole.OWNER, UserRole.ADMIN])
async def test_owner_and_admin_can_list_tenant_users(
    client: AsyncClient,
    monkeypatch: pytest.MonkeyPatch,
    role: UserRole,
) -> None:
    identity = make_identity(role)
    authenticate_as(identity)
    target = make_user(identity.company.id)
    seen: list[tuple[object, int, int, str, UserRole, bool]] = []

    def fake_list(_db, current, **kwargs):
        seen.append(
            (
                current.company.id,
                kwargs["page"],
                kwargs["page_size"],
                kwargs["search"],
                kwargs["role"],
                kwargs["is_active"],
            )
        )
        return [target], 1

    monkeypatch.setattr(UserAdminService, "list_users", fake_list)
    response = await client.get(
        "/api/v1/users?page=2&page_size=10&search=pessoa&role=VIEWER&is_active=true"
    )

    assert response.status_code == 200
    assert response.json()["total"] == 1
    assert seen == [
        (identity.company.id, 2, 10, "pessoa", UserRole.VIEWER, True)
    ]


@pytest.mark.parametrize(
    "query", ["page=0", "page_size=0", "page_size=101"]
)
async def test_list_rejects_invalid_pagination(
    client: AsyncClient,
    query: str,
) -> None:
    authenticate_as(make_identity())
    response = await client.get(f"/api/v1/users?{query}")
    assert response.status_code == 422


async def test_cross_tenant_detail_is_not_found(
    client: AsyncClient,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    authenticate_as(make_identity())
    monkeypatch.setattr(
        UserAdminService,
        "detail",
        lambda *_args: (_ for _ in ()).throw(UserAdminNotFoundError()),
    )
    response = await client.get(f"/api/v1/users/{uuid4()}")
    assert response.status_code == 404


async def test_update_rejects_whitespace_name_and_extra_fields(
    client: AsyncClient,
) -> None:
    authenticate_as(make_identity())
    target_id = uuid4()

    whitespace = await client.patch(
        f"/api/v1/users/{target_id}", json={"name": "   "}
    )
    extra = await client.patch(
        f"/api/v1/users/{target_id}",
        json={"name": "Nome", "company_id": str(uuid4())},
    )

    assert whitespace.status_code == 422
    assert extra.status_code == 422


async def test_normalized_duplicate_email_returns_conflict(
    client: AsyncClient,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    authenticate_as(make_identity())
    monkeypatch.setattr(
        UserAdminService,
        "update",
        lambda *_args: (_ for _ in ()).throw(
            UserAdminConflictError("Email já utilizado por outro usuário.")
        ),
    )
    response = await client.patch(
        f"/api/v1/users/{uuid4()}", json={"email": "Test@Example.com"}
    )
    assert response.status_code == 409
    assert "Email" in response.json()["detail"]


@pytest.mark.parametrize(
    ("suffix", "method", "payload", "service_name"),
    [
        ("", "PATCH", {"name": "Nome Novo"}, "update"),
        ("/role", "PATCH", {"role": "MANAGER"}, "change_role"),
        ("/status", "PATCH", {"is_active": False}, "set_active"),
    ],
)
async def test_mutations_commit_once(
    client: AsyncClient,
    monkeypatch: pytest.MonkeyPatch,
    suffix: str,
    method: str,
    payload: dict[str, object],
    service_name: str,
) -> None:
    identity = make_identity()
    authenticate_as(identity)
    target = make_user(identity.company.id)
    monkeypatch.setattr(UserAdminService, service_name, lambda *_args: target)
    commits: list[bool] = []
    monkeypatch.setattr(UserAdminService, "commit", lambda _db: commits.append(True))

    response = await client.request(
        method, f"/api/v1/users/{target.id}{suffix}", json=payload
    )

    assert response.status_code == 200
    assert commits == [True]


async def test_domain_forbidden_maps_to_403(
    client: AsyncClient,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    authenticate_as(make_identity(UserRole.ADMIN))
    monkeypatch.setattr(
        UserAdminService,
        "change_role",
        lambda *_args: (_ for _ in ()).throw(UserAdminForbiddenError()),
    )
    response = await client.patch(
        f"/api/v1/users/{uuid4()}/role", json={"role": "MANAGER"}
    )
    assert response.status_code == 403


async def test_delete_commits_and_returns_no_content(
    client: AsyncClient,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    authenticate_as(make_identity())
    monkeypatch.setattr(UserAdminService, "soft_delete", lambda *_args: None)
    commits: list[bool] = []
    monkeypatch.setattr(UserAdminService, "commit", lambda _db: commits.append(True))
    response = await client.delete(f"/api/v1/users/{uuid4()}")
    assert response.status_code == 204
    assert commits == [True]

from collections.abc import AsyncIterator
from datetime import datetime, timezone
from uuid import uuid4

import pytest
from httpx import ASGITransport, AsyncClient

from app.core.identity import (
    AuthenticatedIdentity,
    CompanyStatus,
    PermissionAction,
    PermissionModule,
    UserRole,
)
from app.core.rbac import permissions_for_role
from app.dependencies.auth import get_current_user
from app.main import app
from app.models.company import Company
from app.models.user import User


pytestmark = pytest.mark.anyio


def make_identity(role: UserRole) -> AuthenticatedIdentity:
    company = Company(
        id=uuid4(),
        name="Empresa Teste",
        slug=str(uuid4()),
        status=CompanyStatus.ACTIVE,
    )
    user = User(
        id=uuid4(),
        company_id=company.id,
        name="Pessoa Teste",
        email=f"{uuid4()}@example.com",
        password_hash="hash-seguro-de-teste",
        role=role,
        is_active=True,
        created_at=datetime.now(timezone.utc),
        updated_at=datetime.now(timezone.utc),
    )
    user.company = company
    return AuthenticatedIdentity(
        user=user,
        company=company,
        role=role,
        permissions=permissions_for_role(role),
    )


@pytest.fixture
async def client() -> AsyncIterator[AsyncClient]:
    async with AsyncClient(
        transport=ASGITransport(app=app), base_url="http://testserver"
    ) as test_client:
        yield test_client
    app.dependency_overrides.clear()


@pytest.mark.parametrize("role", [UserRole.OWNER, UserRole.ADMIN])
async def test_administrators_receive_complete_deterministic_catalog(
    client: AsyncClient, role: UserRole
) -> None:
    app.dependency_overrides[get_current_user] = lambda: make_identity(role)

    first = await client.get("/api/v1/access-control")
    second = await client.get("/api/v1/access-control")

    assert first.status_code == 200
    assert first.json() == second.json()
    body = first.json()
    assert [item["role"] for item in body["roles"]] == [
        item.value for item in UserRole
    ]
    assert [item["module"] for item in body["modules"]] == [
        item.value for item in PermissionModule
    ]
    for role_item, expected_role in zip(body["roles"], UserRole, strict=True):
        expected = permissions_for_role(expected_role)
        assert role_item["permissions"] == [
            {
                "module": permission.module.value,
                "actions": [
                    action.value
                    for action in PermissionAction
                    if action in permission.actions
                ],
            }
            for permission in expected
        ]


async def test_viewer_cannot_read_catalog(client: AsyncClient) -> None:
    app.dependency_overrides[get_current_user] = lambda: make_identity(UserRole.VIEWER)
    assert (await client.get("/api/v1/access-control")).status_code == 403


async def test_unauthenticated_request_is_rejected(client: AsyncClient) -> None:
    assert (await client.get("/api/v1/access-control")).status_code == 401

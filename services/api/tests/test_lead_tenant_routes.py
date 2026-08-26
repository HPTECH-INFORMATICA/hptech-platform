from collections.abc import AsyncIterator
from datetime import datetime, timezone
from types import SimpleNamespace
from unittest.mock import MagicMock
from uuid import UUID, uuid4

import pytest
from httpx import ASGITransport, AsyncClient

from app.core.identity import AuthenticatedIdentity, CompanyStatus, UserRole
from app.core.security import create_access_token, hash_password
from app.core.rbac import permissions_for_role
from app.db.session import get_db
from app.dependencies.auth import get_current_user
from app.main import app
from app.models.company import Company
from app.models.lead import Lead
from app.models.user import User
from app.repositories.audit_log import AuditLogRepository
from app.repositories.lead import LeadRepository
from app.repositories.lead_history import LeadHistoryRepository
from app.repositories.user import UserRepository
from app.services.lead import LeadService
from app.services.lead_history import LeadHistoryService
from app.services.audit_log import sanitize_audit_metadata


pytestmark = pytest.mark.anyio


def make_identity(
    company_id: UUID | None = None,
    *,
    active: bool = True,
    company_status: CompanyStatus = CompanyStatus.ACTIVE,
    role: UserRole = UserRole.OWNER,
) -> AuthenticatedIdentity:
    resolved_company_id = company_id or uuid4()
    company = Company(
        id=resolved_company_id,
        name=f"Empresa {resolved_company_id}",
        slug=f"empresa-{resolved_company_id}",
        status=company_status,
    )
    user = User(
        id=uuid4(),
        company_id=resolved_company_id,
        company=company,
        name="Usuário de teste",
        email=f"{uuid4()}@example.com",
        password_hash=hash_password("senha-segura"),
        role=role,
        is_active=active,
    )
    return AuthenticatedIdentity(
        user=user,
        company=company,
        role=role,
        permissions=permissions_for_role(role),
    )


def lead_response(company_id: UUID, lead_id: UUID | None = None) -> dict[str, object]:
    return {
        "id": str(lead_id or uuid4()),
        "company_id": str(company_id),
        "name": "Lead de teste",
        "email": None,
        "phone": None,
        "whatsapp": None,
        "birth_date": None,
        "source": None,
        "interest": None,
        "pipeline_status": "NEW",
        "notes": None,
    }


@pytest.fixture
async def client() -> AsyncIterator[AsyncClient]:
    app.dependency_overrides[get_db] = lambda: MagicMock()

    async with AsyncClient(
        transport=ASGITransport(app=app),
        base_url="http://testserver",
    ) as test_client:
        yield test_client

    app.dependency_overrides.clear()


def authenticate_as(identity: AuthenticatedIdentity) -> None:
    app.dependency_overrides[get_current_user] = lambda: identity


@pytest.mark.parametrize(
    ("method", "path", "json"),
    [
        ("POST", "/api/v1/leads", {"name": "Lead"}),
        ("GET", "/api/v1/leads", None),
        ("GET", "/api/v1/leads/kanban", None),
        ("GET", f"/api/v1/leads/{uuid4()}", None),
        ("PATCH", f"/api/v1/leads/{uuid4()}", {"name": "Atualizado"}),
        ("DELETE", f"/api/v1/leads/{uuid4()}", None),
        (
            "PATCH",
            f"/api/v1/leads/{uuid4()}/pipeline",
            {"pipeline_status": "WON"},
        ),
        ("GET", f"/api/v1/lead-history/lead/{uuid4()}", None),
    ],
)
async def test_lead_endpoints_require_authentication(
    client: AsyncClient,
    method: str,
    path: str,
    json: dict[str, str] | None,
) -> None:
    response = await client.request(method, path, json=json)

    assert response.status_code == 401


async def test_lead_endpoint_rejects_invalid_token(client: AsyncClient) -> None:
    response = await client.get(
        "/api/v1/leads",
        headers={"Authorization": "Bearer token-invalido"},
    )

    assert response.status_code == 401


@pytest.mark.parametrize(
    ("role", "method", "path", "json"),
    [
        (UserRole.MANAGER, "DELETE", f"/api/v1/leads/{uuid4()}", None),
        (UserRole.VIEWER, "POST", "/api/v1/leads", {"name": "Lead"}),
        (
            UserRole.VIEWER,
            "PATCH",
            f"/api/v1/leads/{uuid4()}",
            {"name": "Atualizado"},
        ),
        (
            UserRole.VIEWER,
            "PATCH",
            f"/api/v1/leads/{uuid4()}/pipeline",
            {"pipeline_status": "WON"},
        ),
        (UserRole.VIEWER, "DELETE", f"/api/v1/leads/{uuid4()}", None),
    ],
)
async def test_crm_mutations_require_permission(
    client: AsyncClient,
    role: UserRole,
    method: str,
    path: str,
    json: dict[str, str] | None,
) -> None:
    authenticate_as(make_identity(role=role))

    response = await client.request(method, path, json=json)

    assert response.status_code == 403


async def test_viewer_can_view_crm(client: AsyncClient, monkeypatch: pytest.MonkeyPatch) -> None:
    identity = make_identity(role=UserRole.VIEWER)
    authenticate_as(identity)
    monkeypatch.setattr(LeadService, "list", lambda _db, _company_id: [])

    response = await client.get("/api/v1/leads")

    assert response.status_code == 200


@pytest.mark.parametrize(
    ("active", "company_status"),
    [
        (False, CompanyStatus.ACTIVE),
        (True, CompanyStatus.SUSPENDED),
    ],
)
async def test_leads_reject_blocked_identity(
    client: AsyncClient,
    monkeypatch: pytest.MonkeyPatch,
    active: bool,
    company_status: CompanyStatus,
) -> None:
    identity = make_identity(active=active, company_status=company_status)
    token = create_access_token(identity.user.id)
    monkeypatch.setattr(
        UserRepository,
        "get_by_id",
        lambda _db, _user_id: identity.user,
    )

    response = await client.get(
        "/api/v1/leads",
        headers={"Authorization": f"Bearer {token}"},
    )

    assert response.status_code == 401


async def test_unknown_company_query_cannot_select_tenant(
    client: AsyncClient,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    identity = make_identity()
    captured: list[UUID] = []
    authenticate_as(identity)

    def list_leads(_db: object, company_id: UUID) -> list[object]:
        captured.append(company_id)
        return []

    monkeypatch.setattr(LeadService, "list", list_leads)

    response = await client.get(
        "/api/v1/leads",
        params={"company_id": str(uuid4())},
    )

    assert response.status_code == 200
    assert captured == [identity.company.id]


async def test_create_forces_authenticated_tenant(
    client: AsyncClient,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    identity = make_identity()
    authenticate_as(identity)
    captured: dict[str, object] = {}

    def create(_db: object, company_id: UUID, data: object) -> dict[str, object]:
        captured["company_id"] = company_id
        captured["data"] = data
        return lead_response(company_id)

    monkeypatch.setattr(LeadService, "create", create)

    response = await client.post("/api/v1/leads", json={"name": "Lead"})

    assert response.status_code == 201
    assert captured["company_id"] == identity.company.id
    assert response.json()["company_id"] == str(identity.company.id)


async def test_create_rejects_company_id_as_unknown_input(client: AsyncClient) -> None:
    authenticate_as(make_identity())

    response = await client.post(
        "/api/v1/leads",
        json={"name": "Lead", "company_id": str(uuid4())},
    )

    assert response.status_code == 422


@pytest.mark.parametrize(
    "field",
    ["id", "company_id", "created_at", "updated_at", "deleted_at"],
)
async def test_create_rejects_protected_lead_fields(
    client: AsyncClient,
    field: str,
) -> None:
    authenticate_as(make_identity())

    response = await client.post(
        "/api/v1/leads",
        json={"name": "Lead", field: str(uuid4())},
    )

    assert response.status_code == 422


def test_openapi_has_no_company_id_input_contract() -> None:
    schema = app.openapi()
    protected_operations = [
        ("/api/v1/leads", "get"),
        ("/api/v1/leads/kanban", "get"),
        ("/api/v1/leads/{lead_id}", "get"),
        ("/api/v1/leads/{lead_id}", "patch"),
        ("/api/v1/leads/{lead_id}", "delete"),
        ("/api/v1/leads/{lead_id}/pipeline", "patch"),
        ("/api/v1/lead-history/lead/{lead_id}", "get"),
    ]

    for path, method in protected_operations:
        parameters = schema["paths"][path][method].get("parameters", [])
        assert all(parameter["name"] != "company_id" for parameter in parameters)

    lead_create = schema["components"]["schemas"]["LeadCreate"]
    assert "company_id" not in lead_create.get("properties", {})


@pytest.mark.parametrize("endpoint", ["list", "kanban"])
async def test_list_and_kanban_use_authenticated_tenant(
    client: AsyncClient,
    monkeypatch: pytest.MonkeyPatch,
    endpoint: str,
) -> None:
    company_a = uuid4()
    company_b = uuid4()
    identity_a = make_identity(company_a)
    identity_b = make_identity(company_b)
    captured: list[UUID] = []

    if endpoint == "list":
        def list_leads(_db: object, company_id: UUID) -> list[dict[str, object]]:
            captured.append(company_id)
            return [lead_response(company_id)]

        monkeypatch.setattr(LeadService, "list", list_leads)
        path = "/api/v1/leads"
    else:
        def kanban(_db: object, company_id: UUID) -> dict[str, list[object]]:
            captured.append(company_id)
            return {
                "NEW": [lead_response(company_id)],
                "CONTACTED": [],
                "QUALIFIED": [],
                "PROPOSAL": [],
                "WON": [],
                "LOST": [],
            }

        monkeypatch.setattr(LeadService, "get_kanban", kanban)
        path = "/api/v1/leads/kanban"

    authenticate_as(identity_a)
    response_a = await client.get(path)
    authenticate_as(identity_b)
    response_b = await client.get(path)

    assert response_a.status_code == 200
    assert response_b.status_code == 200
    assert captured == [company_a, company_b]
    assert str(company_b) not in response_a.text
    assert str(company_a) not in response_b.text


@pytest.mark.parametrize(
    ("method", "suffix", "json"),
    [
        ("GET", "", None),
        ("PATCH", "", {"name": "Atualizado"}),
        ("DELETE", "", None),
        ("PATCH", "/pipeline", {"pipeline_status": "WON"}),
    ],
)
async def test_cross_tenant_resource_by_id_returns_404(
    client: AsyncClient,
    monkeypatch: pytest.MonkeyPatch,
    method: str,
    suffix: str,
    json: dict[str, str] | None,
) -> None:
    identity_a = make_identity()
    lead_b_id = uuid4()
    captured: list[tuple[UUID, UUID]] = []
    authenticate_as(identity_a)

    def get_by_id(_db: object, company_id: UUID, lead_id: UUID) -> None:
        captured.append((company_id, lead_id))
        return None

    monkeypatch.setattr(LeadService, "get_by_id", get_by_id)

    response = await client.request(
        method,
        f"/api/v1/leads/{lead_b_id}{suffix}",
        json=json,
    )

    assert response.status_code == 404
    assert captured == [(identity_a.company.id, lead_b_id)]


async def test_pipeline_history_uses_authenticated_user(
    client: AsyncClient,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    identity = make_identity()
    lead_id = uuid4()
    lead = SimpleNamespace(
        id=lead_id,
        company_id=identity.company.id,
        pipeline_status="NEW",
    )
    authenticate_as(identity)
    captured: dict[str, object] = {}

    monkeypatch.setattr(LeadService, "get_by_id", lambda *_args: lead)

    def update_pipeline(
        _db: object,
        selected_lead: object,
        data: object,
        user_id: UUID,
    ) -> dict[str, object]:
        captured["lead"] = selected_lead
        captured["data"] = data
        captured["user_id"] = user_id
        result = lead_response(identity.company.id, lead_id)
        result["pipeline_status"] = "WON"
        return result

    monkeypatch.setattr(LeadService, "update_pipeline", update_pipeline)

    response = await client.patch(
        f"/api/v1/leads/{lead_id}/pipeline",
        json={"pipeline_status": "WON"},
    )

    assert response.status_code == 200
    assert captured["user_id"] == identity.user.id


async def test_pipeline_rejects_client_supplied_history_author(
    client: AsyncClient,
) -> None:
    authenticate_as(make_identity())

    response = await client.patch(
        f"/api/v1/leads/{uuid4()}/pipeline",
        json={"pipeline_status": "WON", "user_id": str(uuid4())},
    )

    assert response.status_code == 422


async def test_history_requires_lead_in_authenticated_tenant(
    client: AsyncClient,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    identity = make_identity()
    lead_b_id = uuid4()
    authenticate_as(identity)
    monkeypatch.setattr(LeadService, "get_by_id", lambda *_args: None)
    list_history = MagicMock()
    monkeypatch.setattr(LeadHistoryService, "list_by_lead", list_history)

    response = await client.get(f"/api/v1/lead-history/lead/{lead_b_id}")

    assert response.status_code == 404
    list_history.assert_not_called()


def test_service_pipeline_writes_authenticated_user_to_history(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    company_id = uuid4()
    authenticated_user_id = uuid4()
    lead = SimpleNamespace(
        id=uuid4(),
        company_id=company_id,
        pipeline_status="NEW",
    )
    db = MagicMock()
    captured: dict[str, object] = {}

    def create_history(
        _db: object,
        company_id: UUID,
        lead_id: UUID,
        user_id: UUID | None,
        data: object,
    ) -> object:
        captured["company_id"] = company_id
        captured["lead_id"] = lead_id
        captured["user_id"] = user_id
        captured["data"] = data
        return object()

    monkeypatch.setattr(LeadHistoryRepository, "create", create_history)

    LeadService.update_pipeline(
        db,
        lead,
        SimpleNamespace(pipeline_status="WON", user_id=uuid4()),
        authenticated_user_id,
    )

    history = captured["data"]
    assert captured["company_id"] == company_id
    assert captured["user_id"] == authenticated_user_id
    assert captured["lead_id"] == lead.id
    assert getattr(history, "company_id") == company_id
    assert getattr(history, "user_id") == authenticated_user_id
    assert getattr(history, "lead_id") == lead.id


def make_lead(company_id: UUID) -> Lead:
    now = datetime.now(timezone.utc)
    return Lead(
        id=uuid4(),
        company_id=company_id,
        name="Lead Exemplo",
        pipeline_status="NEW",
        created_at=now,
        updated_at=now,
        deleted_at=None,
    )


def test_repository_operational_queries_exclude_soft_deleted_leads() -> None:
    db = MagicMock()
    db.execute.return_value.scalar_one_or_none.return_value = None
    db.execute.return_value.scalars.return_value.all.return_value = []
    company_id = uuid4()

    LeadRepository.get_by_id(db, company_id, uuid4())
    detail_statement = str(db.execute.call_args.args[0])
    LeadRepository.list(db, company_id)
    list_statement = str(db.execute.call_args.args[0])

    for statement in (detail_statement, list_statement):
        assert "leads.company_id" in statement
        assert "leads.deleted_at IS NULL" in statement


def test_soft_delete_preserves_lead_and_historical_relationships(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    company_id = uuid4()
    user_id = uuid4()
    lead = make_lead(company_id)
    appointment = SimpleNamespace(lead_id=lead.id)
    history_rows = [SimpleNamespace(lead_id=lead.id)]
    tag_rows = [SimpleNamespace(lead_id=lead.id)]
    db = MagicMock()
    history_create = MagicMock()
    audit_add = MagicMock()
    monkeypatch.setattr(LeadHistoryRepository, "create", history_create)
    monkeypatch.setattr(AuditLogRepository, "add", audit_add)

    LeadService.delete(db, lead, user_id)

    assert lead.deleted_at is not None
    assert appointment.lead_id == lead.id
    assert history_rows[0].lead_id == lead.id
    assert tag_rows[0].lead_id == lead.id
    db.delete.assert_not_called()
    history = history_create.call_args.args[4]
    assert history.action == "LEAD_SOFT_DELETED"
    assert history.previous_value is None
    assert history.new_value is None
    assert audit_add.call_args.kwargs["details"] == {"state": "DELETED"}


async def test_delete_uses_authenticated_actor_and_repeated_delete_is_not_found(
    client: AsyncClient,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    identity = make_identity()
    lead = make_lead(identity.company.id)
    db = MagicMock()
    app.dependency_overrides[get_db] = lambda: db
    authenticate_as(identity)
    delete_service = MagicMock()
    calls = 0

    def get_operational(*_args):
        nonlocal calls
        calls += 1
        return lead if calls == 1 else None

    monkeypatch.setattr(LeadService, "get_by_id", get_operational)
    monkeypatch.setattr(LeadService, "delete", delete_service)

    first = await client.delete(f"/api/v1/leads/{lead.id}")
    second = await client.delete(f"/api/v1/leads/{lead.id}")

    assert first.status_code == 204
    assert second.status_code == 404
    assert delete_service.call_args.args[2] == identity.user.id
    db.commit.assert_called_once()


def test_lead_soft_delete_audit_metadata_is_sanitized() -> None:
    assert sanitize_audit_metadata(
        "LEAD_SOFT_DELETED",
        {
            "state": "DELETED",
            "name": "private",
            "email": "private@example.com",
            "phone": "private",
            "notes": "private",
        },
    ) == {"state": "DELETED"}

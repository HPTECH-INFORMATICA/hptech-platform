from collections.abc import AsyncIterator
from dataclasses import replace
from datetime import date, datetime, timedelta, timezone
from unittest.mock import MagicMock
from uuid import uuid4

import pytest
from httpx import ASGITransport, AsyncClient
from pydantic import ValidationError
from sqlalchemy.exc import SQLAlchemyError

from app.core.identity import (
    AuthenticatedIdentity,
    CompanyStatus,
    PermissionAction,
    PermissionModule,
    Permission,
    UserRole,
)
from app.core.rbac import has_permission, permissions_for_role
from app.db.session import get_db
from app.dependencies.auth import get_current_user
from app.main import app
from app.models.company import Company
from app.models.professional import Professional
from app.models.user import User
from app.repositories.audit_log import AuditLogRepository
from app.repositories.professional import ProfessionalRepository
from app.repositories.role_permission_override import RolePermissionOverrideRepository
from app.schemas.professional import (
    ProfessionalCreate,
    ProfessionalStatusUpdate,
    ProfessionalUpdate,
)
from app.services.audit_log import sanitize_audit_metadata
from app.services.permissions import effective_permissions
from app.services.professional import (
    ProfessionalDomain,
    ProfessionalNotFoundError,
    ProfessionalPersistenceError,
    ProfessionalUserConflictError,
    ProfessionalUserInactiveError,
    ProfessionalUserNotFoundError,
)


pytestmark = pytest.mark.anyio


def make_identity(
    role: UserRole = UserRole.OWNER,
    *,
    company_id=None,
) -> AuthenticatedIdentity:
    now = datetime.now(timezone.utc)
    company = Company(
        id=company_id or uuid4(),
        name="Empresa Exemplo",
        slug=f"empresa-{uuid4()}",
        status=CompanyStatus.ACTIVE,
        timezone="America/Sao_Paulo",
        created_at=now,
        updated_at=now,
    )
    user = User(
        id=uuid4(),
        company_id=company.id,
        name="Pessoa Exemplo",
        email=f"{uuid4()}@example.com",
        password_hash="hash-seguro-de-teste",
        role=role,
        is_active=True,
        created_at=now,
        updated_at=now,
    )
    user.company = company
    return AuthenticatedIdentity(
        user=user,
        company=company,
        role=role,
        permissions=permissions_for_role(role),
    )


def make_professional(
    identity: AuthenticatedIdentity,
    **values,
) -> Professional:
    now = datetime.now(timezone.utc)
    defaults = {
        "id": uuid4(),
        "company_id": identity.company.id,
        "user_id": None,
        "display_name": "Profissional Exemplo",
        "full_name": "Profissional Exemplo",
        "social_name": None,
        "cpf": None,
        "birth_date": None,
        "email": None,
        "phone": None,
        "whatsapp": None,
        "profession": None,
        "category": None,
        "administrative_notes": None,
        "is_active": True,
        "created_at": now,
        "updated_at": now,
        "deleted_at": None,
    }
    defaults.update(values)
    return Professional(**defaults)


def make_user(identity: AuthenticatedIdentity, **values) -> User:
    now = datetime.now(timezone.utc)
    defaults = {
        "id": uuid4(),
        "company_id": identity.company.id,
        "name": "Usuário Exemplo",
        "email": f"{uuid4()}@example.com",
        "password_hash": "hash-seguro-de-teste",
        "role": UserRole.VIEWER,
        "is_active": True,
        "created_at": now,
        "updated_at": now,
        "deleted_at": None,
    }
    defaults.update(values)
    return User(**defaults)


@pytest.fixture
async def client() -> AsyncIterator[AsyncClient]:
    app.dependency_overrides[get_db] = lambda: MagicMock()
    async with AsyncClient(
        transport=ASGITransport(app=app),
        base_url="http://testserver",
    ) as test_client:
        yield test_client
    app.dependency_overrides.clear()


async def test_routes_require_authentication(client: AsyncClient) -> None:
    assert (await client.get("/api/v1/professionals")).status_code == 401
    assert (
        await client.get("/api/v1/professionals/link-candidates")
    ).status_code == 401


async def test_link_candidates_use_professional_permissions_without_users_view(
    client: AsyncClient,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    manager = make_identity(UserRole.MANAGER)
    assert not has_permission(
        manager.permissions, PermissionModule.USERS, PermissionAction.VIEW
    )
    app.dependency_overrides[get_current_user] = lambda: manager
    monkeypatch.setattr(
        ProfessionalDomain,
        "list_user_candidates",
        lambda *_args, **_kwargs: {
            "items": [],
            "total": 0,
            "page": 1,
            "page_size": 20,
        },
    )

    response = await client.get("/api/v1/professionals/link-candidates")

    assert response.status_code == 200


async def test_link_candidates_require_create_or_update(
    client: AsyncClient,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    viewer = make_identity(UserRole.VIEWER)
    app.dependency_overrides[get_current_user] = lambda: viewer
    assert (
        await client.get("/api/v1/professionals/link-candidates")
    ).status_code == 403

    overridden = replace(
        viewer,
        permissions=viewer.permissions
        + (
            Permission(
                PermissionModule.PROFESSIONALS,
                frozenset({PermissionAction.CREATE}),
            ),
        ),
    )
    app.dependency_overrides[get_current_user] = lambda: overridden
    monkeypatch.setattr(
        ProfessionalDomain,
        "list_user_candidates",
        lambda *_args, **_kwargs: {
            "items": [],
            "total": 0,
            "page": 1,
            "page_size": 20,
        },
    )
    assert (
        await client.get("/api/v1/professionals/link-candidates")
    ).status_code == 200


@pytest.mark.parametrize(
    ("role", "actions"),
    [
        (UserRole.OWNER, {"VIEW", "CREATE", "UPDATE", "DELETE"}),
        (UserRole.ADMIN, {"VIEW", "CREATE", "UPDATE", "DELETE"}),
        (UserRole.MANAGER, {"VIEW", "CREATE", "UPDATE"}),
        (UserRole.RECEPTIONIST, {"VIEW", "CREATE", "UPDATE"}),
        (UserRole.PROFESSIONAL, {"VIEW"}),
        (UserRole.SALES, {"VIEW"}),
        (UserRole.FINANCIAL, {"VIEW"}),
        (UserRole.VIEWER, {"VIEW"}),
    ],
)
def test_role_policy(role: UserRole, actions: set[str]) -> None:
    permissions = permissions_for_role(role)
    for action in (
        PermissionAction.VIEW,
        PermissionAction.CREATE,
        PermissionAction.UPDATE,
        PermissionAction.DELETE,
    ):
        assert has_permission(
            permissions,
            PermissionModule.PROFESSIONALS,
            action,
        ) is (action.value in actions)


def test_effective_permissions_honor_overrides(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    allow_create = MagicMock(
        module="PROFESSIONALS",
        action="CREATE",
        allowed=True,
    )
    deny_update = MagicMock(
        module="PROFESSIONALS",
        action="UPDATE",
        allowed=False,
    )
    monkeypatch.setattr(
        RolePermissionOverrideRepository,
        "list_for_role",
        lambda _db, _company_id, role: (
            [allow_create] if role is UserRole.VIEWER else [deny_update]
        ),
    )
    viewer = effective_permissions(MagicMock(), uuid4(), UserRole.VIEWER)
    manager = effective_permissions(MagicMock(), uuid4(), UserRole.MANAGER)
    assert has_permission(
        viewer, PermissionModule.PROFESSIONALS, PermissionAction.CREATE
    )
    assert not has_permission(
        manager, PermissionModule.PROFESSIONALS, PermissionAction.UPDATE
    )


async def test_viewer_can_list_but_cannot_create(
    client: AsyncClient,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    app.dependency_overrides[get_current_user] = lambda: make_identity(UserRole.VIEWER)
    monkeypatch.setattr(
        ProfessionalDomain,
        "list",
        lambda *_args, **_kwargs: {
            "items": [],
            "total": 0,
            "page": 1,
            "page_size": 20,
        },
    )
    assert (await client.get("/api/v1/professionals")).status_code == 200
    assert (
        await client.post(
            "/api/v1/professionals",
            json={"display_name": "Profissional Exemplo"},
        )
    ).status_code == 403


@pytest.mark.parametrize(
    "extra",
    [
        "id",
        "company_id",
        "is_active",
        "created_at",
        "updated_at",
        "deleted_at",
        "role",
        "password_hash",
    ],
)
async def test_create_rejects_mass_assignment(
    client: AsyncClient,
    extra: str,
) -> None:
    app.dependency_overrides[get_current_user] = lambda: make_identity()
    response = await client.post(
        "/api/v1/professionals",
        json={"display_name": "Profissional Exemplo", extra: "forbidden"},
    )
    assert response.status_code == 422


def test_schemas_normalize_and_validate_contract() -> None:
    created = ProfessionalCreate(
        display_name="  Dra.   Marina  ",
        full_name="  Marina   de Souza  ",
        social_name="  Marina   Souza ",
        cpf="529.982.247-25",
        email="  MARINA@example.com ",
        phone="  (11) 99999-0000  ",
        profession="  Médica   Dermatologista ",
        administrative_notes="  Observação interna.  ",
    )
    assert created.display_name == "Dra. Marina"
    assert created.full_name == "Marina de Souza"
    assert created.social_name == "Marina Souza"
    assert created.cpf == "52998224725"
    assert str(created.email) == "marina@example.com"
    assert created.phone == "(11) 99999-0000"
    assert created.profession == "Médica Dermatologista"
    assert created.administrative_notes == "Observação interna."
    for value in ("", "   ", "\t\n"):
        with pytest.raises(ValidationError):
            ProfessionalCreate(display_name=value)
    for cpf in ("111.111.111-11", "123.456.789-00", "abc"):
        with pytest.raises(ValidationError):
            ProfessionalCreate(display_name="Profissional", cpf=cpf)
    with pytest.raises(ValidationError):
        ProfessionalCreate(
            display_name="Profissional",
            birth_date=date.today() + timedelta(days=1),
        )
    with pytest.raises(ValidationError):
        ProfessionalUpdate()
    with pytest.raises(ValidationError):
        ProfessionalUpdate(display_name=None)
    with pytest.raises(ValidationError):
        ProfessionalUpdate(full_name=None)
    assert ProfessionalUpdate(user_id=None).user_id is None


def test_create_without_user_is_tenant_scoped_and_audited(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    identity = make_identity()
    professional = make_professional(identity)
    repository = MagicMock(return_value=professional)
    audit = MagicMock()
    db = MagicMock()
    monkeypatch.setattr(ProfessionalRepository, "create", repository)
    monkeypatch.setattr(AuditLogRepository, "add", audit)

    result = ProfessionalDomain.create(
        db,
        identity,
        ProfessionalCreate(display_name="Profissional Exemplo"),
    )
    assert result is professional
    assert repository.call_args.args[1] == identity.company.id
    assert audit.call_args.kwargs["details"] == {"state": "ACTIVE"}
    db.commit.assert_called_once()


@pytest.mark.parametrize("role", list(UserRole))
def test_every_role_can_be_explicitly_linked(
    monkeypatch: pytest.MonkeyPatch,
    role: UserRole,
) -> None:
    identity = make_identity()
    user = make_user(identity, role=role)
    monkeypatch.setattr(
        ProfessionalRepository,
        "get_eligible_user",
        lambda *_args: user,
    )
    monkeypatch.setattr(
        ProfessionalRepository,
        "get_by_user_id",
        lambda *_args, **_kwargs: None,
    )
    ProfessionalDomain._validate_user(MagicMock(), identity.company.id, user.id)


def test_user_link_rejects_missing_inactive_and_duplicate(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    identity = make_identity()
    db = MagicMock()
    user_id = uuid4()
    monkeypatch.setattr(
        ProfessionalRepository, "get_eligible_user", lambda *_args: None
    )
    with pytest.raises(ProfessionalUserNotFoundError):
        ProfessionalDomain._validate_user(db, identity.company.id, user_id)

    inactive = make_user(identity, id=user_id, is_active=False)
    monkeypatch.setattr(
        ProfessionalRepository, "get_eligible_user", lambda *_args: inactive
    )
    with pytest.raises(ProfessionalUserInactiveError):
        ProfessionalDomain._validate_user(db, identity.company.id, user_id)

    linked = make_professional(identity, user_id=user_id)
    active = make_user(identity, id=user_id)
    monkeypatch.setattr(
        ProfessionalRepository, "get_eligible_user", lambda *_args: active
    )
    monkeypatch.setattr(
        ProfessionalRepository, "get_by_user_id", lambda *_args, **_kwargs: linked
    )
    with pytest.raises(ProfessionalUserConflictError):
        ProfessionalDomain._validate_user(db, identity.company.id, user_id)


def test_update_links_unlinks_relinks_and_audits_fields_only(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    identity = make_identity()
    first_user = make_user(identity)
    second_user = make_user(identity)
    professional = make_professional(identity)
    db = MagicMock()
    audit = MagicMock()
    monkeypatch.setattr(
        ProfessionalRepository,
        "get_by_id",
        lambda *_args, **_kwargs: professional,
    )
    monkeypatch.setattr(
        ProfessionalRepository,
        "get_eligible_user",
        lambda _db, _company_id, user_id: (
            first_user if user_id == first_user.id else second_user
        ),
    )
    monkeypatch.setattr(
        ProfessionalRepository,
        "get_by_user_id",
        lambda *_args, **_kwargs: None,
    )
    monkeypatch.setattr(AuditLogRepository, "add", audit)

    ProfessionalDomain.update(
        db, identity, professional.id, ProfessionalUpdate(user_id=first_user.id)
    )
    assert professional.user_id == first_user.id
    ProfessionalDomain.update(
        db, identity, professional.id, ProfessionalUpdate(user_id=second_user.id)
    )
    assert professional.user_id == second_user.id
    ProfessionalDomain.update(
        db, identity, professional.id, ProfessionalUpdate(user_id=None)
    )
    assert professional.user_id is None
    assert audit.call_args.kwargs["details"] == {"fields": ["user_id"]}
    assert str(first_user.id) not in str(audit.call_args)


def test_no_op_does_not_commit_or_audit(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    identity = make_identity()
    professional = make_professional(identity)
    db = MagicMock()
    audit = MagicMock()
    monkeypatch.setattr(
        ProfessionalRepository,
        "get_by_id",
        lambda *_args, **_kwargs: professional,
    )
    monkeypatch.setattr(AuditLogRepository, "add", audit)
    assert ProfessionalDomain.update(
        db,
        identity,
        professional.id,
        ProfessionalUpdate(display_name=professional.display_name),
    ) is professional
    assert ProfessionalDomain.change_status(
        db,
        identity,
        professional.id,
        ProfessionalStatusUpdate(is_active=True),
    ) is professional
    audit.assert_not_called()
    db.commit.assert_not_called()


def test_status_soft_delete_and_user_preservation(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    identity = make_identity()
    user = make_user(identity)
    professional = make_professional(identity, user_id=user.id)
    db = MagicMock()
    audit = MagicMock()
    monkeypatch.setattr(
        ProfessionalRepository,
        "get_by_id",
        lambda *_args, **_kwargs: professional,
    )
    monkeypatch.setattr(AuditLogRepository, "add", audit)
    ProfessionalDomain.change_status(
        db,
        identity,
        professional.id,
        ProfessionalStatusUpdate(is_active=False),
    )
    assert audit.call_args.kwargs["details"] == {
        "from": "ACTIVE",
        "to": "INACTIVE",
    }
    ProfessionalDomain.soft_delete(db, identity, professional.id)
    assert professional.deleted_at is not None
    assert professional.is_active is False
    assert professional.user_id == user.id
    assert user.deleted_at is None
    db.delete.assert_not_called()


def test_cross_tenant_and_soft_deleted_are_not_found(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    tenant_a = make_identity()
    tenant_b = make_identity()
    professional = make_professional(tenant_a)

    def scoped(_db, company_id, professional_id, **_kwargs):
        if company_id == tenant_a.company.id and professional_id == professional.id:
            return professional
        return None

    monkeypatch.setattr(ProfessionalRepository, "get_by_id", scoped)
    with pytest.raises(ProfessionalNotFoundError):
        ProfessionalDomain.detail(MagicMock(), tenant_b, professional.id)
    with pytest.raises(ProfessionalNotFoundError):
        ProfessionalDomain.update(
            MagicMock(),
            tenant_b,
            professional.id,
            ProfessionalUpdate(display_name="Outro"),
        )
    with pytest.raises(ProfessionalNotFoundError):
        ProfessionalDomain.change_status(
            MagicMock(),
            tenant_b,
            professional.id,
            ProfessionalStatusUpdate(is_active=False),
        )
    with pytest.raises(ProfessionalNotFoundError):
        ProfessionalDomain.soft_delete(MagicMock(), tenant_b, professional.id)


def test_repository_queries_are_tenant_scoped_and_search_profile() -> None:
    db = MagicMock()
    db.scalar.return_value = 0
    db.execute.return_value.scalars.return_value.all.return_value = []
    ProfessionalRepository.list_by_company(
        db,
        uuid4(),
        page=1,
        page_size=20,
        search="exemplo",
        is_active=True,
    )
    statements = [str(db.scalar.call_args.args[0]), str(db.execute.call_args.args[0])]
    assert all("professionals.company_id" in value for value in statements)
    assert all("professionals.deleted_at IS NULL" in value for value in statements)
    assert all("professionals.display_name" in value for value in statements)
    assert all("professionals.full_name" in value for value in statements)
    assert all("professionals.email" in value for value in statements)
    assert all("professionals.cpf" in value for value in statements)
    assert all("professionals.profession" in value for value in statements)
    assert all("users.email" not in value for value in statements)


def test_candidate_repository_is_scoped_searchable_and_excludes_ineligible() -> None:
    db = MagicMock()
    db.scalar.return_value = 0
    db.execute.return_value.scalars.return_value.all.return_value = []
    company_id = uuid4()
    professional_id = uuid4()
    current_user_id = uuid4()

    ProfessionalRepository.list_user_candidates(
        db,
        company_id,
        page=2,
        page_size=10,
        search="pessoa@example.com",
        current_professional_id=professional_id,
        current_user_id=current_user_id,
    )

    statements = [str(db.scalar.call_args.args[0]), str(db.execute.call_args.args[0])]
    assert all("users.company_id" in value for value in statements)
    assert all("users.deleted_at IS NULL" in value for value in statements)
    assert all("users.is_active" in value for value in statements)
    assert all("professionals.user_id = users.id" in value for value in statements)
    assert all("users.name" in value and "users.email" in value for value in statements)
    assert "OFFSET" in statements[1]


def test_candidate_domain_preserves_current_link_and_rejects_foreign_professional(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    identity = make_identity()
    linked_user = make_user(identity, is_active=False)
    professional = make_professional(identity, user_id=linked_user.id)
    repository = MagicMock(return_value=([linked_user], 1))
    monkeypatch.setattr(
        ProfessionalRepository,
        "get_by_id",
        lambda *_args, **_kwargs: professional,
    )
    monkeypatch.setattr(
        ProfessionalRepository,
        "list_user_candidates",
        repository,
    )

    result = ProfessionalDomain.list_user_candidates(
        MagicMock(),
        identity,
        page=1,
        page_size=20,
        search=None,
        professional_id=professional.id,
    )

    assert result.items[0].id == linked_user.id
    assert repository.call_args.kwargs["current_user_id"] == linked_user.id

    monkeypatch.setattr(
        ProfessionalRepository,
        "get_by_id",
        lambda *_args, **_kwargs: None,
    )
    with pytest.raises(ProfessionalNotFoundError):
        ProfessionalDomain.list_user_candidates(
            MagicMock(),
            identity,
            page=1,
            page_size=20,
            search=None,
            professional_id=uuid4(),
        )


def test_transaction_rolls_back_on_failure(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    identity = make_identity()
    professional = make_professional(identity)
    db = MagicMock()
    db.commit.side_effect = SQLAlchemyError()
    monkeypatch.setattr(
        ProfessionalRepository, "create", lambda *_args: professional
    )
    monkeypatch.setattr(AuditLogRepository, "add", lambda *_args, **_kwargs: None)
    with pytest.raises(ProfessionalPersistenceError):
        ProfessionalDomain.create(
            db,
            identity,
            ProfessionalCreate(display_name="Profissional Exemplo"),
        )
    db.rollback.assert_called_once()


@pytest.mark.parametrize(
    ("action", "details", "expected"),
    [
        (
            "PROFESSIONAL_CREATED",
            {"state": "ACTIVE", "display_name": "privado"},
            {"state": "ACTIVE"},
        ),
        (
            "PROFESSIONAL_UPDATED",
            {"fields": ["display_name"], "email": "private@example.com"},
            {"fields": ["display_name"]},
        ),
        (
            "PROFESSIONAL_STATUS_CHANGED",
            {"from": "ACTIVE", "to": "INACTIVE", "name": "privado"},
            {"from": "ACTIVE", "to": "INACTIVE"},
        ),
        (
            "PROFESSIONAL_SOFT_DELETED",
            {"state": "DELETED", "user_email": "private@example.com"},
            {"state": "DELETED"},
        ),
    ],
)
def test_audit_metadata_is_sanitized(action, details, expected) -> None:
    assert sanitize_audit_metadata(action, details) == expected


@pytest.mark.parametrize(
    ("error", "status_code"),
    [
        (ProfessionalUserNotFoundError(), 404),
        (ProfessionalUserInactiveError(), 409),
        (ProfessionalUserConflictError(), 409),
        (ProfessionalPersistenceError(), 409),
    ],
)
async def test_create_maps_domain_errors(
    client: AsyncClient,
    monkeypatch: pytest.MonkeyPatch,
    error: Exception,
    status_code: int,
) -> None:
    app.dependency_overrides[get_current_user] = lambda: make_identity()
    monkeypatch.setattr(
        ProfessionalDomain,
        "create",
        lambda *_args, **_kwargs: (_ for _ in ()).throw(error),
    )
    response = await client.post(
        "/api/v1/professionals",
        json={"display_name": "Profissional Exemplo"},
    )
    assert response.status_code == status_code

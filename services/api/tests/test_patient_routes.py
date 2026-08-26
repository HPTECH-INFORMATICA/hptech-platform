from collections.abc import AsyncIterator
from datetime import date, datetime, timedelta, timezone
from unittest.mock import MagicMock
from uuid import uuid4

import pytest
from httpx import ASGITransport, AsyncClient
from sqlalchemy.exc import SQLAlchemyError

from app.core.identity import (
    AuthenticatedIdentity,
    CompanyStatus,
    PermissionAction,
    PermissionModule,
    UserRole,
)
from app.core.rbac import has_permission, permissions_for_role
from app.db.session import get_db
from app.dependencies.auth import get_current_user
from app.main import app
from app.models.company import Company
from app.models.patient import Patient
from app.models.user import User
from app.repositories.audit_log import AuditLogRepository
from app.repositories.patient import PatientRepository
from app.repositories.role_permission_override import RolePermissionOverrideRepository
from app.schemas.patient import PatientCreate, PatientStatusUpdate, PatientUpdate
from app.services.audit_log import sanitize_audit_metadata
from app.services.permissions import effective_permissions
from app.services.patient import (
    PatientDomain,
    PatientLinkedLeadConflictError,
    PatientNotFoundError,
    PatientPersistenceError,
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


def make_patient(identity: AuthenticatedIdentity, **values) -> Patient:
    now = datetime.now(timezone.utc)
    defaults = {
        "id": uuid4(),
        "company_id": identity.company.id,
        "name": "Paciente Exemplo",
        "phone": None,
        "whatsapp": None,
        "email": None,
        "document": None,
        "birth_date": None,
        "is_active": True,
        "created_at": now,
        "updated_at": now,
        "deleted_at": None,
    }
    defaults.update(values)
    return Patient(**defaults)


@pytest.fixture
async def client() -> AsyncIterator[AsyncClient]:
    app.dependency_overrides[get_db] = lambda: MagicMock()
    async with AsyncClient(
        transport=ASGITransport(app=app),
        base_url="http://testserver",
    ) as test_client:
        yield test_client
    app.dependency_overrides.clear()


async def test_patients_require_authentication(client: AsyncClient) -> None:
    assert (await client.get("/api/v1/patients")).status_code == 401


@pytest.mark.parametrize(
    ("role", "actions"),
    [
        (UserRole.OWNER, {"VIEW", "CREATE", "UPDATE", "DELETE"}),
        (UserRole.ADMIN, {"VIEW", "CREATE", "UPDATE", "DELETE"}),
        (UserRole.MANAGER, {"VIEW", "CREATE", "UPDATE"}),
        (UserRole.RECEPTIONIST, {"VIEW", "CREATE", "UPDATE"}),
        (UserRole.PROFESSIONAL, {"VIEW", "UPDATE"}),
        (UserRole.SALES, {"VIEW", "CREATE"}),
        (UserRole.FINANCIAL, {"VIEW"}),
        (UserRole.VIEWER, {"VIEW"}),
    ],
)
def test_patients_role_policy(role: UserRole, actions: set[str]) -> None:
    permissions = permissions_for_role(role)
    for action in (
        PermissionAction.VIEW,
        PermissionAction.CREATE,
        PermissionAction.UPDATE,
        PermissionAction.DELETE,
    ):
        assert has_permission(
            permissions, PermissionModule.PATIENTS, action
        ) is (action.value in actions)


def test_patients_effective_permissions_honor_tenant_overrides(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    allow_create = MagicMock(
        module=PermissionModule.PATIENTS.value,
        action=PermissionAction.CREATE.value,
        allowed=True,
    )
    deny_update = MagicMock(
        module=PermissionModule.PATIENTS.value,
        action=PermissionAction.UPDATE.value,
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
        viewer, PermissionModule.PATIENTS, PermissionAction.CREATE
    )
    assert not has_permission(
        manager, PermissionModule.PATIENTS, PermissionAction.UPDATE
    )


async def test_viewer_can_list_but_cannot_create(
    client: AsyncClient,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    app.dependency_overrides[get_current_user] = lambda: make_identity(UserRole.VIEWER)
    monkeypatch.setattr(
        PatientDomain,
        "list",
        lambda *_args, **_kwargs: {
            "items": [],
            "total": 0,
            "page": 1,
            "page_size": 20,
        },
    )
    assert (await client.get("/api/v1/patients")).status_code == 200
    assert (
        await client.post("/api/v1/patients", json={"name": "Pessoa Exemplo"})
    ).status_code == 403


async def test_delete_linked_patient_returns_conflict(
    client: AsyncClient,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    app.dependency_overrides[get_current_user] = lambda: make_identity()

    def conflict(*_args):
        raise PatientLinkedLeadConflictError

    monkeypatch.setattr(PatientDomain, "soft_delete", conflict)
    response = await client.delete(f"/api/v1/patients/{uuid4()}")
    assert response.status_code == 409
    assert "vinculado" in response.json()["detail"]


@pytest.mark.parametrize(
    "extra",
    [
        "id",
        "company_id",
        "created_at",
        "updated_at",
        "deleted_at",
        "is_active",
        "role",
        "permissions",
    ],
)
async def test_create_rejects_mass_assignment(
    client: AsyncClient, extra: str
) -> None:
    app.dependency_overrides[get_current_user] = lambda: make_identity()
    assert (
        await client.post(
            "/api/v1/patients",
            json={"name": "Pessoa Exemplo", extra: "forbidden"},
        )
    ).status_code == 422


def test_create_normalizes_identity_fields() -> None:
    data = PatientCreate(
        name="  Pessoa   Exemplo  ",
        phone="  11 99999-0000  ",
        whatsapp="   ",
        email="  PESSOA@EXAMPLE.COM  ",
        document="  DOC-123  ",
    )
    assert data.name == "Pessoa Exemplo"
    assert data.phone == "11 99999-0000"
    assert data.whatsapp is None
    assert data.email == "pessoa@example.com"
    assert data.document == "DOC-123"


def test_future_birth_date_is_rejected() -> None:
    with pytest.raises(ValueError):
        PatientCreate(
            name="Pessoa Exemplo",
            birth_date=date.today() + timedelta(days=1),
        )


def test_update_requires_fields_and_non_null_name() -> None:
    with pytest.raises(ValueError):
        PatientUpdate()
    with pytest.raises(ValueError):
        PatientUpdate(name=None)


def test_create_is_tenant_scoped_and_audited(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    identity = make_identity()
    patient = make_patient(identity)
    repository = MagicMock(return_value=patient)
    audit = MagicMock()
    db = MagicMock()
    monkeypatch.setattr(PatientRepository, "create", repository)
    monkeypatch.setattr(AuditLogRepository, "add", audit)

    assert PatientDomain.create(
        db, identity, PatientCreate(name="Pessoa Exemplo")
    ) is patient
    assert repository.call_args.args[1] == identity.company.id
    assert audit.call_args.kwargs["action"] == "PATIENT_CREATED"
    assert audit.call_args.kwargs["details"] == {"state": "ACTIVE"}
    db.commit.assert_called_once()


def test_cross_tenant_operations_return_not_found(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    tenant_a = make_identity()
    tenant_b = make_identity()
    patient_a = make_patient(tenant_a)

    def tenant_scoped(_db, company_id, patient_id, **_kwargs):
        if company_id == tenant_a.company.id and patient_id == patient_a.id:
            return patient_a
        return None

    monkeypatch.setattr(PatientRepository, "get_by_id", tenant_scoped)
    db = MagicMock()
    with pytest.raises(PatientNotFoundError):
        PatientDomain.detail(db, tenant_b, patient_a.id)
    with pytest.raises(PatientNotFoundError):
        PatientDomain.update(db, tenant_b, patient_a.id, PatientUpdate(name="Outro"))
    with pytest.raises(PatientNotFoundError):
        PatientDomain.change_status(
            db,
            tenant_b,
            patient_a.id,
            PatientStatusUpdate(is_active=False),
        )
    with pytest.raises(PatientNotFoundError):
        PatientDomain.soft_delete(db, tenant_b, patient_a.id)


def test_update_audits_fields_without_values(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    identity = make_identity()
    patient = make_patient(identity)
    db = MagicMock()
    audit = MagicMock()
    monkeypatch.setattr(PatientRepository, "get_by_id", lambda *_args, **_kwargs: patient)
    monkeypatch.setattr(AuditLogRepository, "add", audit)

    PatientDomain.update(
        db,
        identity,
        patient.id,
        PatientUpdate(name="Novo Nome", email="novo@example.com"),
    )
    assert audit.call_args.kwargs["details"] == {"fields": ["name", "email"]}
    assert "Novo Nome" not in str(audit.call_args)
    assert "novo@example.com" not in str(audit.call_args)


def test_update_and_status_no_op_do_not_commit_or_audit(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    identity = make_identity()
    patient = make_patient(identity)
    db = MagicMock()
    audit = MagicMock()
    monkeypatch.setattr(PatientRepository, "get_by_id", lambda *_args, **_kwargs: patient)
    monkeypatch.setattr(AuditLogRepository, "add", audit)

    assert PatientDomain.update(
        db, identity, patient.id, PatientUpdate(name=patient.name)
    ) is patient
    assert PatientDomain.change_status(
        db, identity, patient.id, PatientStatusUpdate(is_active=True)
    ) is patient
    audit.assert_not_called()
    db.commit.assert_not_called()


def test_status_change_and_soft_delete_are_audited(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    identity = make_identity()
    patient = make_patient(identity)
    db = MagicMock()
    audit = MagicMock()
    monkeypatch.setattr(PatientRepository, "get_by_id", lambda *_args, **_kwargs: patient)
    monkeypatch.setattr(PatientRepository, "has_linked_leads", lambda *_args: False)
    monkeypatch.setattr(AuditLogRepository, "add", audit)

    PatientDomain.change_status(
        db, identity, patient.id, PatientStatusUpdate(is_active=False)
    )
    assert audit.call_args.kwargs["details"] == {"from": "ACTIVE", "to": "INACTIVE"}
    PatientDomain.soft_delete(db, identity, patient.id)
    assert patient.deleted_at is not None
    assert patient.is_active is False
    assert audit.call_args.kwargs["action"] == "PATIENT_SOFT_DELETED"
    assert audit.call_args.kwargs["details"] == {"state": "DELETED"}
    db.delete.assert_not_called()


def test_transaction_rolls_back_on_commit_failure(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    identity = make_identity()
    patient = make_patient(identity)
    db = MagicMock()
    db.commit.side_effect = SQLAlchemyError()
    monkeypatch.setattr(PatientRepository, "create", lambda *_args: patient)
    monkeypatch.setattr(AuditLogRepository, "add", lambda *_args, **_kwargs: None)

    with pytest.raises(PatientPersistenceError):
        PatientDomain.create(db, identity, PatientCreate(name="Pessoa Exemplo"))
    db.rollback.assert_called_once()


@pytest.mark.parametrize(
    "patient_values",
    [
        {},
        {"is_active": False},
    ],
)
def test_patient_linked_to_active_or_soft_deleted_lead_cannot_be_deleted(
    monkeypatch: pytest.MonkeyPatch,
    patient_values: dict,
) -> None:
    identity = make_identity()
    patient = make_patient(identity, **patient_values)
    db = MagicMock()
    audit = MagicMock()
    monkeypatch.setattr(PatientRepository, "get_by_id", lambda *_args, **_kwargs: patient)
    monkeypatch.setattr(PatientRepository, "has_linked_leads", lambda *_args: True)
    monkeypatch.setattr(AuditLogRepository, "add", audit)

    with pytest.raises(PatientLinkedLeadConflictError):
        PatientDomain.soft_delete(db, identity, patient.id)
    assert patient.deleted_at is None
    audit.assert_not_called()
    db.commit.assert_not_called()


def test_patient_without_link_can_still_be_soft_deleted(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    identity = make_identity()
    patient = make_patient(identity)
    db = MagicMock()
    monkeypatch.setattr(PatientRepository, "get_by_id", lambda *_args, **_kwargs: patient)
    monkeypatch.setattr(PatientRepository, "has_linked_leads", lambda *_args: False)
    monkeypatch.setattr(AuditLogRepository, "add", lambda *_args, **_kwargs: None)

    PatientDomain.soft_delete(db, identity, patient.id)
    assert patient.deleted_at is not None
    db.commit.assert_called_once()


def test_repository_queries_are_tenant_scoped_and_exclude_deleted() -> None:
    db = MagicMock()
    db.scalar.return_value = 0
    db.execute.return_value.scalars.return_value.all.return_value = []
    PatientRepository.list_by_company(
        db,
        uuid4(),
        page=1,
        page_size=20,
        search="pessoa",
        is_active=True,
    )
    statements = [str(db.scalar.call_args.args[0]), str(db.execute.call_args.args[0])]
    assert all("patients.company_id" in statement for statement in statements)
    assert all("patients.deleted_at IS NULL" in statement for statement in statements)
    assert all("patients.name" in statement for statement in statements)
    assert all("patients.document" in statement for statement in statements)


@pytest.mark.parametrize(
    ("action", "details", "expected"),
    [
        (
            "PATIENT_CREATED",
            {"state": "ACTIVE", "email": "private@example.com"},
            {"state": "ACTIVE"},
        ),
        (
            "PATIENT_UPDATED",
            {"fields": ["email"], "document": "private"},
            {"fields": ["email"]},
        ),
        (
            "PATIENT_STATUS_CHANGED",
            {"from": "ACTIVE", "to": "INACTIVE", "name": "private"},
            {"from": "ACTIVE", "to": "INACTIVE"},
        ),
        (
            "PATIENT_SOFT_DELETED",
            {"state": "DELETED", "phone": "private"},
            {"state": "DELETED"},
        ),
    ],
)
def test_patient_audit_metadata_is_sanitized(action, details, expected) -> None:
    assert sanitize_audit_metadata(action, details) == expected

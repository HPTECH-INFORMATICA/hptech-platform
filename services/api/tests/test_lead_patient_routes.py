from collections.abc import AsyncIterator
from datetime import datetime, timezone
from unittest.mock import MagicMock
from uuid import uuid4

import pytest
from httpx import ASGITransport, AsyncClient
from sqlalchemy.exc import SQLAlchemyError

from app.core.identity import (
    AuthenticatedIdentity,
    CompanyStatus,
    UserRole,
)
from app.core.rbac import permissions_for_role
from app.db.session import get_db
from app.dependencies.auth import get_current_user
from app.main import app
from app.models.company import Company
from app.models.lead import Lead
from app.models.patient import Patient
from app.models.user import User
from app.repositories.audit_log import AuditLogRepository
from app.repositories.lead import LeadRepository
from app.repositories.lead_history import LeadHistoryRepository
from app.repositories.patient import PatientRepository
from app.services.audit_log import sanitize_audit_metadata
from app.services.lead_patient import (
    LeadPatientConflictError,
    LeadPatientDependencyError,
    LeadPatientDomain,
    LeadPatientInactiveError,
    LeadPatientNotFoundError,
    LeadPatientPersistenceError,
)


pytestmark = pytest.mark.anyio


def make_identity(role: UserRole = UserRole.OWNER) -> AuthenticatedIdentity:
    now = datetime.now(timezone.utc)
    company = Company(
        id=uuid4(),
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


def make_lead(identity: AuthenticatedIdentity, **values) -> Lead:
    now = datetime.now(timezone.utc)
    defaults = {
        "id": uuid4(),
        "company_id": identity.company.id,
        "patient_id": None,
        "name": "Lead Exemplo",
        "phone": "11999990000",
        "whatsapp": "11988880000",
        "email": "lead@example.com",
        "birth_date": None,
        "source": "INDICAÇÃO",
        "interest": "Procedimento comercial",
        "pipeline_status": "NEW",
        "notes": "Nota comercial",
        "created_at": now,
        "updated_at": now,
        "deleted_at": None,
    }
    defaults.update(values)
    return Lead(**defaults)


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


async def test_link_routes_require_authentication(client: AsyncClient) -> None:
    lead_id = uuid4()
    patient_id = uuid4()
    assert (await client.get(f"/api/v1/leads/{lead_id}/patient-link")).status_code == 401
    assert (
        await client.post(f"/api/v1/leads/{lead_id}/patient-link", json={})
    ).status_code == 401
    assert (
        await client.put(
            f"/api/v1/leads/{lead_id}/patient-link/{patient_id}", json={}
        )
    ).status_code == 401
    assert (
        await client.delete(f"/api/v1/leads/{lead_id}/patient-link")
    ).status_code == 401


@pytest.mark.parametrize(
    ("role", "method", "path", "body", "expected"),
    [
        (UserRole.VIEWER, "GET", "", None, 200),
        (UserRole.VIEWER, "POST", "", {}, 403),
        (UserRole.SALES, "POST", "", {}, 200),
        (UserRole.VIEWER, "PUT", f"/{uuid4()}", {}, 403),
        (UserRole.MANAGER, "PUT", f"/{uuid4()}", {}, 200),
        (UserRole.SALES, "DELETE", "", None, 403),
        (UserRole.MANAGER, "DELETE", "", None, 204),
    ],
)
async def test_link_routes_require_combined_permissions(
    client: AsyncClient,
    monkeypatch: pytest.MonkeyPatch,
    role: UserRole,
    method: str,
    path: str,
    body: dict | None,
    expected: int,
) -> None:
    identity = make_identity(role)
    patient = make_patient(identity)
    app.dependency_overrides[get_current_user] = lambda: identity
    monkeypatch.setattr(LeadPatientDomain, "get_link", lambda *_args: None)
    monkeypatch.setattr(LeadPatientDomain, "create_from_lead", lambda *_args: patient)
    monkeypatch.setattr(LeadPatientDomain, "link_existing", lambda *_args: patient)
    monkeypatch.setattr(LeadPatientDomain, "unlink", lambda *_args: None)
    response = await client.request(
        method,
        f"/api/v1/leads/{uuid4()}/patient-link{path}",
        json=body,
    )
    assert response.status_code == expected


@pytest.mark.parametrize(
    "method",
    ["POST", "PUT"],
)
async def test_link_bodies_forbid_mass_assignment(
    client: AsyncClient,
    method: str,
) -> None:
    app.dependency_overrides[get_current_user] = lambda: make_identity()
    lead_id = uuid4()
    suffix = "" if method == "POST" else f"/{uuid4()}"
    for field in (
        "company_id",
        "patient_id",
        "name",
        "deleted_at",
        "role",
        "permissions",
    ):
        response = await client.request(
            method,
            f"/api/v1/leads/{lead_id}/patient-link{suffix}",
            json={field: str(uuid4())},
        )
        assert response.status_code == 422


async def test_get_link_returns_only_minimal_patient_summary(
    client: AsyncClient,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    identity = make_identity()
    patient = make_patient(
        identity,
        email="private@example.com",
        phone="private",
        document="private",
    )
    app.dependency_overrides[get_current_user] = lambda: identity
    monkeypatch.setattr(LeadPatientDomain, "get_link", lambda *_args: patient)
    response = await client.get(f"/api/v1/leads/{uuid4()}/patient-link")
    assert response.status_code == 200
    assert response.json() == {
        "linked": True,
        "patient": {
            "id": str(patient.id),
            "name": patient.name,
            "is_active": True,
        },
    }


def test_create_from_lead_copies_only_identity_snapshot(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    identity = make_identity()
    lead = make_lead(identity)
    patient = make_patient(identity)
    db = MagicMock()
    create = MagicMock(return_value=patient)
    history = MagicMock()
    audit = MagicMock()
    monkeypatch.setattr(LeadRepository, "get_by_id", lambda *_args, **_kwargs: lead)
    monkeypatch.setattr(PatientRepository, "create", create)
    monkeypatch.setattr(LeadHistoryRepository, "create", history)
    monkeypatch.setattr(AuditLogRepository, "add", audit)

    assert LeadPatientDomain.create_from_lead(db, identity, lead.id) is patient
    data = create.call_args.args[2]
    assert data.model_dump() == {
        "name": lead.name,
        "phone": lead.phone,
        "whatsapp": lead.whatsapp,
        "email": lead.email,
        "document": None,
        "birth_date": lead.birth_date,
    }
    assert lead.patient_id == patient.id
    assert lead.source not in str(data.model_dump())
    assert lead.interest not in str(data.model_dump())
    assert lead.notes not in str(data.model_dump())
    assert history.call_args.args[4].action == "PATIENT_LINKED"
    assert [call.kwargs["action"] for call in audit.call_args_list] == [
        "PATIENT_CREATED_FROM_LEAD",
        "LEAD_LINKED_TO_PATIENT",
    ]
    db.commit.assert_called_once()


def test_create_from_lead_rolls_back_atomically(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    identity = make_identity()
    lead = make_lead(identity)
    patient = make_patient(identity)
    db = MagicMock()
    db.commit.side_effect = SQLAlchemyError()
    monkeypatch.setattr(LeadRepository, "get_by_id", lambda *_args, **_kwargs: lead)
    monkeypatch.setattr(PatientRepository, "create", lambda *_args: patient)
    monkeypatch.setattr(LeadHistoryRepository, "create", lambda *_args: None)
    monkeypatch.setattr(AuditLogRepository, "add", lambda *_args, **_kwargs: None)

    with pytest.raises(LeadPatientPersistenceError):
        LeadPatientDomain.create_from_lead(db, identity, lead.id)
    db.rollback.assert_called()


def test_create_from_lead_is_idempotent_when_already_linked(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    identity = make_identity()
    patient = make_patient(identity, is_active=False)
    lead = make_lead(identity, patient_id=patient.id)
    db = MagicMock()
    create = MagicMock()
    history = MagicMock()
    audit = MagicMock()
    monkeypatch.setattr(LeadRepository, "get_by_id", lambda *_args, **_kwargs: lead)
    monkeypatch.setattr(PatientRepository, "get_by_id", lambda *_args, **_kwargs: patient)
    monkeypatch.setattr(PatientRepository, "create", create)
    monkeypatch.setattr(LeadHistoryRepository, "create", history)
    monkeypatch.setattr(AuditLogRepository, "add", audit)

    assert LeadPatientDomain.create_from_lead(db, identity, lead.id) is patient
    create.assert_not_called()
    history.assert_not_called()
    audit.assert_not_called()
    db.commit.assert_not_called()


def test_link_existing_is_tenant_scoped_and_locks_lead(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    identity = make_identity()
    lead = make_lead(identity)
    patient = make_patient(identity)
    db = MagicMock()
    get_lead = MagicMock(return_value=lead)
    get_patient = MagicMock(return_value=patient)
    monkeypatch.setattr(LeadRepository, "get_by_id", get_lead)
    monkeypatch.setattr(PatientRepository, "get_by_id", get_patient)
    monkeypatch.setattr(LeadHistoryRepository, "create", lambda *_args: None)
    monkeypatch.setattr(AuditLogRepository, "add", lambda *_args, **_kwargs: None)

    assert LeadPatientDomain.link_existing(
        db, identity, lead.id, patient.id
    ) is patient
    assert get_lead.call_args.args[1] == identity.company.id
    assert get_lead.call_args.kwargs["for_update"] is True
    assert get_patient.call_args.args[1] == identity.company.id
    assert lead.patient_id == patient.id


def test_cross_tenant_lead_or_patient_is_not_found(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    identity = make_identity()
    db = MagicMock()
    monkeypatch.setattr(LeadRepository, "get_by_id", lambda *_args, **_kwargs: None)
    with pytest.raises(LeadPatientNotFoundError):
        LeadPatientDomain.link_existing(db, identity, uuid4(), uuid4())

    lead = make_lead(identity)
    monkeypatch.setattr(LeadRepository, "get_by_id", lambda *_args, **_kwargs: lead)
    monkeypatch.setattr(PatientRepository, "get_by_id", lambda *_args, **_kwargs: None)
    with pytest.raises(LeadPatientNotFoundError):
        LeadPatientDomain.link_existing(db, identity, lead.id, uuid4())


def test_link_existing_rejects_inactive_patient(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    identity = make_identity()
    lead = make_lead(identity)
    patient = make_patient(identity, is_active=False)
    monkeypatch.setattr(LeadRepository, "get_by_id", lambda *_args, **_kwargs: lead)
    monkeypatch.setattr(PatientRepository, "get_by_id", lambda *_args, **_kwargs: patient)
    with pytest.raises(LeadPatientInactiveError):
        LeadPatientDomain.link_existing(MagicMock(), identity, lead.id, patient.id)
    assert lead.patient_id is None


def test_same_link_is_idempotent_without_history_or_audit(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    identity = make_identity()
    patient = make_patient(identity)
    lead = make_lead(identity, patient_id=patient.id)
    db = MagicMock()
    history = MagicMock()
    audit = MagicMock()
    monkeypatch.setattr(LeadRepository, "get_by_id", lambda *_args, **_kwargs: lead)
    monkeypatch.setattr(PatientRepository, "get_by_id", lambda *_args, **_kwargs: patient)
    monkeypatch.setattr(LeadHistoryRepository, "create", history)
    monkeypatch.setattr(AuditLogRepository, "add", audit)

    assert LeadPatientDomain.link_existing(
        db, identity, lead.id, patient.id
    ) is patient
    history.assert_not_called()
    audit.assert_not_called()
    db.commit.assert_not_called()


def test_different_link_conflicts_without_mutation(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    identity = make_identity()
    original_id = uuid4()
    lead = make_lead(identity, patient_id=original_id)
    audit = MagicMock()
    monkeypatch.setattr(LeadRepository, "get_by_id", lambda *_args, **_kwargs: lead)
    monkeypatch.setattr(AuditLogRepository, "add", audit)
    with pytest.raises(LeadPatientConflictError):
        LeadPatientDomain.link_existing(MagicMock(), identity, lead.id, uuid4())
    assert lead.patient_id == original_id
    audit.assert_not_called()


def test_unlink_is_audited_and_preserves_entities(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    identity = make_identity()
    patient_id = uuid4()
    lead = make_lead(identity, patient_id=patient_id)
    db = MagicMock()
    history = MagicMock()
    audit = MagicMock()
    monkeypatch.setattr(LeadRepository, "get_by_id", lambda *_args, **_kwargs: lead)
    monkeypatch.setattr(LeadRepository, "has_appointments", lambda *_args: False)
    monkeypatch.setattr(LeadHistoryRepository, "create", history)
    monkeypatch.setattr(AuditLogRepository, "add", audit)

    LeadPatientDomain.unlink(db, identity, lead.id)
    assert lead.patient_id is None
    assert history.call_args.args[4].action == "PATIENT_UNLINKED"
    assert audit.call_args.kwargs["action"] == "LEAD_UNLINKED_FROM_PATIENT"
    assert audit.call_args.kwargs["details"] == {"patient_id": str(patient_id)}
    db.delete.assert_not_called()


def test_unlink_with_appointment_is_blocked(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    identity = make_identity()
    patient_id = uuid4()
    lead = make_lead(identity, patient_id=patient_id)
    monkeypatch.setattr(LeadRepository, "get_by_id", lambda *_args, **_kwargs: lead)
    monkeypatch.setattr(LeadRepository, "has_appointments", lambda *_args: True)
    with pytest.raises(LeadPatientDependencyError):
        LeadPatientDomain.unlink(MagicMock(), identity, lead.id)
    assert lead.patient_id == patient_id


def test_repository_lock_and_dependency_queries_are_tenant_scoped() -> None:
    db = MagicMock()
    db.execute.return_value.scalar_one_or_none.return_value = None
    db.scalar.return_value = 0
    company_id = uuid4()
    LeadRepository.get_by_id(db, company_id, uuid4(), for_update=True)
    lock_statement = str(db.execute.call_args.args[0])
    LeadRepository.has_appointments(db, company_id, uuid4())
    appointment_statement = str(db.scalar.call_args.args[0])
    PatientRepository.has_linked_leads(db, company_id, uuid4())
    linked_statement = str(db.scalar.call_args.args[0])
    assert "FOR UPDATE" in lock_statement
    assert "leads.company_id" in lock_statement
    assert "leads.deleted_at IS NULL" in lock_statement
    assert "appointments.company_id" in appointment_statement
    assert "leads.company_id" in linked_statement
    assert "leads.deleted_at" not in linked_statement


@pytest.mark.parametrize(
    ("action", "details", "expected"),
    [
        (
            "PATIENT_CREATED_FROM_LEAD",
            {"lead_id": "technical", "state": "ACTIVE", "email": "private"},
            {"lead_id": "technical", "state": "ACTIVE"},
        ),
        (
            "LEAD_LINKED_TO_PATIENT",
            {"patient_id": "technical", "name": "private"},
            {"patient_id": "technical"},
        ),
        (
            "LEAD_UNLINKED_FROM_PATIENT",
            {"patient_id": "technical", "phone": "private"},
            {"patient_id": "technical"},
        ),
    ],
)
def test_link_audit_metadata_is_sanitized(action, details, expected) -> None:
    assert sanitize_audit_metadata(action, details) == expected

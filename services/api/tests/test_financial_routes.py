from collections.abc import AsyncIterator
from datetime import date, datetime, timezone
from decimal import Decimal
from types import SimpleNamespace
from unittest.mock import MagicMock
from uuid import uuid4

import pytest
from httpx import ASGITransport, AsyncClient
from pydantic import ValidationError

from app.core.identity import AuthenticatedIdentity, CompanyStatus, UserRole
from app.core.rbac import permissions_for_role
from app.db.session import get_db
from app.dependencies.auth import get_current_user
from app.main import app
from app.models.company import Company
from app.models.transaction import Transaction
from app.models.user import User
from app.repositories.appointment import AppointmentRepository
from app.repositories.audit_log import AuditLogRepository
from app.repositories.financial import FinancialRepository
from app.repositories.lead import LeadRepository
from app.schemas.financial import (
    FinancialTransactionCreate,
    FinancialTransactionListResponse,
    FinancialTransactionPayment,
    FinancialTransactionUpdate,
    TransactionStatus,
    TransactionType,
)
from app.services.financial import (
    FinancialDomain,
    FinancialLifecycleError,
    FinancialReferenceError,
)
from app.services.audit_log import sanitize_audit_metadata


pytestmark = pytest.mark.anyio


def make_identity(role: UserRole = UserRole.OWNER) -> AuthenticatedIdentity:
    now = datetime.now(timezone.utc)
    company = Company(
        id=uuid4(),
        name="Empresa Teste",
        slug=f"empresa-{uuid4()}",
        status=CompanyStatus.ACTIVE,
        timezone="America/Sao_Paulo",
        created_at=now,
        updated_at=now,
    )
    user = User(
        id=uuid4(),
        company_id=company.id,
        name="Pessoa Teste",
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


def make_transaction(identity: AuthenticatedIdentity, **values) -> Transaction:
    now = datetime.now(timezone.utc)
    defaults = {
        "id": uuid4(),
        "company_id": identity.company.id,
        "lead_id": None,
        "appointment_id": None,
        "description": "Consulta",
        "transaction_type": "INCOME",
        "category": "Atendimento",
        "amount": Decimal("150.00"),
        "due_date": date(2026, 9, 30),
        "paid_date": None,
        "status": "PENDING",
        "payment_method": None,
        "notes": None,
        "created_at": now,
        "updated_at": now,
        "deleted_at": None,
    }
    defaults.update(values)
    return Transaction(**defaults)


@pytest.fixture
async def client() -> AsyncIterator[AsyncClient]:
    app.dependency_overrides[get_db] = lambda: MagicMock()
    async with AsyncClient(
        transport=ASGITransport(app=app),
        base_url="http://testserver",
    ) as test_client:
        yield test_client
    app.dependency_overrides.clear()


def test_openapi_exposes_financial_contract() -> None:
    paths = {path for path in app.openapi()["paths"] if "/financial/" in path}
    assert paths == {
        "/api/v1/financial/transactions",
        "/api/v1/financial/transactions/{transaction_id}",
        "/api/v1/financial/transactions/{transaction_id}/pay",
        "/api/v1/financial/transactions/{transaction_id}/cancel",
    }


async def test_financial_routes_require_authentication(client: AsyncClient) -> None:
    assert (await client.get("/api/v1/financial/transactions")).status_code == 401


async def test_role_without_financial_access_is_rejected(client: AsyncClient) -> None:
    app.dependency_overrides[get_current_user] = lambda: make_identity(
        UserRole.VIEWER
    )
    assert (await client.get("/api/v1/financial/transactions")).status_code == 403


async def test_financial_role_can_list(
    client: AsyncClient,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    identity = make_identity(UserRole.FINANCIAL)
    app.dependency_overrides[get_current_user] = lambda: identity
    listing = MagicMock(
        return_value=FinancialTransactionListResponse(
            items=[], total=0, page=1, page_size=20
        )
    )
    monkeypatch.setattr(FinancialDomain, "list", listing)

    response = await client.get(
        "/api/v1/financial/transactions?type=INCOME&status=PENDING"
    )

    assert response.status_code == 200
    assert listing.call_args.kwargs["transaction_type"] is TransactionType.INCOME
    assert listing.call_args.kwargs["status"] is TransactionStatus.PENDING


async def test_receptionist_cannot_update_financial_entry(
    client: AsyncClient,
) -> None:
    app.dependency_overrides[get_current_user] = lambda: make_identity(
        UserRole.RECEPTIONIST
    )
    response = await client.patch(
        f"/api/v1/financial/transactions/{uuid4()}",
        json={"description": "Alterado"},
    )
    assert response.status_code == 403


@pytest.mark.parametrize(
    "field_name",
    ["company_id", "id", "status", "paid_date", "payment_method", "deleted_at"],
)
def test_create_rejects_backend_owned_fields(field_name: str) -> None:
    payload = {
        "transaction_type": "INCOME",
        "description": "Consulta",
        "amount": "150.00",
        "due_date": "2026-09-30",
        field_name: "forbidden",
    }
    with pytest.raises(ValidationError):
        FinancialTransactionCreate.model_validate(payload)


def test_financial_schemas_normalize_and_validate_values() -> None:
    data = FinancialTransactionCreate(
        transaction_type=TransactionType.INCOME,
        description="  Consulta  ",
        amount=Decimal("150.00"),
        due_date=date(2026, 9, 30),
        category="  Atendimento  ",
        notes="   ",
    )
    assert data.description == "Consulta"
    assert data.category == "Atendimento"
    assert data.notes is None
    with pytest.raises(ValidationError):
        FinancialTransactionCreate(
            transaction_type=TransactionType.EXPENSE,
            description="Despesa",
            amount=Decimal("0"),
            due_date=date(2026, 9, 30),
        )
    with pytest.raises(ValidationError):
        FinancialTransactionUpdate()


def test_create_derives_tenant_lead_from_appointment_and_audits(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    identity = make_identity()
    appointment_id = uuid4()
    lead_id = uuid4()
    monkeypatch.setattr(
        AppointmentRepository,
        "get_by_id",
        MagicMock(return_value=SimpleNamespace(lead_id=lead_id)),
    )
    monkeypatch.setattr(LeadRepository, "get_by_id", MagicMock())
    added: list[Transaction] = []

    def add(_db, transaction):
        transaction.id = uuid4()
        added.append(transaction)
        return transaction

    monkeypatch.setattr(FinancialRepository, "add", add)
    audit = MagicMock()
    monkeypatch.setattr(AuditLogRepository, "add", audit)
    db = MagicMock()

    result = FinancialDomain.create(
        db,
        identity,
        FinancialTransactionCreate(
            transaction_type=TransactionType.INCOME,
            description="Consulta",
            amount=Decimal("150.00"),
            due_date=date(2026, 9, 30),
            appointment_id=appointment_id,
        ),
    )

    assert result is added[0]
    assert result.company_id == identity.company.id
    assert result.lead_id == lead_id
    assert result.status == "PENDING"
    assert audit.call_args.kwargs["action"] == "FINANCIAL_TRANSACTION_CREATED"
    db.commit.assert_called_once()


def test_create_rejects_mismatched_lead_and_appointment(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    identity = make_identity()
    explicit_lead = uuid4()
    monkeypatch.setattr(
        LeadRepository,
        "get_by_id",
        MagicMock(return_value=SimpleNamespace(id=explicit_lead)),
    )
    monkeypatch.setattr(
        AppointmentRepository,
        "get_by_id",
        MagicMock(return_value=SimpleNamespace(lead_id=uuid4())),
    )

    with pytest.raises(FinancialReferenceError):
        FinancialDomain.create(
            MagicMock(),
            identity,
            FinancialTransactionCreate(
                transaction_type=TransactionType.INCOME,
                description="Consulta",
                amount=Decimal("150.00"),
                due_date=date(2026, 9, 30),
                lead_id=explicit_lead,
                appointment_id=uuid4(),
            ),
        )


def test_pay_transitions_pending_and_audits(monkeypatch: pytest.MonkeyPatch) -> None:
    identity = make_identity()
    transaction = make_transaction(identity)
    monkeypatch.setattr(
        FinancialRepository,
        "get_by_id",
        MagicMock(return_value=transaction),
    )
    audit = MagicMock()
    monkeypatch.setattr(AuditLogRepository, "add", audit)
    db = MagicMock()

    result = FinancialDomain.pay(
        db,
        identity,
        transaction.id,
        FinancialTransactionPayment(
            paid_date=date(2026, 9, 29),
            payment_method="PIX",
        ),
    )

    assert result.status == "PAID"
    assert result.paid_date == date(2026, 9, 29)
    assert result.payment_method == "PIX"
    assert audit.call_args.kwargs["action"] == "FINANCIAL_TRANSACTION_PAID"


def test_paid_transaction_is_immutable_and_not_deletable(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    identity = make_identity()
    transaction = make_transaction(
        identity,
        status="PAID",
        paid_date=date(2026, 9, 29),
        payment_method="PIX",
    )
    monkeypatch.setattr(
        FinancialRepository,
        "get_by_id",
        MagicMock(return_value=transaction),
    )

    with pytest.raises(FinancialLifecycleError):
        FinancialDomain.update(
            MagicMock(),
            identity,
            transaction.id,
            FinancialTransactionUpdate(description="Alterado"),
        )
    with pytest.raises(FinancialLifecycleError):
        FinancialDomain.soft_delete(MagicMock(), identity, transaction.id)


def test_list_rejects_inverted_period() -> None:
    with pytest.raises(FinancialLifecycleError):
        FinancialDomain.list(
            MagicMock(),
            make_identity(),
            due_from=date(2026, 10, 1),
            due_to=date(2026, 9, 1),
            transaction_type=None,
            status=None,
            page=1,
            page_size=20,
        )


def test_financial_audit_metadata_is_allowlisted() -> None:
    assert sanitize_audit_metadata(
        "FINANCIAL_TRANSACTION_CREATED",
        {"type": "INCOME", "status": "PENDING", "amount": "150.00"},
    ) == {"type": "INCOME", "status": "PENDING"}
    assert sanitize_audit_metadata(
        "FINANCIAL_TRANSACTION_UPDATED",
        {"fields": ["description"], "notes": "sensitive"},
    ) == {"fields": ["description"]}

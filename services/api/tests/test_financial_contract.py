from sqlalchemy import CheckConstraint, UniqueConstraint, inspect

from app.db import base as _models  # noqa: F401
from app.models.lead import Lead
from app.models.transaction import Transaction


def _foreign_keys(model: type[object]) -> dict[str, object]:
    return {
        constraint.name: constraint
        for constraint in model.__table__.foreign_key_constraints
    }


def test_transaction_references_are_tenant_safe() -> None:
    foreign_keys = _foreign_keys(Transaction)
    expected = {
        "fk_transactions_company_lead": ("company_id", "lead_id"),
        "fk_transactions_company_appointment": (
            "company_id",
            "appointment_id",
        ),
    }

    for constraint_name, columns in expected.items():
        constraint = foreign_keys[constraint_name]
        assert tuple(constraint.column_keys) == columns
        assert constraint.ondelete == "RESTRICT"


def test_transaction_has_tenant_qualified_identity() -> None:
    unique_constraints = {
        constraint.name: tuple(constraint.columns.keys())
        for constraint in Transaction.__table__.constraints
        if isinstance(constraint, UniqueConstraint)
    }

    assert unique_constraints["uq_transactions_company_id_id"] == (
        "company_id",
        "id",
    )


def test_transaction_value_contract_is_registered() -> None:
    checks = {
        constraint.name: str(constraint.sqltext)
        for constraint in Transaction.__table__.constraints
        if isinstance(constraint, CheckConstraint)
    }

    assert checks == {
        "ck_transactions_type": "transaction_type IN ('INCOME', 'EXPENSE')",
        "ck_transactions_status": (
            "status IN ('PENDING', 'PAID', 'CANCELED')"
        ),
        "ck_transactions_amount_positive": "amount > 0",
        "ck_transactions_paid_date_matches_status": (
            "(status = 'PAID' AND paid_date IS NOT NULL) OR "
            "(status <> 'PAID' AND paid_date IS NULL)"
        ),
    }


def test_transaction_relationships_keep_company_in_the_join() -> None:
    transaction_join = str(inspect(Transaction).relationships["lead"].primaryjoin)
    lead_join = str(inspect(Lead).relationships["transactions"].primaryjoin)

    assert "transactions.company_id" in transaction_join
    assert "leads.company_id" in transaction_join
    assert "transactions.company_id" in lead_join
    assert "leads.company_id" in lead_join

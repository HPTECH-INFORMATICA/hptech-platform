from sqlalchemy import CheckConstraint, inspect

from app.db import base as _models  # noqa: F401
from app.models.appointment import Appointment
from app.models.transaction import Transaction


def _foreign_keys(model: type[object]) -> dict[str, object]:
    return {
        constraint.name: constraint
        for constraint in model.__table__.foreign_key_constraints
    }


def test_appointment_clinical_fields_are_required() -> None:
    required_columns = {
        "patient_id",
        "clinical_professional_id",
        "service_id",
        "service_name_snapshot",
        "service_duration_minutes_snapshot",
        "service_price_snapshot",
    }

    assert all(
        not Appointment.__table__.columns[column_name].nullable
        for column_name in required_columns
    )


def test_appointment_foreign_keys_are_tenant_safe_and_restrict_deletion() -> None:
    foreign_keys = _foreign_keys(Appointment)
    expected = {
        "fk_appointments_company_lead": ("company_id", "lead_id"),
        "fk_appointments_company_legacy_professional": (
            "company_id",
            "professional_id",
        ),
        "fk_appointments_company_patient": ("company_id", "patient_id"),
        "fk_appointments_company_clinical_professional": (
            "company_id",
            "clinical_professional_id",
        ),
        "fk_appointments_company_service": ("company_id", "service_id"),
    }

    for constraint_name, columns in expected.items():
        constraint = foreign_keys[constraint_name]
        assert tuple(constraint.column_keys) == columns
        assert constraint.ondelete == "RESTRICT"


def test_transaction_appointment_foreign_key_is_tenant_safe() -> None:
    constraint = _foreign_keys(Transaction)[
        "fk_transactions_company_appointment"
    ]

    assert tuple(constraint.column_keys) == ("company_id", "appointment_id")
    assert constraint.ondelete == "RESTRICT"


def test_appointment_value_contract_checks_are_registered() -> None:
    checks = {
        constraint.name: str(constraint.sqltext)
        for constraint in Appointment.__table__.constraints
        if isinstance(constraint, CheckConstraint)
    }

    assert checks == {
        "ck_appointments_ends_after_starts": "ends_at > starts_at",
        "ck_appointments_service_duration_positive": (
            "service_duration_minutes_snapshot > 0"
        ),
        "ck_appointments_service_price_nonnegative": (
            "service_price_snapshot >= 0"
        ),
        "ck_appointments_status_lifecycle": (
            "status IN ('SCHEDULED', 'CONFIRMED', 'IN_PROGRESS', "
            "'COMPLETED', 'CANCELED', 'NO_SHOW')"
        ),
    }


def test_appointment_relationships_keep_company_in_the_join() -> None:
    appointment_relationships = inspect(Appointment).relationships
    transaction_relationships = inspect(Transaction).relationships

    for relationship_name in (
        "lead",
        "professional",
        "patient",
        "clinical_professional",
        "service",
    ):
        join = str(appointment_relationships[relationship_name].primaryjoin)
        assert "appointments.company_id" in join

    transaction_join = str(
        transaction_relationships["appointment"].primaryjoin
    )
    assert "transactions.company_id" in transaction_join

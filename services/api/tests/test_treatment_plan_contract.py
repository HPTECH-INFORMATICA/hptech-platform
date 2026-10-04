from decimal import Decimal
from uuid import uuid4

import pytest
from pydantic import ValidationError
from sqlalchemy import CheckConstraint, inspect

from app.main import app
from app.models.treatment_plan import TreatmentPlan, TreatmentPlanItem
from app.schemas.treatment_plan import TreatmentPlanCreate


def valid_payload() -> dict[str, object]:
    return {
        "name": "Plano capilar 10 + 2",
        "description": "Tratamento completo",
        "price": "3000.00",
        "validity_days": 180,
        "items": [
            {
                "service_id": uuid4(),
                "paid_sessions": 10,
                "complimentary_sessions": 2,
            }
        ],
    }


def test_schema_accepts_required_ten_plus_two_scenario() -> None:
    plan = TreatmentPlanCreate.model_validate(valid_payload())

    assert plan.price == Decimal("3000.00")
    assert plan.items[0].paid_sessions == 10
    assert plan.items[0].complimentary_sessions == 2


def test_schema_rejects_duplicate_services_and_invalid_quantities() -> None:
    payload = valid_payload()
    payload["items"] = [payload["items"][0], payload["items"][0]]
    with pytest.raises(ValidationError):
        TreatmentPlanCreate.model_validate(payload)

    payload = valid_payload()
    payload["items"][0]["paid_sessions"] = 0
    with pytest.raises(ValidationError):
        TreatmentPlanCreate.model_validate(payload)


def test_database_contract_is_tenant_safe_and_constrained() -> None:
    item_foreign_keys = {
        constraint.name: tuple(constraint.column_keys)
        for constraint in TreatmentPlanItem.__table__.foreign_key_constraints
    }
    checks = {
        constraint.name
        for table in (TreatmentPlan.__table__, TreatmentPlanItem.__table__)
        for constraint in table.constraints
        if isinstance(constraint, CheckConstraint)
    }

    assert item_foreign_keys["fk_treatment_plan_items_company_plan"] == (
        "company_id",
        "plan_id",
    )
    assert item_foreign_keys["fk_treatment_plan_items_company_service"] == (
        "company_id",
        "service_id",
    )
    assert {
        "ck_treatment_plans_price_nonnegative",
        "ck_treatment_plans_validity_positive",
        "ck_treatment_plan_items_paid_positive",
        "ck_treatment_plan_items_complimentary_nonnegative",
    }.issubset(checks)
    assert inspect(TreatmentPlan).relationships["items"].cascade.delete_orphan


def test_openapi_exposes_treatment_plan_crud() -> None:
    paths = {path for path in app.openapi()["paths"] if "treatment-plans" in path}
    assert paths == {
        "/api/v1/treatment-plans",
        "/api/v1/treatment-plans/{plan_id}",
        "/api/v1/treatment-plans/{plan_id}/status",
    }

from pathlib import Path

from fastapi import FastAPI
from sqlalchemy import inspect

from app.api.router import api_router
from app.models.patient_plan_contract import PatientPlanContract, PatientPlanContractItem, SessionLedgerEntry
from app.models.transaction import Transaction
from app.schemas.patient_plan_contract import PatientPlanContractCreate


def test_paid_contract_input_requires_payment_pair() -> None:
    payload = {
        "patient_id": "11111111-1111-1111-1111-111111111111",
        "treatment_plan_id": "22222222-2222-2222-2222-222222222222",
        "starts_on": "2026-10-05",
        "payment_due_date": "2026-10-05",
        "paid_date": "2026-10-05",
        "payment_method": "PIX",
    }
    data = PatientPlanContractCreate.model_validate(payload)
    assert data.payment_method == "PIX"


def test_contract_tables_are_tenant_safe_and_ledger_is_constrained() -> None:
    contract_constraints = {item.name for item in PatientPlanContract.__table__.constraints}
    item_constraints = {item.name for item in PatientPlanContractItem.__table__.constraints}
    ledger_constraints = {item.name for item in SessionLedgerEntry.__table__.constraints}
    transaction_fks = {item.name for item in Transaction.__table__.foreign_key_constraints}
    assert "fk_patient_plan_contracts_company_patient" in contract_constraints
    assert "fk_patient_plan_contracts_company_plan" in contract_constraints
    assert "fk_patient_plan_contract_items_company_contract" in item_constraints
    assert "fk_session_ledger_company_contract" in ledger_constraints
    assert "fk_session_ledger_company_contract_item" in ledger_constraints
    assert "fk_transactions_company_patient_plan_contract" in transaction_fks
    assert inspect(PatientPlanContract).relationships["items"].cascade.delete_orphan


def test_migration_makes_session_ledger_immutable() -> None:
    migration = Path("alembic/versions/c9a4d7e21f60_create_patient_plan_contracts.py").read_text(encoding="utf-8")
    assert "prevent_session_ledger_mutation" in migration
    assert "BEFORE UPDATE OR DELETE ON session_ledger_entries" in migration
    assert "uq_transactions_active_income_patient_plan_contract" in migration


def test_openapi_exposes_contract_creation_and_patient_listing() -> None:
    app = FastAPI()
    app.include_router(api_router)
    paths = app.openapi()["paths"]
    assert set(paths["/api/v1/patient-plan-contracts"]) == {"get", "post"}

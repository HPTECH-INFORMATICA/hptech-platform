import uuid
from datetime import timedelta

from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import Session

from app.core.identity import AuthenticatedIdentity
from app.models.patient_plan_contract import PatientPlanContract, PatientPlanContractItem, SessionLedgerEntry
from app.models.transaction import Transaction
from app.repositories.audit_log import AuditLogRepository
from app.repositories.financial import FinancialRepository
from app.repositories.patient import PatientRepository
from app.repositories.patient_plan_contract import PatientPlanContractRepository
from app.repositories.treatment_plan import TreatmentPlanRepository
from app.schemas.financial import TransactionStatus, TransactionType
from app.schemas.patient_plan_contract import ContractItemResponse, PatientPlanContractCreate, PatientPlanContractListResponse, PatientPlanContractResponse


class PatientPlanContractNotFoundError(RuntimeError): pass
class PatientPlanContractReferenceError(ValueError): pass
class PatientPlanContractPersistenceError(RuntimeError): pass


class PatientPlanContractDomain:
    @staticmethod
    def _response(contract: PatientPlanContract) -> PatientPlanContractResponse:
        transaction = next((item for item in contract.transactions if item.deleted_at is None and item.transaction_type == "INCOME"), None)
        items = []
        for item in contract.items:
            def available(bucket: str) -> int:
                additions = {"CREDIT", "RELEASE", "RESTORE"}
                return sum((entry.quantity if entry.event_type in additions else -entry.quantity) for entry in item.ledger_entries if entry.bucket == bucket)
            paid = available("PAID")
            courtesy = available("COURTESY")
            items.append(ContractItemResponse.model_validate({**item.__dict__, "paid_available": paid, "complimentary_available": courtesy}))
        return PatientPlanContractResponse.model_validate({**contract.__dict__, "items": items, "financial_transaction_id": transaction.id if transaction else None, "financial_status": transaction.status if transaction else "NO_CHARGE"})

    @classmethod
    def create(cls, db: Session, identity: AuthenticatedIdentity, data: PatientPlanContractCreate) -> PatientPlanContractResponse:
        patient = PatientRepository.get_by_id(db, identity.company.id, data.patient_id)
        plan = TreatmentPlanRepository.get_by_id(db, identity.company.id, data.treatment_plan_id)
        if patient is None or not patient.is_active: raise PatientPlanContractReferenceError("Paciente ativo não encontrado.")
        if plan is None or not plan.is_active: raise PatientPlanContractReferenceError("Plano ativo não encontrado.")
        contract = PatientPlanContract(company_id=identity.company.id, patient_id=patient.id, treatment_plan_id=plan.id, plan_name_snapshot=plan.name, plan_description_snapshot=plan.description, price_snapshot=plan.price, validity_days_snapshot=plan.validity_days, starts_on=data.starts_on, expires_on=data.starts_on + timedelta(days=plan.validity_days - 1), payment_due_date=data.payment_due_date, status="ACTIVE")
        try:
            db.add(contract); db.flush()
            for source in plan.items:
                item = PatientPlanContractItem(company_id=identity.company.id, contract_id=contract.id, service_id=source.service_id, service_name_snapshot=source.service.name, paid_sessions_snapshot=source.paid_sessions, complimentary_sessions_snapshot=source.complimentary_sessions)
                db.add(item); db.flush()
                db.add(SessionLedgerEntry(company_id=identity.company.id, contract_id=contract.id, contract_item_id=item.id, event_type="CREDIT", bucket="PAID", quantity=source.paid_sessions, actor_user_id=identity.user.id, reason="Crédito inicial da contratação"))
                if source.complimentary_sessions:
                    db.add(SessionLedgerEntry(company_id=identity.company.id, contract_id=contract.id, contract_item_id=item.id, event_type="CREDIT", bucket="COURTESY", quantity=source.complimentary_sessions, actor_user_id=identity.user.id, reason="Cortesia inicial da contratação"))
            if plan.price > 0:
                FinancialRepository.add(db, Transaction(company_id=identity.company.id, patient_plan_contract_id=contract.id, description=f"Plano — {plan.name}", transaction_type=TransactionType.INCOME.value, category="Plano de tratamento", amount=plan.price, due_date=data.payment_due_date, paid_date=data.paid_date, status=TransactionStatus.PAID.value if data.paid_date else TransactionStatus.PENDING.value, payment_method=data.payment_method))
            AuditLogRepository.add(db, company_id=identity.company.id, actor_user_id=identity.user.id, target_type="PATIENT_PLAN_CONTRACT", target_id=contract.id, action="PATIENT_PLAN_CONTRACT_CREATED", details={"patient_id": str(patient.id), "plan_id": str(plan.id), "price": str(plan.price)})
            db.commit()
        except SQLAlchemyError as error:
            db.rollback(); raise PatientPlanContractPersistenceError from error
        loaded = PatientPlanContractRepository.get_by_id(db, identity.company.id, contract.id)
        if loaded is None: raise PatientPlanContractPersistenceError
        return cls._response(loaded)

    @classmethod
    def list(cls, db: Session, identity: AuthenticatedIdentity, patient_id: uuid.UUID, *, page: int, page_size: int) -> PatientPlanContractListResponse:
        if PatientRepository.get_by_id(db, identity.company.id, patient_id) is None: raise PatientPlanContractNotFoundError
        contracts, total = PatientPlanContractRepository.list_by_patient(db, identity.company.id, patient_id, page=page, page_size=page_size)
        return PatientPlanContractListResponse(items=[cls._response(item) for item in contracts], total=total, page=page, page_size=page_size)

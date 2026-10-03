import uuid
from datetime import UTC, date, datetime
from decimal import Decimal

from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import Session

from app.core.identity import AuthenticatedIdentity, UserRole
from app.models.transaction import Transaction
from app.repositories.appointment import AppointmentRepository
from app.repositories.audit_log import AuditLogRepository
from app.repositories.financial import FinancialRepository
from app.repositories.lead import LeadRepository
from app.schemas.financial import (
    FinancialTransactionCreate,
    FinancialTransactionListResponse,
    FinancialTransactionPayment,
    FinancialTransactionResponse,
    FinancialTransactionUpdate,
    FinancialSummaryResponse,
    TransactionStatus,
    TransactionType,
)


class FinancialNotFoundError(RuntimeError):
    pass


class FinancialReferenceError(ValueError):
    pass


class FinancialLifecycleError(ValueError):
    pass


class FinancialPersistenceError(RuntimeError):
    pass


class FinancialDomain:
    @staticmethod
    def _commit(db: Session, transaction: Transaction) -> Transaction:
        try:
            db.commit()
            db.refresh(transaction)
            return transaction
        except SQLAlchemyError as error:
            db.rollback()
            raise FinancialPersistenceError from error

    @staticmethod
    def _transaction(
        db: Session,
        identity: AuthenticatedIdentity,
        transaction_id: uuid.UUID,
        *,
        lock: bool = False,
    ) -> Transaction:
        transaction = FinancialRepository.get_by_id(
            db,
            identity.company.id,
            transaction_id,
            for_update=lock,
        )
        if transaction is None:
            raise FinancialNotFoundError
        return transaction

    @staticmethod
    def _resolve_references(
        db: Session,
        identity: AuthenticatedIdentity,
        lead_id: uuid.UUID | None,
        appointment_id: uuid.UUID | None,
    ) -> uuid.UUID | None:
        company_id = identity.company.id
        lead = (
            LeadRepository.get_by_id(db, company_id, lead_id)
            if lead_id is not None
            else None
        )
        if lead_id is not None and lead is None:
            raise FinancialReferenceError("Lead não encontrado.")

        appointment = (
            AppointmentRepository.get_by_id(db, company_id, appointment_id)
            if appointment_id is not None
            else None
        )
        if appointment_id is not None and appointment is None:
            raise FinancialReferenceError("Agendamento não encontrado.")
        if appointment is None or appointment.lead_id is None:
            return lead_id
        if lead_id is not None and lead_id != appointment.lead_id:
            raise FinancialReferenceError(
                "Lead e agendamento não pertencem ao mesmo atendimento."
            )
        return appointment.lead_id

    @staticmethod
    def _audit(
        db: Session,
        identity: AuthenticatedIdentity,
        transaction: Transaction,
        action: str,
        details: dict[str, object],
    ) -> None:
        AuditLogRepository.add(
            db,
            company_id=identity.company.id,
            actor_user_id=identity.user.id,
            target_type="FINANCIAL_TRANSACTION",
            target_id=transaction.id,
            action=action,
            details=details,
        )

    @staticmethod
    def list(
        db: Session,
        identity: AuthenticatedIdentity,
        *,
        due_from: date | None,
        due_to: date | None,
        transaction_type: TransactionType | None,
        status: TransactionStatus | None,
        page: int,
        page_size: int,
    ) -> FinancialTransactionListResponse:
        if due_from is not None and due_to is not None and due_from > due_to:
            raise FinancialLifecycleError("O período financeiro é inválido.")
        items, total = FinancialRepository.list_by_company(
            db,
            identity.company.id,
            due_from=due_from,
            due_to=due_to,
            transaction_type=transaction_type,
            status=status,
            page=page,
            page_size=page_size,
        )
        return FinancialTransactionListResponse(
            items=[FinancialTransactionResponse.model_validate(item) for item in items],
            total=total,
            page=page,
            page_size=page_size,
        )

    @staticmethod
    def summary(
        db: Session,
        identity: AuthenticatedIdentity,
        *,
        due_from: date | None,
        due_to: date | None,
    ) -> FinancialSummaryResponse:
        if due_from is not None and due_to is not None and due_from > due_to:
            raise FinancialLifecycleError("O período financeiro é inválido.")

        grouped = FinancialRepository.summarize_by_company(
            db,
            identity.company.id,
            due_from=due_from,
            due_to=due_to,
        )
        totals: dict[tuple[str, str], Decimal] = {}
        transaction_count = 0
        for transaction_type, status, amount, count in grouped:
            totals[(transaction_type, status)] = Decimal(amount)
            transaction_count += count

        paid_income = totals.get(
            (TransactionType.INCOME.value, TransactionStatus.PAID.value),
            Decimal("0"),
        )
        paid_expense = totals.get(
            (TransactionType.EXPENSE.value, TransactionStatus.PAID.value),
            Decimal("0"),
        )
        pending_income = totals.get(
            (TransactionType.INCOME.value, TransactionStatus.PENDING.value),
            Decimal("0"),
        )
        pending_expense = totals.get(
            (TransactionType.EXPENSE.value, TransactionStatus.PENDING.value),
            Decimal("0"),
        )

        return FinancialSummaryResponse(
            due_from=due_from,
            due_to=due_to,
            paid_income=paid_income,
            paid_expense=paid_expense,
            pending_income=pending_income,
            pending_expense=pending_expense,
            realized_balance=paid_income - paid_expense,
            projected_balance=(paid_income + pending_income)
            - (paid_expense + pending_expense),
            transaction_count=transaction_count,
        )

    @classmethod
    def create(
        cls,
        db: Session,
        identity: AuthenticatedIdentity,
        data: FinancialTransactionCreate,
    ) -> Transaction:
        lead_id = cls._resolve_references(
            db,
            identity,
            data.lead_id,
            data.appointment_id,
        )
        if (
            data.transaction_type is TransactionType.INCOME
            and data.appointment_id is not None
            and FinancialRepository.get_active_income_by_appointment(
                db,
                identity.company.id,
                data.appointment_id,
            )
            is not None
        ):
            raise FinancialLifecycleError(
                "O agendamento já possui uma receita ativa."
            )
        transaction = Transaction(
            company_id=identity.company.id,
            lead_id=lead_id,
            appointment_id=data.appointment_id,
            description=data.description,
            transaction_type=data.transaction_type.value,
            category=data.category,
            amount=data.amount,
            due_date=data.due_date,
            paid_date=None,
            status=TransactionStatus.PENDING.value,
            payment_method=None,
            notes=data.notes,
        )
        try:
            FinancialRepository.add(db, transaction)
            cls._audit(
                db,
                identity,
                transaction,
                "FINANCIAL_TRANSACTION_CREATED",
                {"type": data.transaction_type.value, "status": "PENDING"},
            )
        except SQLAlchemyError as error:
            db.rollback()
            raise FinancialPersistenceError from error
        return cls._commit(db, transaction)

    @classmethod
    def update(
        cls,
        db: Session,
        identity: AuthenticatedIdentity,
        transaction_id: uuid.UUID,
        data: FinancialTransactionUpdate,
    ) -> Transaction:
        transaction = cls._transaction(db, identity, transaction_id, lock=True)
        if (
            transaction.status != TransactionStatus.PENDING.value
            and identity.role not in {UserRole.OWNER, UserRole.ADMIN}
        ):
            raise FinancialLifecycleError(
                "Somente usuários master podem alterar lançamentos concluídos."
            )
        changed: list[str] = []
        for field_name, value in data.model_dump(exclude_unset=True).items():
            if getattr(transaction, field_name) != value:
                setattr(transaction, field_name, value)
                changed.append(field_name)
        if not changed:
            return transaction
        cls._audit(
            db,
            identity,
            transaction,
            "FINANCIAL_TRANSACTION_UPDATED",
            {"fields": sorted(changed)},
        )
        return cls._commit(db, transaction)

    @classmethod
    def pay(
        cls,
        db: Session,
        identity: AuthenticatedIdentity,
        transaction_id: uuid.UUID,
        data: FinancialTransactionPayment,
    ) -> Transaction:
        transaction = cls._transaction(db, identity, transaction_id, lock=True)
        if transaction.status != TransactionStatus.PENDING.value:
            raise FinancialLifecycleError(
                "Somente lançamentos pendentes podem ser pagos."
            )
        transaction.status = TransactionStatus.PAID.value
        transaction.paid_date = data.paid_date
        transaction.payment_method = data.payment_method
        cls._audit(
            db,
            identity,
            transaction,
            "FINANCIAL_TRANSACTION_PAID",
            {"from": "PENDING", "to": "PAID"},
        )
        return cls._commit(db, transaction)

    @classmethod
    def cancel(
        cls,
        db: Session,
        identity: AuthenticatedIdentity,
        transaction_id: uuid.UUID,
    ) -> Transaction:
        transaction = cls._transaction(db, identity, transaction_id, lock=True)
        if transaction.status != TransactionStatus.PENDING.value:
            raise FinancialLifecycleError(
                "Somente lançamentos pendentes podem ser cancelados."
            )
        transaction.status = TransactionStatus.CANCELED.value
        transaction.paid_date = None
        transaction.payment_method = None
        cls._audit(
            db,
            identity,
            transaction,
            "FINANCIAL_TRANSACTION_CANCELED",
            {"from": "PENDING", "to": "CANCELED"},
        )
        return cls._commit(db, transaction)

    @classmethod
    def soft_delete(
        cls,
        db: Session,
        identity: AuthenticatedIdentity,
        transaction_id: uuid.UUID,
    ) -> None:
        transaction = cls._transaction(db, identity, transaction_id, lock=True)
        if (
            transaction.status != TransactionStatus.PENDING.value
            and identity.role not in {UserRole.OWNER, UserRole.ADMIN}
        ):
            raise FinancialLifecycleError(
                "Somente usuários master podem remover lançamentos concluídos."
            )
        transaction.deleted_at = datetime.now(UTC)
        cls._audit(
            db,
            identity,
            transaction,
            "FINANCIAL_TRANSACTION_SOFT_DELETED",
            {"status": transaction.status},
        )
        try:
            db.commit()
        except SQLAlchemyError as error:
            db.rollback()
            raise FinancialPersistenceError from error

    @classmethod
    def detail(
        cls,
        db: Session,
        identity: AuthenticatedIdentity,
        transaction_id: uuid.UUID,
    ) -> Transaction:
        return cls._transaction(db, identity, transaction_id)

import uuid
from datetime import date

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.models.transaction import Transaction
from app.schemas.financial import TransactionStatus, TransactionType


class FinancialRepository:
    @staticmethod
    def add(db: Session, transaction: Transaction) -> Transaction:
        db.add(transaction)
        db.flush()
        return transaction

    @staticmethod
    def get_by_id(
        db: Session,
        company_id: uuid.UUID,
        transaction_id: uuid.UUID,
        *,
        for_update: bool = False,
    ) -> Transaction | None:
        statement = select(Transaction).where(
            Transaction.company_id == company_id,
            Transaction.id == transaction_id,
            Transaction.deleted_at.is_(None),
        )
        if for_update:
            statement = statement.with_for_update()
        return db.execute(statement).scalar_one_or_none()

    @staticmethod
    def list_by_company(
        db: Session,
        company_id: uuid.UUID,
        *,
        due_from: date | None,
        due_to: date | None,
        transaction_type: TransactionType | None,
        status: TransactionStatus | None,
        page: int,
        page_size: int,
    ) -> tuple[list[Transaction], int]:
        filters = [
            Transaction.company_id == company_id,
            Transaction.deleted_at.is_(None),
        ]
        if due_from is not None:
            filters.append(Transaction.due_date >= due_from)
        if due_to is not None:
            filters.append(Transaction.due_date <= due_to)
        if transaction_type is not None:
            filters.append(Transaction.transaction_type == transaction_type.value)
        if status is not None:
            filters.append(Transaction.status == status.value)

        total = db.scalar(
            select(func.count()).select_from(Transaction).where(*filters)
        ) or 0
        statement = (
            select(Transaction)
            .where(*filters)
            .order_by(Transaction.due_date.desc(), Transaction.id.desc())
            .offset((page - 1) * page_size)
            .limit(page_size)
        )
        return list(db.execute(statement).scalars().all()), total

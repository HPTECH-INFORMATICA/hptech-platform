import uuid

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.company import Company


class CompanyRepository:
    @staticmethod
    def get_by_id(
        db: Session,
        company_id: uuid.UUID,
        *,
        for_update: bool = False,
    ) -> Company | None:
        statement = select(Company).where(
            Company.id == company_id,
            Company.deleted_at.is_(None),
        )
        if for_update:
            statement = statement.with_for_update()
        return db.execute(statement).scalar_one_or_none()

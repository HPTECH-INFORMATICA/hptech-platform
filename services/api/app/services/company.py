from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.core.identity import AuthenticatedIdentity
from app.models.company import Company
from app.repositories.audit_log import AuditLogRepository
from app.repositories.company import CompanyRepository
from app.schemas.company import CompanyUpdate


class CompanyNotFoundError(RuntimeError):
    pass


class CompanyConflictError(RuntimeError):
    pass


class CompanyService:
    @staticmethod
    def detail(db: Session, identity: AuthenticatedIdentity) -> Company:
        company = CompanyRepository.get_by_id(db, identity.company.id)
        if company is None:
            raise CompanyNotFoundError
        return company

    @staticmethod
    def update(
        db: Session,
        identity: AuthenticatedIdentity,
        data: CompanyUpdate,
    ) -> Company:
        company = CompanyRepository.get_by_id(
            db,
            identity.company.id,
            for_update=True,
        )
        if company is None:
            raise CompanyNotFoundError

        changed: list[str] = []
        values = data.model_dump(exclude_unset=True)
        for field in (
            "name",
            "legal_name",
            "document",
            "email",
            "phone",
            "timezone",
        ):
            if field in values and getattr(company, field) != values[field]:
                setattr(company, field, values[field])
                changed.append(field)

        if not changed:
            return company

        AuditLogRepository.add(
            db,
            company_id=identity.company.id,
            actor_user_id=identity.user.id,
            target_type="COMPANY",
            target_id=company.id,
            action="COMPANY_UPDATED",
            details={"fields": changed},
        )
        return company

    @staticmethod
    def commit(db: Session) -> None:
        try:
            db.commit()
        except IntegrityError as error:
            db.rollback()
            raise CompanyConflictError(
                "Documento já utilizado por outra empresa."
            ) from error

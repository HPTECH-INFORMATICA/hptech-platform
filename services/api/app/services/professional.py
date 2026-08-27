import uuid

from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import Session

from app.core.identity import AuthenticatedIdentity
from app.models.professional import Professional
from app.repositories.audit_log import AuditLogRepository
from app.repositories.professional import ProfessionalRepository
from app.schemas.professional import (
    ProfessionalCreate,
    ProfessionalListResponse,
    ProfessionalResponse,
    ProfessionalStatusUpdate,
    ProfessionalUpdate,
)


class ProfessionalNotFoundError(RuntimeError):
    pass


class ProfessionalUserNotFoundError(RuntimeError):
    pass


class ProfessionalUserInactiveError(RuntimeError):
    pass


class ProfessionalUserConflictError(RuntimeError):
    pass


class ProfessionalPersistenceError(RuntimeError):
    pass


class ProfessionalDomain:
    @staticmethod
    def _commit(db: Session, professional: Professional) -> Professional:
        try:
            db.commit()
            db.refresh(professional)
            return professional
        except SQLAlchemyError as error:
            db.rollback()
            raise ProfessionalPersistenceError from error

    @staticmethod
    def _validate_user(
        db: Session,
        company_id: uuid.UUID,
        user_id: uuid.UUID,
        *,
        exclude_professional_id: uuid.UUID | None = None,
    ) -> None:
        user = ProfessionalRepository.get_eligible_user(db, company_id, user_id)
        if user is None:
            raise ProfessionalUserNotFoundError
        if not user.is_active:
            raise ProfessionalUserInactiveError
        if ProfessionalRepository.get_by_user_id(
            db,
            company_id,
            user_id,
            exclude_professional_id=exclude_professional_id,
        ) is not None:
            raise ProfessionalUserConflictError

    @staticmethod
    def list(
        db: Session,
        identity: AuthenticatedIdentity,
        *,
        page: int,
        page_size: int,
        search: str | None,
        is_active: bool | None,
    ) -> ProfessionalListResponse:
        items, total = ProfessionalRepository.list_by_company(
            db,
            identity.company.id,
            page=page,
            page_size=page_size,
            search=search,
            is_active=is_active,
        )
        return ProfessionalListResponse(
            items=[ProfessionalResponse.model_validate(item) for item in items],
            total=total,
            page=page,
            page_size=page_size,
        )

    @staticmethod
    def detail(
        db: Session,
        identity: AuthenticatedIdentity,
        professional_id: uuid.UUID,
    ) -> Professional:
        professional = ProfessionalRepository.get_by_id(
            db, identity.company.id, professional_id
        )
        if professional is None:
            raise ProfessionalNotFoundError
        return professional

    @classmethod
    def create(
        cls,
        db: Session,
        identity: AuthenticatedIdentity,
        data: ProfessionalCreate,
    ) -> Professional:
        if data.user_id is not None:
            cls._validate_user(db, identity.company.id, data.user_id)
        try:
            professional = ProfessionalRepository.create(
                db, identity.company.id, data
            )
            AuditLogRepository.add(
                db,
                company_id=identity.company.id,
                actor_user_id=identity.user.id,
                target_type="PROFESSIONAL",
                target_id=professional.id,
                action="PROFESSIONAL_CREATED",
                details={"state": "ACTIVE"},
            )
        except SQLAlchemyError as error:
            db.rollback()
            raise ProfessionalPersistenceError from error
        return cls._commit(db, professional)

    @classmethod
    def update(
        cls,
        db: Session,
        identity: AuthenticatedIdentity,
        professional_id: uuid.UUID,
        data: ProfessionalUpdate,
    ) -> Professional:
        professional = ProfessionalRepository.get_by_id(
            db, identity.company.id, professional_id, for_update=True
        )
        if professional is None:
            raise ProfessionalNotFoundError

        changes = data.model_dump(exclude_unset=True)
        if "user_id" in changes and changes["user_id"] is not None:
            cls._validate_user(
                db,
                identity.company.id,
                changes["user_id"],
                exclude_professional_id=professional.id,
            )

        changed = ProfessionalRepository.update(professional, changes)
        if not changed:
            return professional

        AuditLogRepository.add(
            db,
            company_id=identity.company.id,
            actor_user_id=identity.user.id,
            target_type="PROFESSIONAL",
            target_id=professional.id,
            action="PROFESSIONAL_UPDATED",
            details={"fields": changed},
        )
        return cls._commit(db, professional)

    @classmethod
    def change_status(
        cls,
        db: Session,
        identity: AuthenticatedIdentity,
        professional_id: uuid.UUID,
        data: ProfessionalStatusUpdate,
    ) -> Professional:
        professional = ProfessionalRepository.get_by_id(
            db, identity.company.id, professional_id, for_update=True
        )
        if professional is None:
            raise ProfessionalNotFoundError
        previous = "ACTIVE" if professional.is_active else "INACTIVE"
        if not ProfessionalRepository.change_status(professional, data.is_active):
            return professional

        current = "ACTIVE" if data.is_active else "INACTIVE"
        AuditLogRepository.add(
            db,
            company_id=identity.company.id,
            actor_user_id=identity.user.id,
            target_type="PROFESSIONAL",
            target_id=professional.id,
            action="PROFESSIONAL_STATUS_CHANGED",
            details={"from": previous, "to": current},
        )
        return cls._commit(db, professional)

    @classmethod
    def soft_delete(
        cls,
        db: Session,
        identity: AuthenticatedIdentity,
        professional_id: uuid.UUID,
    ) -> None:
        professional = ProfessionalRepository.get_by_id(
            db, identity.company.id, professional_id, for_update=True
        )
        if professional is None:
            raise ProfessionalNotFoundError

        ProfessionalRepository.soft_delete(professional)
        AuditLogRepository.add(
            db,
            company_id=identity.company.id,
            actor_user_id=identity.user.id,
            target_type="PROFESSIONAL",
            target_id=professional.id,
            action="PROFESSIONAL_SOFT_DELETED",
            details={"state": "DELETED"},
        )
        try:
            db.commit()
        except SQLAlchemyError as error:
            db.rollback()
            raise ProfessionalPersistenceError from error

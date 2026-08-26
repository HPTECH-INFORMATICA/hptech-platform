import uuid
from datetime import datetime, timezone

from sqlalchemy.exc import IntegrityError, SQLAlchemyError
from sqlalchemy.orm import Session

from app.core.identity import AuthenticatedIdentity
from app.models.service_category import ServiceCategory
from app.repositories.audit_log import AuditLogRepository
from app.repositories.service_category import ServiceCategoryRepository
from app.schemas.service_category import (
    ServiceCategoryCreate,
    ServiceCategoryListResponse,
    ServiceCategoryResponse,
    ServiceCategoryStatusUpdate,
    ServiceCategoryUpdate,
)


class ServiceCategoryNotFoundError(RuntimeError):
    pass


class ServiceCategoryConflictError(RuntimeError):
    pass


class ServiceCategoryInUseError(RuntimeError):
    pass


class ServiceCategoryPersistenceError(RuntimeError):
    pass


class ServiceCategoryDomain:
    @staticmethod
    def _commit(db: Session, category: ServiceCategory) -> ServiceCategory:
        try:
            db.commit()
            db.refresh(category)
            return category
        except IntegrityError as error:
            db.rollback()
            raise ServiceCategoryConflictError from error
        except SQLAlchemyError as error:
            db.rollback()
            raise ServiceCategoryPersistenceError from error

    @staticmethod
    def list(db: Session, identity: AuthenticatedIdentity, *, page: int, page_size: int, search: str | None, is_active: bool | None) -> ServiceCategoryListResponse:
        items, total = ServiceCategoryRepository.list_by_company(
            db, identity.company.id, page=page, page_size=page_size, search=search, is_active=is_active
        )
        return ServiceCategoryListResponse(
            items=[ServiceCategoryResponse.model_validate(item) for item in items],
            total=total,
            page=page,
            page_size=page_size,
        )

    @staticmethod
    def detail(db: Session, identity: AuthenticatedIdentity, category_id: uuid.UUID) -> ServiceCategory:
        category = ServiceCategoryRepository.get_by_id(db, identity.company.id, category_id)
        if category is None:
            raise ServiceCategoryNotFoundError
        return category

    @classmethod
    def create(cls, db: Session, identity: AuthenticatedIdentity, data: ServiceCategoryCreate) -> ServiceCategory:
        try:
            category = ServiceCategoryRepository.create(db, identity.company.id, data)
            AuditLogRepository.add(
                db, company_id=identity.company.id, actor_user_id=identity.user.id,
                target_type="SERVICE_CATEGORY", target_id=category.id,
                action="SERVICE_CATEGORY_CREATED", details={"state": "ACTIVE"},
            )
        except IntegrityError as error:
            db.rollback()
            raise ServiceCategoryConflictError from error
        except SQLAlchemyError as error:
            db.rollback()
            raise ServiceCategoryPersistenceError from error
        return cls._commit(db, category)

    @classmethod
    def update(cls, db: Session, identity: AuthenticatedIdentity, category_id: uuid.UUID, data: ServiceCategoryUpdate) -> ServiceCategory:
        category = ServiceCategoryRepository.get_by_id(db, identity.company.id, category_id, for_update=True)
        if category is None:
            raise ServiceCategoryNotFoundError
        changed: list[str] = []
        for field, value in data.model_dump(exclude_unset=True).items():
            if getattr(category, field) != value:
                setattr(category, field, value)
                changed.append(field)
        if not changed:
            return category
        AuditLogRepository.add(
            db, company_id=identity.company.id, actor_user_id=identity.user.id,
            target_type="SERVICE_CATEGORY", target_id=category.id,
            action="SERVICE_CATEGORY_UPDATED", details={"fields": changed},
        )
        return cls._commit(db, category)

    @classmethod
    def change_status(cls, db: Session, identity: AuthenticatedIdentity, category_id: uuid.UUID, data: ServiceCategoryStatusUpdate) -> ServiceCategory:
        category = ServiceCategoryRepository.get_by_id(db, identity.company.id, category_id, for_update=True)
        if category is None:
            raise ServiceCategoryNotFoundError
        if category.is_active is data.is_active:
            return category
        previous = "ACTIVE" if category.is_active else "INACTIVE"
        current = "ACTIVE" if data.is_active else "INACTIVE"
        category.is_active = data.is_active
        AuditLogRepository.add(
            db, company_id=identity.company.id, actor_user_id=identity.user.id,
            target_type="SERVICE_CATEGORY", target_id=category.id,
            action="SERVICE_CATEGORY_STATUS_CHANGED", details={"from": previous, "to": current},
        )
        return cls._commit(db, category)

    @classmethod
    def soft_delete(cls, db: Session, identity: AuthenticatedIdentity, category_id: uuid.UUID) -> None:
        category = ServiceCategoryRepository.get_by_id(db, identity.company.id, category_id, for_update=True)
        if category is None:
            raise ServiceCategoryNotFoundError
        if ServiceCategoryRepository.has_linked_services(
            db, identity.company.id, category.id
        ):
            db.rollback()
            raise ServiceCategoryInUseError
        category.is_active = False
        category.deleted_at = datetime.now(timezone.utc)
        AuditLogRepository.add(
            db, company_id=identity.company.id, actor_user_id=identity.user.id,
            target_type="SERVICE_CATEGORY", target_id=category.id,
            action="SERVICE_CATEGORY_SOFT_DELETED", details={"state": "DELETED"},
        )
        try:
            db.commit()
        except SQLAlchemyError as error:
            db.rollback()
            raise ServiceCategoryPersistenceError from error

import uuid
from datetime import datetime, timezone

from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import Session

from app.core.identity import AuthenticatedIdentity
from app.models.service import Service
from app.repositories.audit_log import AuditLogRepository
from app.repositories.service import ServiceRepository
from app.repositories.service_category import ServiceCategoryRepository
from app.schemas.service import (
    ServiceCreate,
    ServiceListResponse,
    ServiceResponse,
    ServiceStatusUpdate,
    ServiceUpdate,
)


class ServiceNotFoundError(RuntimeError):
    pass


class ServicePersistenceError(RuntimeError):
    pass


class ServiceCategoryUnavailableError(RuntimeError):
    pass


class ServiceDomain:
    @staticmethod
    def _commit(db: Session, service: Service) -> Service:
        try:
            db.commit()
            db.refresh(service)
            return service
        except SQLAlchemyError as error:
            db.rollback()
            raise ServicePersistenceError from error

    @staticmethod
    def list(
        db: Session,
        identity: AuthenticatedIdentity,
        *,
        page: int,
        page_size: int,
        search: str | None,
        is_active: bool | None,
        category_id: uuid.UUID | None,
    ) -> ServiceListResponse:
        items, total = ServiceRepository.list_by_company(
            db,
            identity.company.id,
            page=page,
            page_size=page_size,
            search=search,
            is_active=is_active,
            category_id=category_id,
        )
        return ServiceListResponse(
            items=[ServiceResponse.model_validate(item) for item in items],
            total=total,
            page=page,
            page_size=page_size,
        )

    @staticmethod
    def detail(
        db: Session,
        identity: AuthenticatedIdentity,
        service_id: uuid.UUID,
    ) -> Service:
        service = ServiceRepository.get_by_id(
            db,
            identity.company.id,
            service_id,
        )
        if service is None:
            raise ServiceNotFoundError
        return service

    @classmethod
    def create(
        cls,
        db: Session,
        identity: AuthenticatedIdentity,
        data: ServiceCreate,
    ) -> Service:
        if data.category_id is not None and ServiceCategoryRepository.get_by_id(
            db,
            identity.company.id,
            data.category_id,
            for_update=True,
            active_only=True,
        ) is None:
            raise ServiceCategoryUnavailableError
        try:
            service = ServiceRepository.create(db, identity.company.id, data)
            AuditLogRepository.add(
                db,
                company_id=identity.company.id,
                actor_user_id=identity.user.id,
                target_type="SERVICE",
                target_id=service.id,
                action="SERVICE_CREATED",
                details={"state": "ACTIVE"},
            )
        except SQLAlchemyError as error:
            db.rollback()
            raise ServicePersistenceError from error
        return cls._commit(db, service)

    @classmethod
    def update(
        cls,
        db: Session,
        identity: AuthenticatedIdentity,
        service_id: uuid.UUID,
        data: ServiceUpdate,
    ) -> Service:
        service = ServiceRepository.get_by_id(
            db,
            identity.company.id,
            service_id,
            for_update=True,
        )
        if service is None:
            raise ServiceNotFoundError

        if "category_id" in data.model_fields_set and data.category_id is not None:
            if ServiceCategoryRepository.get_by_id(
                db,
                identity.company.id,
                data.category_id,
                for_update=True,
                active_only=True,
            ) is None:
                raise ServiceCategoryUnavailableError

        changed: list[str] = []
        for field, value in data.model_dump(exclude_unset=True).items():
            if getattr(service, field) != value:
                setattr(service, field, value)
                changed.append(field)
        if not changed:
            return service

        AuditLogRepository.add(
            db,
            company_id=identity.company.id,
            actor_user_id=identity.user.id,
            target_type="SERVICE",
            target_id=service.id,
            action="SERVICE_UPDATED",
            details={"fields": changed},
        )
        return cls._commit(db, service)

    @classmethod
    def change_status(
        cls,
        db: Session,
        identity: AuthenticatedIdentity,
        service_id: uuid.UUID,
        data: ServiceStatusUpdate,
    ) -> Service:
        service = ServiceRepository.get_by_id(
            db,
            identity.company.id,
            service_id,
            for_update=True,
        )
        if service is None:
            raise ServiceNotFoundError
        if service.is_active is data.is_active:
            return service

        previous = "ACTIVE" if service.is_active else "INACTIVE"
        current = "ACTIVE" if data.is_active else "INACTIVE"
        service.is_active = data.is_active
        AuditLogRepository.add(
            db,
            company_id=identity.company.id,
            actor_user_id=identity.user.id,
            target_type="SERVICE",
            target_id=service.id,
            action="SERVICE_STATUS_CHANGED",
            details={"from": previous, "to": current},
        )
        return cls._commit(db, service)

    @classmethod
    def soft_delete(
        cls,
        db: Session,
        identity: AuthenticatedIdentity,
        service_id: uuid.UUID,
    ) -> None:
        service = ServiceRepository.get_by_id(
            db,
            identity.company.id,
            service_id,
            for_update=True,
        )
        if service is None:
            raise ServiceNotFoundError

        service.is_active = False
        service.deleted_at = datetime.now(timezone.utc)
        AuditLogRepository.add(
            db,
            company_id=identity.company.id,
            actor_user_id=identity.user.id,
            target_type="SERVICE",
            target_id=service.id,
            action="SERVICE_SOFT_DELETED",
            details={"state": "DELETED"},
        )
        try:
            db.commit()
        except SQLAlchemyError as error:
            db.rollback()
            raise ServicePersistenceError from error

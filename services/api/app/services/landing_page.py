import uuid
from datetime import UTC, datetime

from sqlalchemy.exc import IntegrityError, SQLAlchemyError
from sqlalchemy.orm import Session

from app.core.identity import AuthenticatedIdentity
from app.models.landing_page import LandingPage
from app.repositories.audit_log import AuditLogRepository
from app.repositories.landing_page import LandingPageRepository
from app.schemas.landing_page import (
    LandingPageCreate,
    LandingPageListResponse,
    LandingPageResponse,
    LandingPageStatus,
    LandingPageUpdate,
)


class LandingPageNotFoundError(RuntimeError):
    pass


class LandingPageConflictError(ValueError):
    pass


class LandingPageLifecycleError(ValueError):
    pass


class LandingPagePersistenceError(RuntimeError):
    pass


class LandingPageDomain:
    @staticmethod
    def _commit(db: Session, landing_page: LandingPage) -> LandingPage:
        try:
            db.commit()
            db.refresh(landing_page)
            return landing_page
        except IntegrityError as error:
            db.rollback()
            raise LandingPageConflictError(
                "Já existe uma landing page ativa com esse slug."
            ) from error
        except SQLAlchemyError as error:
            db.rollback()
            raise LandingPagePersistenceError from error

    @staticmethod
    def _landing_page(
        db: Session,
        identity: AuthenticatedIdentity,
        landing_page_id: uuid.UUID,
        *,
        lock: bool = False,
    ) -> LandingPage:
        landing_page = LandingPageRepository.get_by_id(
            db,
            identity.company.id,
            landing_page_id,
            for_update=lock,
        )
        if landing_page is None:
            raise LandingPageNotFoundError
        return landing_page

    @staticmethod
    def _audit(
        db: Session,
        identity: AuthenticatedIdentity,
        landing_page: LandingPage,
        action: str,
        details: dict[str, object],
    ) -> None:
        AuditLogRepository.add(
            db,
            company_id=identity.company.id,
            actor_user_id=identity.user.id,
            target_type="LANDING_PAGE",
            target_id=landing_page.id,
            action=action,
            details=details,
        )

    @staticmethod
    def _ensure_slug_available(
        db: Session,
        identity: AuthenticatedIdentity,
        slug: str,
        *,
        current_id: uuid.UUID | None = None,
    ) -> None:
        existing = LandingPageRepository.get_by_slug(
            db,
            identity.company.id,
            slug,
        )
        if existing is not None and existing.id != current_id:
            raise LandingPageConflictError(
                "Já existe uma landing page ativa com esse slug."
            )

    @classmethod
    def create(
        cls,
        db: Session,
        identity: AuthenticatedIdentity,
        data: LandingPageCreate,
    ) -> LandingPage:
        cls._ensure_slug_available(db, identity, data.slug)
        landing_page = LandingPage(
            company_id=identity.company.id,
            name=data.name,
            slug=data.slug,
            status=LandingPageStatus.DRAFT.value,
            template=data.template.value,
            content=data.content.model_dump(mode="json"),
            seo=data.seo.model_dump(mode="json"),
            published_at=None,
        )
        try:
            LandingPageRepository.add(db, landing_page)
            cls._audit(
                db,
                identity,
                landing_page,
                "LANDING_PAGE_CREATED",
                {"status": "DRAFT", "template": data.template.value},
            )
        except IntegrityError as error:
            db.rollback()
            raise LandingPageConflictError(
                "Já existe uma landing page ativa com esse slug."
            ) from error
        except SQLAlchemyError as error:
            db.rollback()
            raise LandingPagePersistenceError from error
        return cls._commit(db, landing_page)

    @classmethod
    def update(
        cls,
        db: Session,
        identity: AuthenticatedIdentity,
        landing_page_id: uuid.UUID,
        data: LandingPageUpdate,
    ) -> LandingPage:
        landing_page = cls._landing_page(
            db, identity, landing_page_id, lock=True
        )
        if landing_page.status != LandingPageStatus.DRAFT.value:
            raise LandingPageLifecycleError(
                "Somente landing pages em rascunho podem ser alteradas."
            )
        values = data.model_dump(exclude_unset=True, mode="json")
        if "slug" in values:
            cls._ensure_slug_available(
                db,
                identity,
                values["slug"],
                current_id=landing_page.id,
            )
        changed: list[str] = []
        for field_name, value in values.items():
            if getattr(landing_page, field_name) != value:
                setattr(landing_page, field_name, value)
                changed.append(field_name)
        if not changed:
            return landing_page
        cls._audit(
            db,
            identity,
            landing_page,
            "LANDING_PAGE_UPDATED",
            {"fields": sorted(changed)},
        )
        return cls._commit(db, landing_page)

    @classmethod
    def publish(
        cls,
        db: Session,
        identity: AuthenticatedIdentity,
        landing_page_id: uuid.UUID,
    ) -> LandingPage:
        landing_page = cls._landing_page(
            db, identity, landing_page_id, lock=True
        )
        if landing_page.status != LandingPageStatus.DRAFT.value:
            raise LandingPageLifecycleError(
                "Somente landing pages em rascunho podem ser publicadas."
            )
        if not landing_page.content.get("blocks"):
            raise LandingPageLifecycleError(
                "Adicione ao menos um bloco antes de publicar."
            )
        landing_page.status = LandingPageStatus.PUBLISHED.value
        landing_page.published_at = datetime.now(UTC)
        cls._audit(
            db,
            identity,
            landing_page,
            "LANDING_PAGE_PUBLISHED",
            {"from": "DRAFT", "to": "PUBLISHED"},
        )
        return cls._commit(db, landing_page)

    @classmethod
    def unpublish(
        cls,
        db: Session,
        identity: AuthenticatedIdentity,
        landing_page_id: uuid.UUID,
    ) -> LandingPage:
        landing_page = cls._landing_page(
            db, identity, landing_page_id, lock=True
        )
        if landing_page.status != LandingPageStatus.PUBLISHED.value:
            raise LandingPageLifecycleError(
                "Somente landing pages publicadas podem ser despublicadas."
            )
        landing_page.status = LandingPageStatus.DRAFT.value
        landing_page.published_at = None
        cls._audit(
            db,
            identity,
            landing_page,
            "LANDING_PAGE_UNPUBLISHED",
            {"from": "PUBLISHED", "to": "DRAFT"},
        )
        return cls._commit(db, landing_page)

    @classmethod
    def archive(
        cls,
        db: Session,
        identity: AuthenticatedIdentity,
        landing_page_id: uuid.UUID,
    ) -> LandingPage:
        landing_page = cls._landing_page(
            db, identity, landing_page_id, lock=True
        )
        if landing_page.status != LandingPageStatus.DRAFT.value:
            raise LandingPageLifecycleError(
                "Somente landing pages em rascunho podem ser arquivadas."
            )
        landing_page.status = LandingPageStatus.ARCHIVED.value
        landing_page.published_at = None
        cls._audit(
            db,
            identity,
            landing_page,
            "LANDING_PAGE_ARCHIVED",
            {"from": "DRAFT", "to": "ARCHIVED"},
        )
        return cls._commit(db, landing_page)

    @classmethod
    def soft_delete(
        cls,
        db: Session,
        identity: AuthenticatedIdentity,
        landing_page_id: uuid.UUID,
    ) -> None:
        landing_page = cls._landing_page(
            db, identity, landing_page_id, lock=True
        )
        if landing_page.status == LandingPageStatus.PUBLISHED.value:
            raise LandingPageLifecycleError(
                "Despublique a landing page antes de removê-la."
            )
        landing_page.deleted_at = datetime.now(UTC)
        cls._audit(
            db,
            identity,
            landing_page,
            "LANDING_PAGE_SOFT_DELETED",
            {"status": landing_page.status},
        )
        try:
            db.commit()
        except SQLAlchemyError as error:
            db.rollback()
            raise LandingPagePersistenceError from error

    @classmethod
    def detail(
        cls,
        db: Session,
        identity: AuthenticatedIdentity,
        landing_page_id: uuid.UUID,
    ) -> LandingPage:
        return cls._landing_page(db, identity, landing_page_id)

    @staticmethod
    def list(
        db: Session,
        identity: AuthenticatedIdentity,
        *,
        status: LandingPageStatus | None,
        page: int,
        page_size: int,
    ) -> LandingPageListResponse:
        items, total = LandingPageRepository.list_by_company(
            db,
            identity.company.id,
            status=status,
            page=page,
            page_size=page_size,
        )
        return LandingPageListResponse(
            items=[LandingPageResponse.model_validate(item) for item in items],
            total=total,
            page=page,
            page_size=page_size,
        )

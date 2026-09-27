import uuid
from typing import Annotated

from fastapi import (
    APIRouter,
    Depends,
    HTTPException,
    Path,
    Query,
    Request,
    Response,
    status,
)
from sqlalchemy.orm import Session

from app.core.identity import AuthenticatedIdentity, PermissionAction, PermissionModule
from app.db.session import get_db
from app.dependencies.auth import require_permission
from app.schemas.landing_page import (
    LandingPageCreate,
    LandingPageListResponse,
    LandingPageResponse,
    LandingPageStatus,
    LandingPageUpdate,
    PublicLandingPageResponse,
    PublicLandingPageSubmission,
    PublicLandingPageSubmissionResponse,
)
from app.services.landing_page import (
    LandingPageConflictError,
    LandingPageDomain,
    LandingPageLifecycleError,
    LandingPageNotFoundError,
    LandingPagePersistenceError,
    LandingPageSubmissionUnavailableError,
)
from app.services.landing_page_submission_limit import (
    LandingPageSubmissionRateLimitExceeded,
    LandingPageSubmissionRateLimiter,
)


router = APIRouter(prefix="/landing-pages", tags=["Landing Pages"])
public_router = APIRouter(
    prefix="/public/landing-pages",
    tags=["Public Landing Pages"],
)
require_view = require_permission(
    PermissionModule.LANDING_PAGES, PermissionAction.VIEW
)
require_create = require_permission(
    PermissionModule.LANDING_PAGES, PermissionAction.CREATE
)
require_update = require_permission(
    PermissionModule.LANDING_PAGES, PermissionAction.UPDATE
)
require_delete = require_permission(
    PermissionModule.LANDING_PAGES, PermissionAction.DELETE
)


def translate_landing_page_error(error: Exception) -> None:
    if isinstance(error, LandingPageNotFoundError):
        raise HTTPException(status_code=404, detail="Landing page não encontrada.") from error
    if isinstance(error, (LandingPageConflictError, LandingPageLifecycleError)):
        raise HTTPException(status_code=409, detail=str(error)) from error
    if isinstance(error, LandingPagePersistenceError):
        raise HTTPException(
            status_code=409,
            detail="Não foi possível persistir a landing page.",
        ) from error
    raise error


@router.get("", response_model=LandingPageListResponse)
def list_landing_pages(
    identity: Annotated[AuthenticatedIdentity, Depends(require_view)],
    db: Annotated[Session, Depends(get_db)],
    landing_page_status: Annotated[
        LandingPageStatus | None, Query(alias="status")
    ] = None,
    page: Annotated[int, Query(ge=1)] = 1,
    page_size: Annotated[int, Query(ge=1, le=100)] = 20,
) -> LandingPageListResponse:
    return LandingPageDomain.list(
        db,
        identity,
        status=landing_page_status,
        page=page,
        page_size=page_size,
    )


@router.post("", response_model=LandingPageResponse, status_code=201)
def create_landing_page(
    data: LandingPageCreate,
    identity: Annotated[AuthenticatedIdentity, Depends(require_create)],
    db: Annotated[Session, Depends(get_db)],
) -> LandingPageResponse:
    try:
        return LandingPageResponse.model_validate(
            LandingPageDomain.create(db, identity, data)
        )
    except Exception as error:
        translate_landing_page_error(error)
        raise AssertionError("unreachable")


@router.get("/{landing_page_id}", response_model=LandingPageResponse)
def get_landing_page(
    landing_page_id: uuid.UUID,
    identity: Annotated[AuthenticatedIdentity, Depends(require_view)],
    db: Annotated[Session, Depends(get_db)],
) -> LandingPageResponse:
    try:
        return LandingPageResponse.model_validate(
            LandingPageDomain.detail(db, identity, landing_page_id)
        )
    except Exception as error:
        translate_landing_page_error(error)
        raise AssertionError("unreachable")


@router.patch("/{landing_page_id}", response_model=LandingPageResponse)
def update_landing_page(
    landing_page_id: uuid.UUID,
    data: LandingPageUpdate,
    identity: Annotated[AuthenticatedIdentity, Depends(require_update)],
    db: Annotated[Session, Depends(get_db)],
) -> LandingPageResponse:
    try:
        return LandingPageResponse.model_validate(
            LandingPageDomain.update(db, identity, landing_page_id, data)
        )
    except Exception as error:
        translate_landing_page_error(error)
        raise AssertionError("unreachable")


def _transition(
    operation,
    db: Session,
    identity: AuthenticatedIdentity,
    landing_page_id: uuid.UUID,
) -> LandingPageResponse:
    try:
        return LandingPageResponse.model_validate(
            operation(db, identity, landing_page_id)
        )
    except Exception as error:
        translate_landing_page_error(error)
        raise AssertionError("unreachable")


@router.post("/{landing_page_id}/publish", response_model=LandingPageResponse)
def publish_landing_page(
    landing_page_id: uuid.UUID,
    identity: Annotated[AuthenticatedIdentity, Depends(require_update)],
    db: Annotated[Session, Depends(get_db)],
) -> LandingPageResponse:
    return _transition(LandingPageDomain.publish, db, identity, landing_page_id)


@router.post("/{landing_page_id}/unpublish", response_model=LandingPageResponse)
def unpublish_landing_page(
    landing_page_id: uuid.UUID,
    identity: Annotated[AuthenticatedIdentity, Depends(require_update)],
    db: Annotated[Session, Depends(get_db)],
) -> LandingPageResponse:
    return _transition(LandingPageDomain.unpublish, db, identity, landing_page_id)


@router.post("/{landing_page_id}/archive", response_model=LandingPageResponse)
def archive_landing_page(
    landing_page_id: uuid.UUID,
    identity: Annotated[AuthenticatedIdentity, Depends(require_update)],
    db: Annotated[Session, Depends(get_db)],
) -> LandingPageResponse:
    return _transition(LandingPageDomain.archive, db, identity, landing_page_id)


@router.delete("/{landing_page_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_landing_page(
    landing_page_id: uuid.UUID,
    identity: Annotated[AuthenticatedIdentity, Depends(require_delete)],
    db: Annotated[Session, Depends(get_db)],
) -> None:
    try:
        LandingPageDomain.soft_delete(db, identity, landing_page_id)
    except Exception as error:
        translate_landing_page_error(error)


@public_router.get(
    "/{company_slug}/{landing_page_slug}",
    response_model=PublicLandingPageResponse,
)
def get_public_landing_page(
    company_slug: Annotated[
        str,
        Path(
            min_length=1,
            max_length=100,
            pattern=r"^[a-z0-9]+(?:-[a-z0-9]+)*$",
        ),
    ],
    landing_page_slug: Annotated[
        str,
        Path(
            min_length=1,
            max_length=120,
            pattern=r"^[a-z0-9]+(?:-[a-z0-9]+)*$",
        ),
    ],
    response: Response,
    db: Annotated[Session, Depends(get_db)],
) -> PublicLandingPageResponse:
    try:
        result = LandingPageDomain.public_detail(
            db,
            company_slug,
            landing_page_slug,
        )
    except LandingPageNotFoundError as error:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Landing page não encontrada.",
        ) from error
    response.headers["Cache-Control"] = (
        "public, max-age=60, stale-while-revalidate=300"
    )
    return result


@public_router.post(
    "/{company_slug}/{landing_page_slug}/submissions",
    response_model=PublicLandingPageSubmissionResponse,
    status_code=status.HTTP_202_ACCEPTED,
)
def submit_public_landing_page(
    company_slug: Annotated[
        str,
        Path(
            min_length=1,
            max_length=100,
            pattern=r"^[a-z0-9]+(?:-[a-z0-9]+)*$",
        ),
    ],
    landing_page_slug: Annotated[
        str,
        Path(
            min_length=1,
            max_length=120,
            pattern=r"^[a-z0-9]+(?:-[a-z0-9]+)*$",
        ),
    ],
    data: PublicLandingPageSubmission,
    request: Request,
    db: Annotated[Session, Depends(get_db)],
) -> PublicLandingPageSubmissionResponse:
    client_host = request.client.host if request.client else "unknown"
    submission_subject = str(data.email or data.phone or "honeypot")
    try:
        LandingPageSubmissionRateLimiter.ensure_allowed(
            db,
            company_slug,
            landing_page_slug,
            submission_subject,
            client_host,
        )
    except LandingPageSubmissionRateLimitExceeded as error:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Muitas solicitações. Tente novamente mais tarde.",
            headers={"Retry-After": str(error.retry_after)},
        ) from error

    LandingPageSubmissionRateLimiter.record_attempt(
        db,
        company_slug,
        landing_page_slug,
        submission_subject,
        client_host,
    )
    try:
        LandingPageDomain.public_submit(
            db,
            company_slug,
            landing_page_slug,
            data,
        )
    except LandingPageNotFoundError as error:
        db.commit()
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Landing page não encontrada.",
        ) from error
    except LandingPageSubmissionUnavailableError as error:
        db.commit()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Formulário indisponível para esta landing page.",
        ) from error
    except Exception:
        db.rollback()
        raise
    db.commit()
    return PublicLandingPageSubmissionResponse()

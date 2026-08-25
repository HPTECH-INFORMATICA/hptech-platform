from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.identity import (
    AuthenticatedIdentity,
    PermissionAction,
    PermissionModule,
)
from app.db.session import get_db
from app.dependencies.auth import require_permission
from app.schemas.company import CompanyResponse, CompanyUpdate
from app.services.company import (
    CompanyConflictError,
    CompanyNotFoundError,
    CompanyService,
)


router = APIRouter(prefix="/company", tags=["Company"])
require_company_view = require_permission(
    PermissionModule.COMPANY,
    PermissionAction.VIEW,
)
require_company_update = require_permission(
    PermissionModule.COMPANY,
    PermissionAction.UPDATE,
)


@router.get("", response_model=CompanyResponse)
def get_company(
    db: Annotated[Session, Depends(get_db)],
    identity: Annotated[AuthenticatedIdentity, Depends(require_company_view)],
) -> CompanyResponse:
    try:
        return CompanyResponse.model_validate(CompanyService.detail(db, identity))
    except CompanyNotFoundError as error:
        db.rollback()
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND) from error


@router.patch("", response_model=CompanyResponse)
def update_company(
    data: CompanyUpdate,
    db: Annotated[Session, Depends(get_db)],
    identity: Annotated[AuthenticatedIdentity, Depends(require_company_update)],
) -> CompanyResponse:
    try:
        company = CompanyService.update(db, identity, data)
        CompanyService.commit(db)
        return CompanyResponse.model_validate(company)
    except CompanyNotFoundError as error:
        db.rollback()
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND) from error
    except CompanyConflictError as error:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=str(error),
        ) from error

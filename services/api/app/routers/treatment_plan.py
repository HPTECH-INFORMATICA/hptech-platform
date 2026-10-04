import uuid
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.core.identity import AuthenticatedIdentity, PermissionAction, PermissionModule
from app.db.session import get_db
from app.dependencies.auth import require_permission
from app.schemas.treatment_plan import TreatmentPlanCreate, TreatmentPlanListResponse, TreatmentPlanResponse, TreatmentPlanStatusUpdate, TreatmentPlanUpdate
from app.services.treatment_plan import TreatmentPlanDomain, TreatmentPlanNotFoundError, TreatmentPlanPersistenceError, TreatmentPlanReferenceError

router = APIRouter(prefix="/treatment-plans", tags=["Treatment plans"])

def permission(action: PermissionAction): return require_permission(PermissionModule.SERVICES, action)

def translate(error: Exception) -> None:
    if isinstance(error, TreatmentPlanNotFoundError): raise HTTPException(404, "Plano não encontrado.") from error
    if isinstance(error, TreatmentPlanReferenceError): raise HTTPException(422, str(error)) from error
    if isinstance(error, TreatmentPlanPersistenceError): raise HTTPException(409, "Não foi possível persistir o plano.") from error
    raise error

@router.get("", response_model=TreatmentPlanListResponse)
def list_plans(identity: Annotated[AuthenticatedIdentity, Depends(permission(PermissionAction.VIEW))], db: Annotated[Session, Depends(get_db)], page: Annotated[int, Query(ge=1)] = 1, page_size: Annotated[int, Query(ge=1, le=100)] = 20, is_active: bool | None = None):
    return TreatmentPlanDomain.list(db, identity, page=page, page_size=page_size, is_active=is_active)

@router.post("", response_model=TreatmentPlanResponse, status_code=201)
def create_plan(data: TreatmentPlanCreate, identity: Annotated[AuthenticatedIdentity, Depends(permission(PermissionAction.CREATE))], db: Annotated[Session, Depends(get_db)]):
    try: return TreatmentPlanResponse.model_validate(TreatmentPlanDomain.create(db, identity, data))
    except (TreatmentPlanReferenceError, TreatmentPlanPersistenceError) as error: translate(error)

@router.put("/{plan_id}", response_model=TreatmentPlanResponse)
def update_plan(plan_id: uuid.UUID, data: TreatmentPlanUpdate, identity: Annotated[AuthenticatedIdentity, Depends(permission(PermissionAction.UPDATE))], db: Annotated[Session, Depends(get_db)]):
    try: return TreatmentPlanResponse.model_validate(TreatmentPlanDomain.update(db, identity, plan_id, data))
    except (TreatmentPlanNotFoundError, TreatmentPlanReferenceError, TreatmentPlanPersistenceError) as error: translate(error)

@router.patch("/{plan_id}/status", response_model=TreatmentPlanResponse)
def status_plan(plan_id: uuid.UUID, data: TreatmentPlanStatusUpdate, identity: Annotated[AuthenticatedIdentity, Depends(permission(PermissionAction.UPDATE))], db: Annotated[Session, Depends(get_db)]):
    try: return TreatmentPlanResponse.model_validate(TreatmentPlanDomain.change_status(db, identity, plan_id, data))
    except (TreatmentPlanNotFoundError, TreatmentPlanPersistenceError) as error: translate(error)

@router.delete("/{plan_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_plan(plan_id: uuid.UUID, identity: Annotated[AuthenticatedIdentity, Depends(permission(PermissionAction.DELETE))], db: Annotated[Session, Depends(get_db)]):
    try: TreatmentPlanDomain.soft_delete(db, identity, plan_id)
    except (TreatmentPlanNotFoundError, TreatmentPlanPersistenceError) as error: translate(error)

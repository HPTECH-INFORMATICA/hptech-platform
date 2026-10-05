from typing import Annotated
import uuid

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.core.identity import AuthenticatedIdentity, PermissionAction, PermissionModule
from app.db.session import get_db
from app.dependencies.auth import require_permission
from app.schemas.patient_plan_contract import PatientPlanContractCreate, PatientPlanContractListResponse, PatientPlanContractResponse
from app.services.patient_plan_contract import PatientPlanContractDomain, PatientPlanContractNotFoundError, PatientPlanContractPersistenceError, PatientPlanContractReferenceError

router = APIRouter(prefix="/patient-plan-contracts", tags=["Patient plan contracts"])


@router.post("", response_model=PatientPlanContractResponse, status_code=status.HTTP_201_CREATED)
def create_contract(data: PatientPlanContractCreate, identity: Annotated[AuthenticatedIdentity, Depends(require_permission(PermissionModule.PATIENTS, PermissionAction.UPDATE))], db: Annotated[Session, Depends(get_db)]):
    try: return PatientPlanContractDomain.create(db, identity, data)
    except PatientPlanContractReferenceError as error: raise HTTPException(422, str(error)) from error
    except PatientPlanContractPersistenceError as error: raise HTTPException(409, "Não foi possível registrar a contratação.") from error


@router.get("", response_model=PatientPlanContractListResponse)
def list_contracts(patient_id: uuid.UUID, identity: Annotated[AuthenticatedIdentity, Depends(require_permission(PermissionModule.PATIENTS, PermissionAction.VIEW))], db: Annotated[Session, Depends(get_db)], page: Annotated[int, Query(ge=1)] = 1, page_size: Annotated[int, Query(ge=1, le=100)] = 20):
    try: return PatientPlanContractDomain.list(db, identity, patient_id, page=page, page_size=page_size)
    except PatientPlanContractNotFoundError as error: raise HTTPException(404, "Paciente não encontrado.") from error

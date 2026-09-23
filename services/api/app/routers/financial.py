import uuid
from datetime import date
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.core.identity import AuthenticatedIdentity, PermissionAction, PermissionModule
from app.db.session import get_db
from app.dependencies.auth import require_permission
from app.schemas.financial import (
    FinancialTransactionCreate,
    FinancialTransactionListResponse,
    FinancialTransactionPayment,
    FinancialTransactionResponse,
    FinancialTransactionUpdate,
    TransactionStatus,
    TransactionType,
)
from app.services.financial import (
    FinancialDomain,
    FinancialLifecycleError,
    FinancialNotFoundError,
    FinancialPersistenceError,
    FinancialReferenceError,
)


router = APIRouter(prefix="/financial/transactions", tags=["Financial"])
require_view = require_permission(PermissionModule.FINANCIAL, PermissionAction.VIEW)
require_create = require_permission(PermissionModule.FINANCIAL, PermissionAction.CREATE)
require_update = require_permission(PermissionModule.FINANCIAL, PermissionAction.UPDATE)
require_delete = require_permission(PermissionModule.FINANCIAL, PermissionAction.DELETE)


def translate_financial_error(error: Exception) -> None:
    if isinstance(error, (FinancialNotFoundError, FinancialReferenceError)):
        raise HTTPException(status_code=404, detail="Lançamento ou referência não encontrado.") from error
    if isinstance(error, FinancialLifecycleError):
        raise HTTPException(status_code=409, detail=str(error)) from error
    if isinstance(error, FinancialPersistenceError):
        raise HTTPException(status_code=409, detail="Não foi possível persistir o lançamento.") from error
    raise error


@router.get("", response_model=FinancialTransactionListResponse)
def list_transactions(
    identity: Annotated[AuthenticatedIdentity, Depends(require_view)],
    db: Annotated[Session, Depends(get_db)],
    due_from: date | None = None,
    due_to: date | None = None,
    transaction_type: Annotated[TransactionType | None, Query(alias="type")] = None,
    transaction_status: Annotated[TransactionStatus | None, Query(alias="status")] = None,
    page: Annotated[int, Query(ge=1)] = 1,
    page_size: Annotated[int, Query(ge=1, le=100)] = 20,
) -> FinancialTransactionListResponse:
    try:
        return FinancialDomain.list(
            db,
            identity,
            due_from=due_from,
            due_to=due_to,
            transaction_type=transaction_type,
            status=transaction_status,
            page=page,
            page_size=page_size,
        )
    except FinancialLifecycleError as error:
        translate_financial_error(error)
        raise AssertionError("unreachable")


@router.post("", response_model=FinancialTransactionResponse, status_code=201)
def create_transaction(
    data: FinancialTransactionCreate,
    identity: Annotated[AuthenticatedIdentity, Depends(require_create)],
    db: Annotated[Session, Depends(get_db)],
) -> FinancialTransactionResponse:
    try:
        return FinancialTransactionResponse.model_validate(
            FinancialDomain.create(db, identity, data)
        )
    except Exception as error:
        translate_financial_error(error)
        raise AssertionError("unreachable")


@router.get("/{transaction_id}", response_model=FinancialTransactionResponse)
def get_transaction(
    transaction_id: uuid.UUID,
    identity: Annotated[AuthenticatedIdentity, Depends(require_view)],
    db: Annotated[Session, Depends(get_db)],
) -> FinancialTransactionResponse:
    try:
        return FinancialTransactionResponse.model_validate(
            FinancialDomain.detail(db, identity, transaction_id)
        )
    except FinancialNotFoundError as error:
        translate_financial_error(error)
        raise AssertionError("unreachable")


@router.patch("/{transaction_id}", response_model=FinancialTransactionResponse)
def update_transaction(
    transaction_id: uuid.UUID,
    data: FinancialTransactionUpdate,
    identity: Annotated[AuthenticatedIdentity, Depends(require_update)],
    db: Annotated[Session, Depends(get_db)],
) -> FinancialTransactionResponse:
    try:
        return FinancialTransactionResponse.model_validate(
            FinancialDomain.update(db, identity, transaction_id, data)
        )
    except Exception as error:
        translate_financial_error(error)
        raise AssertionError("unreachable")


@router.post("/{transaction_id}/pay", response_model=FinancialTransactionResponse)
def pay_transaction(
    transaction_id: uuid.UUID,
    data: FinancialTransactionPayment,
    identity: Annotated[AuthenticatedIdentity, Depends(require_update)],
    db: Annotated[Session, Depends(get_db)],
) -> FinancialTransactionResponse:
    try:
        return FinancialTransactionResponse.model_validate(
            FinancialDomain.pay(db, identity, transaction_id, data)
        )
    except Exception as error:
        translate_financial_error(error)
        raise AssertionError("unreachable")


@router.post("/{transaction_id}/cancel", response_model=FinancialTransactionResponse)
def cancel_transaction(
    transaction_id: uuid.UUID,
    identity: Annotated[AuthenticatedIdentity, Depends(require_update)],
    db: Annotated[Session, Depends(get_db)],
) -> FinancialTransactionResponse:
    try:
        return FinancialTransactionResponse.model_validate(
            FinancialDomain.cancel(db, identity, transaction_id)
        )
    except Exception as error:
        translate_financial_error(error)
        raise AssertionError("unreachable")


@router.delete("/{transaction_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_transaction(
    transaction_id: uuid.UUID,
    identity: Annotated[AuthenticatedIdentity, Depends(require_delete)],
    db: Annotated[Session, Depends(get_db)],
) -> None:
    try:
        FinancialDomain.soft_delete(db, identity, transaction_id)
    except Exception as error:
        translate_financial_error(error)

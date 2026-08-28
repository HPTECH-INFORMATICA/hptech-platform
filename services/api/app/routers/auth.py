import logging
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.security import PasswordPolicyError
from app.core.identity import AuthenticatedIdentity
from app.db.session import get_db
from app.dependencies.auth import get_current_user
from app.schemas.auth import (
    CurrentCompanyResponse,
    CurrentPermissionResponse,
    CurrentUserResponse,
    LoginRequest,
    TokenResponse,
)
from app.services.auth import AuthenticationError, AuthService
from app.schemas.user_invitation import AcceptInvitationRequest, AcceptInvitationResponse
from app.schemas.password import (
    ChangePasswordRequest,
    ForgotPasswordRequest,
    PasswordOperationResponse,
    ResetPasswordRequest,
)
from app.services.invitation_notifier import ResendPasswordResetNotifier
from app.services.password import (
    CurrentPasswordInvalidError,
    PasswordResetInvalidError,
    PasswordService,
    SamePasswordError,
)
from app.services.user_invitation import (
    InvitationConflictError,
    InvitationInvalidError,
    UserInvitationService,
)
from app.services.login_rate_limit import LoginRateLimiter, LoginRateLimitExceeded


router = APIRouter(
    prefix="/auth",
    tags=["Authentication"],
)
security_logger = logging.getLogger("hptech.security")


@router.post("/forgot-password", response_model=PasswordOperationResponse)
def forgot_password(
    data: ForgotPasswordRequest,
    request: Request,
    db: Annotated[Session, Depends(get_db)],
) -> PasswordOperationResponse:
    client_host = request.client.host if request.client else "unknown"
    try:
        LoginRateLimiter.ensure_allowed(db, str(data.email), client_host)
    except LoginRateLimitExceeded as error:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Muitas solicitações. Tente novamente mais tarde.",
            headers={"Retry-After": str(error.retry_after)},
        ) from error
    try:
        PasswordService.request_reset(
            db, str(data.email), ResendPasswordResetNotifier()
        )
    finally:
        LoginRateLimiter.record_failure(db, str(data.email), client_host)
        db.commit()
    return PasswordOperationResponse(message=PasswordService.GENERIC_MESSAGE)


@router.post("/reset-password", response_model=PasswordOperationResponse)
def reset_password(
    data: ResetPasswordRequest,
    request: Request,
    db: Annotated[Session, Depends(get_db)],
) -> PasswordOperationResponse:
    client_host = request.client.host if request.client else "unknown"
    try:
        LoginRateLimiter.ensure_allowed(db, "password-reset", client_host)
        PasswordService.reset_password(db, data.token, data.password)
    except LoginRateLimitExceeded as error:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Muitas tentativas. Tente novamente mais tarde.",
            headers={"Retry-After": str(error.retry_after)},
        ) from error
    except (PasswordResetInvalidError, PasswordPolicyError) as error:
        db.rollback()
        LoginRateLimiter.record_failure(db, "password-reset", client_host)
        db.commit()
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(error)) from error
    LoginRateLimiter.clear(db, "password-reset", client_host)
    db.commit()
    return PasswordOperationResponse(message="Senha redefinida com sucesso.")


@router.post("/change-password", response_model=PasswordOperationResponse)
def change_password(
    data: ChangePasswordRequest,
    request: Request,
    identity: Annotated[AuthenticatedIdentity, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
) -> PasswordOperationResponse:
    client_host = request.client.host if request.client else "unknown"
    try:
        LoginRateLimiter.clear(db, identity.user.email, client_host)
        PasswordService.change_password(
            db, identity, data.current_password, data.new_password
        )
    except (CurrentPasswordInvalidError, SamePasswordError, PasswordPolicyError) as error:
        db.rollback()
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(error)) from error
    except Exception:
        db.rollback()
        raise
    return PasswordOperationResponse(message="Senha alterada com sucesso.")


@router.post("/accept-invitation", response_model=AcceptInvitationResponse)
def accept_invitation(
    data: AcceptInvitationRequest,
    request: Request,
    db: Annotated[Session, Depends(get_db)],
) -> AcceptInvitationResponse:
    client_host = request.client.host if request.client else "unknown"
    try:
        LoginRateLimiter.ensure_allowed(db, "invitation", client_host)
        UserInvitationService.accept(db, data.token, data.password)
    except LoginRateLimitExceeded as error:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Muitas tentativas. Tente novamente mais tarde.",
            headers={"Retry-After": str(error.retry_after)},
        ) from error
    except (InvitationInvalidError, InvitationConflictError, PasswordPolicyError) as error:
        LoginRateLimiter.record_failure(db, "invitation", client_host)
        db.commit()
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(error)) from error
    LoginRateLimiter.clear(db, "invitation", client_host)
    db.commit()
    return AcceptInvitationResponse(message="Convite aceito com sucesso.")


@router.post(
    "/login",
    response_model=TokenResponse,
)
def login(
    data: LoginRequest,
    request: Request,
    db: Annotated[Session, Depends(get_db)],
) -> TokenResponse:
    client_host = request.client.host if request.client else "unknown"

    try:
        LoginRateLimiter.ensure_allowed(db, str(data.email), client_host)
    except LoginRateLimitExceeded as error:
        security_logger.warning("security.login.rate_limited")
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Muitas tentativas de acesso. Tente novamente mais tarde.",
            headers={"Retry-After": str(error.retry_after)},
        ) from error

    try:
        result = AuthService.authenticate(
            db,
            str(data.email),
            data.password,
        )
    except AuthenticationError as error:
        LoginRateLimiter.record_failure(db, str(data.email), client_host)
        db.commit()
        security_logger.info("security.login.failed")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Email ou senha inválidos.",
            headers={"WWW-Authenticate": "Bearer"},
        ) from error

    LoginRateLimiter.clear(db, str(data.email), client_host)
    db.commit()
    security_logger.info("security.login.succeeded")

    return TokenResponse(
        access_token=result.access_token,
        expires_in=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
    )


@router.get(
    "/me",
    response_model=CurrentUserResponse,
)
def get_me(
    identity: Annotated[AuthenticatedIdentity, Depends(get_current_user)],
) -> CurrentUserResponse:
    return CurrentUserResponse(
        id=identity.user.id,
        name=identity.user.name,
        email=identity.user.email,
        role=identity.role,
        active=identity.user.is_active,
        company=CurrentCompanyResponse(
            id=identity.company.id,
            name=identity.company.name,
            slug=identity.company.slug,
            status=identity.company.status,
            timezone=identity.company.timezone,
        ),
        permissions=[
            CurrentPermissionResponse(
                module=permission.module,
                actions=sorted(action.value for action in permission.actions),
            )
            for permission in identity.permissions
        ],
    )

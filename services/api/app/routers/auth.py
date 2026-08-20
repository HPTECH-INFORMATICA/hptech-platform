import logging
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy.orm import Session

from app.core.config import settings
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
from app.services.login_rate_limit import LoginRateLimiter, LoginRateLimitExceeded


router = APIRouter(
    prefix="/auth",
    tags=["Authentication"],
)
security_logger = logging.getLogger("hptech.security")


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
        ),
        permissions=[
            CurrentPermissionResponse(
                module=permission.module,
                actions=sorted(action.value for action in permission.actions),
            )
            for permission in identity.permissions
        ],
    )

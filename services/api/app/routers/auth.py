from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.identity import AuthenticatedIdentity
from app.db.session import get_db
from app.dependencies.auth import get_current_user
from app.schemas.auth import (
    CurrentCompanyResponse,
    CurrentUserResponse,
    LoginRequest,
    TokenResponse,
)
from app.services.auth import AuthenticationError, AuthService


router = APIRouter(
    prefix="/auth",
    tags=["Authentication"],
)


@router.post(
    "/login",
    response_model=TokenResponse,
)
def login(
    data: LoginRequest,
    db: Annotated[Session, Depends(get_db)],
) -> TokenResponse:
    try:
        result = AuthService.authenticate(
            db,
            str(data.email),
            data.password,
        )
    except AuthenticationError as error:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Email ou senha inválidos.",
            headers={"WWW-Authenticate": "Bearer"},
        ) from error

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
    )

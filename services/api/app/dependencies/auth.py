import uuid
from collections.abc import Callable
from typing import Annotated

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.orm import Session

from app.core.identity import (
    AuthenticatedIdentity,
    PermissionAction,
    PermissionModule,
)
from app.core.rbac import has_permission
from app.core.security import TokenValidationError, decode_access_token
from app.db.session import get_db
from app.repositories.user import UserRepository
from app.services.auth import AuthenticationError, AuthService


bearer_scheme = HTTPBearer(auto_error=False)


def authentication_exception() -> HTTPException:
    return HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Não foi possível autenticar a solicitação.",
        headers={"WWW-Authenticate": "Bearer"},
    )


def get_current_user(
    credentials: Annotated[
        HTTPAuthorizationCredentials | None,
        Depends(bearer_scheme),
    ],
    db: Annotated[Session, Depends(get_db)],
) -> AuthenticatedIdentity:
    if credentials is None or credentials.scheme.lower() != "bearer":
        raise authentication_exception()

    try:
        claims = decode_access_token(credentials.credentials)
        user = UserRepository.get_by_id(db, uuid.UUID(claims.subject))

        if user is None:
            raise AuthenticationError

        persisted_auth_version = (
            1 if user.auth_version is None else user.auth_version
        )
        if claims.auth_version != persisted_auth_version:
            raise AuthenticationError

        return AuthService.identity_from_user(user, db)
    except (AuthenticationError, TokenValidationError, ValueError) as error:
        raise authentication_exception() from error


def require_permission(
    module: PermissionModule,
    action: PermissionAction,
) -> Callable[..., AuthenticatedIdentity]:
    def permission_dependency(
        identity: Annotated[AuthenticatedIdentity, Depends(get_current_user)],
    ) -> AuthenticatedIdentity:
        if not has_permission(identity.permissions, module, action):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="PermissÃ£o insuficiente para esta operaÃ§Ã£o.",
            )

        return identity

    return permission_dependency

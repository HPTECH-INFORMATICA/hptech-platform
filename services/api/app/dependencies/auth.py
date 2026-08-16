import uuid
from typing import Annotated

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.orm import Session

from app.core.identity import AuthenticatedIdentity
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

        return AuthService.identity_from_user(user)
    except (AuthenticationError, TokenValidationError, ValueError) as error:
        raise authentication_exception() from error

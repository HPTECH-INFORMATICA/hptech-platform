from dataclasses import dataclass

from sqlalchemy.orm import Session

from app.core.identity import (
    AuthenticatedIdentity,
    CompanyStatus,
    UserRole,
)
from app.core.security import create_access_token, verify_password
from app.core.rbac import permissions_for_role
from app.models.user import User
from app.repositories.user import (
    AmbiguousUserEmailError,
    UserRepository,
    normalize_email,
)


class AuthenticationError(RuntimeError):
    """Raised when credentials or the current identity cannot be trusted."""


@dataclass(frozen=True)
class AuthenticationResult:
    access_token: str
    identity: AuthenticatedIdentity


class AuthService:
    @staticmethod
    def authenticate(
        db: Session,
        email: str,
        password: str,
    ) -> AuthenticationResult:
        try:
            user = UserRepository.get_unique_by_email(
                db,
                normalize_email(email),
            )
        except AmbiguousUserEmailError as error:
            raise AuthenticationError from error

        if user is None or not verify_password(password, user.password_hash):
            raise AuthenticationError

        identity = AuthService.identity_from_user(user)
        auth_version = (
            1 if identity.user.auth_version is None else identity.user.auth_version
        )
        access_token = create_access_token(
            identity.user.id,
            auth_version=auth_version,
        )

        return AuthenticationResult(
            access_token=access_token,
            identity=identity,
        )

    @staticmethod
    def identity_from_user(user: User) -> AuthenticatedIdentity:
        if user.deleted_at is not None or not user.is_active:
            raise AuthenticationError

        company = user.company

        if company is None or company.deleted_at is not None:
            raise AuthenticationError

        try:
            company_status = CompanyStatus(company.status)
            role = UserRole(user.role)
        except ValueError as error:
            raise AuthenticationError from error

        if company_status not in {CompanyStatus.TRIAL, CompanyStatus.ACTIVE}:
            raise AuthenticationError

        return AuthenticatedIdentity(
            user=user,
            company=company,
            role=role,
            permissions=permissions_for_role(role),
        )

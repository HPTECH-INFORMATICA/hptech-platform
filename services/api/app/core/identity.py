from __future__ import annotations

from dataclasses import dataclass
from enum import StrEnum
from typing import TYPE_CHECKING

if TYPE_CHECKING:
    from app.models.company import Company
    from app.models.user import User


class CompanyStatus(StrEnum):
    TRIAL = "TRIAL"
    ACTIVE = "ACTIVE"
    SUSPENDED = "SUSPENDED"
    CANCELED = "CANCELED"


class UserRole(StrEnum):
    OWNER = "OWNER"
    ADMIN = "ADMIN"
    MANAGER = "MANAGER"
    PROFESSIONAL = "PROFESSIONAL"
    RECEPTIONIST = "RECEPTIONIST"
    SALES = "SALES"
    FINANCIAL = "FINANCIAL"
    VIEWER = "VIEWER"


class PermissionModule(StrEnum):
    DASHBOARD = "DASHBOARD"
    CRM = "CRM"
    COMPANY = "COMPANY"
    USERS = "USERS"


class PermissionAction(StrEnum):
    VIEW = "VIEW"
    CREATE = "CREATE"
    UPDATE = "UPDATE"
    DELETE = "DELETE"
    BLOCK = "BLOCK"
    MANAGE_ROLE = "MANAGE_ROLE"


@dataclass(frozen=True)
class Permission:
    module: PermissionModule
    actions: frozenset[PermissionAction]


@dataclass(frozen=True)
class AuthenticatedIdentity:
    user: User
    company: Company
    role: UserRole
    permissions: tuple[Permission, ...]


def normalize_company_status(value: str | CompanyStatus) -> str:
    try:
        return CompanyStatus(value).value
    except ValueError as error:
        raise ValueError("Status de empresa inválido.") from error


def normalize_user_role(value: str | UserRole) -> str:
    try:
        return UserRole(value).value
    except ValueError as error:
        raise ValueError("Papel de usuário inválido.") from error

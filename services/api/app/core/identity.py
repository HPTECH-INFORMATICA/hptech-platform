from enum import StrEnum


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

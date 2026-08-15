import pytest

from app.db import base as _models  # noqa: F401
from app.core.identity import CompanyStatus, UserRole
from app.models.company import Company
from app.models.user import User


@pytest.mark.parametrize("status", list(CompanyStatus))
def test_company_accepts_documented_statuses(status: CompanyStatus) -> None:
    company = Company(name="Empresa de teste", slug="empresa-teste", status=status)

    assert company.status == status.value


def test_company_rejects_invalid_status() -> None:
    with pytest.raises(ValueError, match="Status de empresa inválido"):
        Company(name="Empresa de teste", slug="empresa-teste", status="INVALID")


@pytest.mark.parametrize("role", list(UserRole))
def test_user_accepts_documented_roles(role: UserRole) -> None:
    user = User(
        name="Usuário de teste",
        email="usuario@example.test",
        password_hash="hash-de-teste",
        role=role,
    )

    assert user.role == role.value


def test_user_rejects_invalid_role() -> None:
    with pytest.raises(ValueError, match="Papel de usuário inválido"):
        User(
            name="Usuário de teste",
            email="usuario@example.test",
            password_hash="hash-de-teste",
            role="INVALID",
        )

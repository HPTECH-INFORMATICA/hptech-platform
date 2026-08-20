"""Cria o primeiro OWNER de uma empresa existente, sem expor senha na CLI."""

import argparse
from getpass import getpass

from sqlalchemy import select

from app.core.identity import UserRole
from app.core.security import hash_password
from app.db.session import SessionLocal
from app.models.company import Company
from app.models.user import User
from app.repositories.user import UserRepository, normalize_email


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Cria um OWNER para uma empresa existente.",
    )
    parser.add_argument("--company-slug", required=True)
    parser.add_argument("--name", required=True)
    parser.add_argument("--email", required=True)
    return parser.parse_args()


def main() -> int:
    args = parse_args()
    password = getpass("Senha do OWNER: ")
    confirmation = getpass("Confirme a senha: ")
    if password != confirmation:
        raise SystemExit("As senhas não coincidem.")

    normalized_email = normalize_email(args.email)
    with SessionLocal() as db:
        company = db.execute(
            select(Company).where(
                Company.slug == args.company_slug.strip(),
                Company.deleted_at.is_(None),
            )
        ).scalar_one_or_none()
        if company is None:
            raise SystemExit("Empresa não encontrada.")

        if UserRepository.get_unique_by_email(db, normalized_email) is not None:
            raise SystemExit("Já existe um usuário ativo com esse email.")

        owner = User(
            company_id=company.id,
            name=args.name.strip(),
            email=normalized_email,
            password_hash=hash_password(password),
            role=UserRole.OWNER.value,
            is_active=True,
        )
        db.add(owner)
        db.commit()

    print("OWNER criado com sucesso.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

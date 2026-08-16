import uuid

from fastapi import HTTPException, status

from app.core.identity import AuthenticatedIdentity


def resolve_authenticated_company_id(
    identity: AuthenticatedIdentity,
    legacy_company_id: uuid.UUID | None,
) -> uuid.UUID:
    authenticated_company_id = identity.company.id

    if (
        legacy_company_id is not None
        and legacy_company_id != authenticated_company_id
    ):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Empresa não autorizada para esta sessão.",
        )

    return authenticated_company_id

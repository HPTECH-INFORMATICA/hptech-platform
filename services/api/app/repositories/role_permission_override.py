import uuid

from sqlalchemy import delete, select
from sqlalchemy.orm import Session

from app.core.identity import UserRole
from app.models.role_permission_override import RolePermissionOverride


class RolePermissionOverrideRepository:
    @staticmethod
    def list_for_role(
        db: Session, company_id: uuid.UUID, role: UserRole
    ) -> list[RolePermissionOverride]:
        statement = (
            select(RolePermissionOverride)
            .where(
                RolePermissionOverride.company_id == company_id,
                RolePermissionOverride.role == role.value,
            )
            .order_by(RolePermissionOverride.module, RolePermissionOverride.action)
        )
        return list(db.execute(statement).scalars().all())

    @staticmethod
    def list_for_company(
        db: Session, company_id: uuid.UUID
    ) -> list[RolePermissionOverride]:
        statement = select(RolePermissionOverride).where(
            RolePermissionOverride.company_id == company_id
        )
        return list(db.execute(statement).scalars().all())

    @staticmethod
    def replace_role(
        db: Session,
        company_id: uuid.UUID,
        role: UserRole,
        overrides: list[RolePermissionOverride],
    ) -> None:
        db.execute(
            delete(RolePermissionOverride).where(
                RolePermissionOverride.company_id == company_id,
                RolePermissionOverride.role == role.value,
            )
        )
        db.add_all(overrides)

    @staticmethod
    def reset_role(db: Session, company_id: uuid.UUID, role: UserRole) -> int:
        result = db.execute(
            delete(RolePermissionOverride).where(
                RolePermissionOverride.company_id == company_id,
                RolePermissionOverride.role == role.value,
            )
        )
        return result.rowcount or 0

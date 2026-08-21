import uuid
from datetime import datetime, timezone

from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.core.identity import AuthenticatedIdentity, UserRole
from app.models.user import User
from app.repositories.audit_log import AuditLogRepository
from app.repositories.user import UserRepository, normalize_email
from app.schemas.user_admin import UserAdminUpdate


class UserAdminNotFoundError(RuntimeError):
    pass


class UserAdminForbiddenError(RuntimeError):
    pass


class UserAdminConflictError(RuntimeError):
    pass


class UserAdminService:
    @staticmethod
    def list_users(
        db: Session,
        identity: AuthenticatedIdentity,
        *,
        page: int,
        page_size: int,
        search: str | None = None,
        role: UserRole | None = None,
        is_active: bool | None = None,
    ) -> tuple[list[User], int]:
        return UserRepository.list_by_company(
            db,
            identity.company.id,
            page=page,
            page_size=page_size,
            search=search,
            role=role,
            is_active=is_active,
        )

    @staticmethod
    def detail(
        db: Session,
        identity: AuthenticatedIdentity,
        user_id: uuid.UUID,
    ) -> User:
        target = UserRepository.get_by_company_and_id(
            db,
            identity.company.id,
            user_id,
        )
        if target is None:
            raise UserAdminNotFoundError
        return target

    @staticmethod
    def _mutation_target(
        db: Session,
        identity: AuthenticatedIdentity,
        user_id: uuid.UUID,
    ) -> User:
        target = UserRepository.get_by_company_and_id(
            db,
            identity.company.id,
            user_id,
            for_update=True,
        )
        if target is None:
            raise UserAdminNotFoundError
        if identity.role is UserRole.ADMIN and target.role == UserRole.OWNER.value:
            raise UserAdminForbiddenError
        return target

    @staticmethod
    def _audit(
        db: Session,
        identity: AuthenticatedIdentity,
        target: User,
        action: str,
        details: dict[str, object],
    ) -> None:
        AuditLogRepository.add(
            db,
            company_id=identity.company.id,
            actor_user_id=identity.user.id,
            target_type="USER",
            target_id=target.id,
            action=action,
            details=details,
        )

    @staticmethod
    def _protect_last_owner(db: Session, target: User) -> None:
        if target.role != UserRole.OWNER.value or not target.is_active:
            return
        UserRepository.lock_company(db, target.company_id)
        if UserRepository.count_active_owners(db, target.company_id) <= 1:
            raise UserAdminConflictError("O último OWNER ativo deve ser preservado.")

    @classmethod
    def update(
        cls,
        db: Session,
        identity: AuthenticatedIdentity,
        user_id: uuid.UUID,
        data: UserAdminUpdate,
    ) -> User:
        target = cls._mutation_target(db, identity, user_id)
        changed: list[str] = []
        if data.name is not None and data.name != target.name:
            target.name = data.name
            changed.append("name")
        if data.email is not None:
            email = normalize_email(str(data.email))
            if email != normalize_email(target.email):
                duplicate = UserRepository.get_unique_by_email(db, email)
                if duplicate is not None and duplicate.id != target.id:
                    raise UserAdminConflictError(
                        "Email já utilizado por outro usuário."
                    )
                target.email = email
                changed.append("email")
        if not changed:
            return target
        cls._audit(db, identity, target, "USER_UPDATED", {"fields": changed})
        return target

    @classmethod
    def change_role(
        cls,
        db: Session,
        identity: AuthenticatedIdentity,
        user_id: uuid.UUID,
        role: UserRole,
    ) -> User:
        target = cls._mutation_target(db, identity, user_id)
        if target.id == identity.user.id:
            raise UserAdminForbiddenError
        if role is UserRole.OWNER and identity.role is not UserRole.OWNER:
            raise UserAdminForbiddenError
        if target.role == role.value:
            return target
        if target.role == UserRole.OWNER.value and role is not UserRole.OWNER:
            cls._protect_last_owner(db, target)
        previous_role = target.role
        target.role = role.value
        cls._audit(
            db,
            identity,
            target,
            "USER_ROLE_CHANGED",
            {"from": previous_role, "to": role.value},
        )
        return target

    @classmethod
    def set_active(
        cls,
        db: Session,
        identity: AuthenticatedIdentity,
        user_id: uuid.UUID,
        is_active: bool,
    ) -> User:
        target = cls._mutation_target(db, identity, user_id)
        if target.id == identity.user.id:
            raise UserAdminForbiddenError
        if target.is_active is is_active:
            return target
        if not is_active:
            cls._protect_last_owner(db, target)
        target.is_active = is_active
        cls._audit(
            db,
            identity,
            target,
            "USER_REACTIVATED" if is_active else "USER_BLOCKED",
            {"from": not is_active, "to": is_active},
        )
        return target

    @classmethod
    def soft_delete(
        cls,
        db: Session,
        identity: AuthenticatedIdentity,
        user_id: uuid.UUID,
    ) -> User:
        target = cls._mutation_target(db, identity, user_id)
        if target.id == identity.user.id:
            raise UserAdminForbiddenError
        cls._protect_last_owner(db, target)
        target.is_active = False
        target.deleted_at = datetime.now(timezone.utc)
        cls._audit(
            db,
            identity,
            target,
            "USER_SOFT_DELETED",
            {"is_active": False},
        )
        return target

    @staticmethod
    def commit(db: Session) -> None:
        try:
            db.commit()
        except IntegrityError as error:
            db.rollback()
            raise UserAdminConflictError("Conflito com dados existentes.") from error

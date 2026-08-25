from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.core.identity import (
    AuthenticatedIdentity,
    Permission,
    PermissionAction,
    PermissionModule,
    UserRole,
)
from app.core.rbac import has_permission, permissions_for_role
from app.models.role_permission_override import RolePermissionOverride
from app.repositories.audit_log import AuditLogRepository
from app.repositories.role_permission_override import RolePermissionOverrideRepository
from app.schemas.access_control import (
    AccessControlCatalogResponse,
    AccessControlModuleResponse,
    AccessControlOverrideResponse,
    AccessControlPermissionInput,
    AccessControlPermissionResponse,
    AccessControlRoleResponse,
)
from app.services.permissions import (
    effective_permissions,
    official_permission_pairs,
    permission_pairs,
)


class AccessControlForbiddenError(RuntimeError):
    pass


class AccessControlInvalidError(RuntimeError):
    pass


class AccessControlConflictError(RuntimeError):
    pass


def _permission_responses(
    permissions: tuple[Permission, ...]
) -> list[AccessControlPermissionResponse]:
    return [
        AccessControlPermissionResponse(
            module=permission.module,
            actions=[action for action in PermissionAction if action in permission.actions],
        )
        for permission in permissions
    ]


def _role_response(
    db: Session,
    identity: AuthenticatedIdentity,
    role: UserRole,
) -> AccessControlRoleResponse:
    overrides = RolePermissionOverrideRepository.list_for_role(
        db, identity.company.id, role
    )
    return AccessControlRoleResponse(
        role=role,
        base_permissions=_permission_responses(permissions_for_role(role)),
        effective_permissions=_permission_responses(
            effective_permissions(db, identity.company.id, role)
        ),
        overrides=[
            AccessControlOverrideResponse(
                module=PermissionModule(override.module),
                action=PermissionAction(override.action),
                allowed=override.allowed,
            )
            for override in overrides
        ],
        editable=(
            identity.role is UserRole.OWNER
            and role is not UserRole.OWNER
            and has_permission(
                identity.permissions,
                PermissionModule.ACCESS_CONTROL,
                PermissionAction.MANAGE,
            )
        ),
        customized=bool(overrides),
    )


class AccessControlService:
    @staticmethod
    def catalog(
        db: Session, identity: AuthenticatedIdentity
    ) -> AccessControlCatalogResponse:
        official = official_permission_pairs()
        return AccessControlCatalogResponse(
            roles=[_role_response(db, identity, role) for role in UserRole],
            modules=[
                AccessControlModuleResponse(
                    module=module,
                    actions=[
                        action
                        for action in PermissionAction
                        if (module, action) in official
                    ],
                )
                for module in PermissionModule
                if any(candidate_module == module for candidate_module, _ in official)
            ],
            can_manage=has_permission(
                identity.permissions,
                PermissionModule.ACCESS_CONTROL,
                PermissionAction.MANAGE,
            ),
        )

    @staticmethod
    def _validate_target(identity: AuthenticatedIdentity, role: UserRole) -> None:
        if identity.role is not UserRole.OWNER or role is UserRole.OWNER:
            raise AccessControlForbiddenError

    @classmethod
    def update_role(
        cls,
        db: Session,
        identity: AuthenticatedIdentity,
        role: UserRole,
        permissions: list[AccessControlPermissionInput],
    ) -> AccessControlRoleResponse:
        cls._validate_target(identity, role)
        desired = {(item.module, item.action) for item in permissions}
        if len(desired) != len(permissions) or not desired <= official_permission_pairs():
            raise AccessControlInvalidError("Permissões inválidas ou duplicadas.")
        if (PermissionModule.ACCESS_CONTROL, PermissionAction.MANAGE) in desired:
            raise AccessControlInvalidError(
                "ACCESS_CONTROL/MANAGE é exclusiva do OWNER."
            )

        base = permission_pairs(permissions_for_role(role))
        overrides = [
            RolePermissionOverride(
                company_id=identity.company.id,
                role=role,
                module=module,
                action=action,
                allowed=(module, action) in desired,
                updated_by_user_id=identity.user.id,
            )
            for module, action in sorted(
                desired.symmetric_difference(base),
                key=lambda pair: (list(PermissionModule).index(pair[0]), list(PermissionAction).index(pair[1])),
            )
        ]
        enabled = sorted(f"{module.value}/{action.value}" for module, action in desired - base)
        revoked = sorted(f"{module.value}/{action.value}" for module, action in base - desired)
        try:
            RolePermissionOverrideRepository.replace_role(
                db, identity.company.id, role, overrides
            )
            AuditLogRepository.add(
                db,
                company_id=identity.company.id,
                actor_user_id=identity.user.id,
                target_type="ROLE",
                target_id=None,
                action="ROLE_PERMISSIONS_CHANGED",
                details={"role": role.value, "enabled": enabled, "revoked": revoked},
            )
            db.commit()
        except IntegrityError as error:
            db.rollback()
            raise AccessControlConflictError from error
        return _role_response(db, identity, role)

    @classmethod
    def reset_role(
        cls, db: Session, identity: AuthenticatedIdentity, role: UserRole
    ) -> AccessControlRoleResponse:
        cls._validate_target(identity, role)
        try:
            removed = RolePermissionOverrideRepository.reset_role(
                db, identity.company.id, role
            )
            if removed:
                AuditLogRepository.add(
                    db,
                    company_id=identity.company.id,
                    actor_user_id=identity.user.id,
                    target_type="ROLE",
                    target_id=None,
                    action="ROLE_PERMISSIONS_RESET",
                    details={"role": role.value},
                )
            db.commit()
        except IntegrityError as error:
            db.rollback()
            raise AccessControlConflictError from error
        return _role_response(db, identity, role)

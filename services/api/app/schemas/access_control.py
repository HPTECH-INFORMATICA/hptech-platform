from pydantic import BaseModel, ConfigDict

from app.core.identity import PermissionAction, PermissionModule, UserRole


class AccessControlPermissionResponse(BaseModel):
    module: PermissionModule
    actions: list[PermissionAction]


class AccessControlOverrideResponse(BaseModel):
    module: PermissionModule
    action: PermissionAction
    allowed: bool


class AccessControlRoleResponse(BaseModel):
    role: UserRole
    base_permissions: list[AccessControlPermissionResponse]
    effective_permissions: list[AccessControlPermissionResponse]
    overrides: list[AccessControlOverrideResponse]
    editable: bool
    customized: bool


class AccessControlModuleResponse(BaseModel):
    module: PermissionModule
    actions: list[PermissionAction]


class AccessControlCatalogResponse(BaseModel):
    roles: list[AccessControlRoleResponse]
    modules: list[AccessControlModuleResponse]
    can_manage: bool


class AccessControlPermissionInput(BaseModel):
    model_config = ConfigDict(extra="forbid")

    module: PermissionModule
    action: PermissionAction


class AccessControlRoleUpdate(BaseModel):
    model_config = ConfigDict(extra="forbid")

    permissions: list[AccessControlPermissionInput]

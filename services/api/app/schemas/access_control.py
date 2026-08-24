from pydantic import BaseModel

from app.core.identity import PermissionAction, PermissionModule, UserRole


class AccessControlPermissionResponse(BaseModel):
    module: PermissionModule
    actions: list[PermissionAction]


class AccessControlRoleResponse(BaseModel):
    role: UserRole
    permissions: list[AccessControlPermissionResponse]


class AccessControlModuleResponse(BaseModel):
    module: PermissionModule
    actions: list[PermissionAction]


class AccessControlCatalogResponse(BaseModel):
    roles: list[AccessControlRoleResponse]
    modules: list[AccessControlModuleResponse]

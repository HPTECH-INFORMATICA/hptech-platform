export type CurrentCompany = {
  id: string;
  name: string;
  slug: string;
  status: string;
};

export const permissionModules = [
  "DASHBOARD",
  "CRM",
  "COMPANY",
  "USERS",
  "ACCESS_CONTROL",
  "AUDIT",
  "SERVICES",
  "SERVICE_CATEGORIES",
] as const;
export type PermissionModule = (typeof permissionModules)[number];
export const permissionActions = [
  "VIEW",
  "CREATE",
  "UPDATE",
  "DELETE",
  "BLOCK",
  "MANAGE_ROLE",
  "MANAGE",
] as const;
export type PermissionAction =
  | "VIEW"
  | "CREATE"
  | "UPDATE"
  | "DELETE"
  | "BLOCK"
  | "MANAGE_ROLE"
  | "MANAGE";

export function isPermissionModule(value: unknown): value is PermissionModule {
  return typeof value === "string" && permissionModules.includes(value as PermissionModule);
}

export function isPermissionAction(value: unknown): value is PermissionAction {
  return typeof value === "string" && permissionActions.includes(value as PermissionAction);
}

export type CurrentPermission = {
  module: PermissionModule;
  actions: PermissionAction[];
};

export type CurrentUser = {
  id: string;
  name: string;
  email: string;
  role: string;
  active: boolean;
  company: CurrentCompany;
  permissions: CurrentPermission[];
};

export function hasPermission(
  user: CurrentUser,
  module: PermissionModule,
  action: PermissionAction,
): boolean {
  return user.permissions.some(
    (permission) =>
      permission.module === module && permission.actions.includes(action),
  );
}

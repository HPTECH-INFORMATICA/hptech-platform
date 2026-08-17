export type CurrentCompany = {
  id: string;
  name: string;
  slug: string;
  status: string;
};

export type PermissionModule = "DASHBOARD" | "CRM";
export type PermissionAction = "VIEW" | "CREATE" | "UPDATE" | "DELETE";

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

import {
  isPermissionAction,
  isPermissionModule,
  type PermissionAction,
  type PermissionModule,
} from "@/auth/types";

export type AccessControlPermission = { module: PermissionModule; actions: PermissionAction[] };
export type AccessControlOverride = { module: PermissionModule; action: PermissionAction; allowed: boolean };
export type AccessControlRole = {
  role: string;
  base_permissions: AccessControlPermission[];
  effective_permissions: AccessControlPermission[];
  overrides: AccessControlOverride[];
  editable: boolean;
  customized: boolean;
};
export type AccessControlModule = AccessControlPermission;
export type AccessControlCatalog = {
  roles: AccessControlRole[];
  modules: AccessControlModule[];
  can_manage: boolean;
};
export type AccessControlPermissionInput = { module: PermissionModule; action: PermissionAction };

export class AccessControlApiError extends Error {
  constructor(public readonly status: number, message: string) { super(message); }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}
function parsePermission(value: unknown): AccessControlPermission | null {
  if (!isRecord(value) || !isPermissionModule(value.module) || !Array.isArray(value.actions) || !value.actions.every(isPermissionAction)) return null;
  return { module: value.module, actions: value.actions };
}
function parseOverride(value: unknown): AccessControlOverride | null {
  if (!isRecord(value) || !isPermissionModule(value.module) || !isPermissionAction(value.action) || typeof value.allowed !== "boolean") return null;
  return { module: value.module, action: value.action, allowed: value.allowed };
}
function parseRole(value: unknown): AccessControlRole | null {
  if (!isRecord(value) || typeof value.role !== "string" || !Array.isArray(value.base_permissions) || !Array.isArray(value.effective_permissions) || !Array.isArray(value.overrides) || typeof value.editable !== "boolean" || typeof value.customized !== "boolean") return null;
  const base = value.base_permissions.map(parsePermission);
  const effective = value.effective_permissions.map(parsePermission);
  const overrides = value.overrides.map(parseOverride);
  if ([...base, ...effective, ...overrides].some((item) => item === null)) return null;
  return { role: value.role, base_permissions: base as AccessControlPermission[], effective_permissions: effective as AccessControlPermission[], overrides: overrides as AccessControlOverride[], editable: value.editable, customized: value.customized };
}
function parseCatalog(value: unknown): AccessControlCatalog | null {
  if (!isRecord(value) || !Array.isArray(value.roles) || !Array.isArray(value.modules) || typeof value.can_manage !== "boolean") return null;
  const roles = value.roles.map(parseRole);
  const modules = value.modules.map(parsePermission);
  if ([...roles, ...modules].some((item) => item === null)) return null;
  return { roles: roles as AccessControlRole[], modules: modules as AccessControlModule[], can_manage: value.can_manage };
}
async function request(path: string, init?: RequestInit): Promise<unknown> {
  const response = await fetch(`/api/access-control${path}`, {
    ...init,
    headers: { Accept: "application/json", ...init?.headers },
    cache: "no-store",
  });
  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as { error?: string; detail?: string } | null;
    throw new AccessControlApiError(response.status, body?.detail ?? body?.error ?? "Não foi possível concluir a operação.");
  }
  return response.json();
}
export async function getAccessControlCatalog(): Promise<AccessControlCatalog> {
  const result = parseCatalog(await request(""));
  if (!result) throw new AccessControlApiError(502, "Resposta de acessos inválida.");
  return result;
}
export async function updateRolePermissions(role: string, permissions: AccessControlPermissionInput[]): Promise<AccessControlRole> {
  const result = parseRole(await request(`/roles/${encodeURIComponent(role)}`, {
    method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ permissions }),
  }));
  if (!result) throw new AccessControlApiError(502, "Resposta de acessos inválida.");
  return result;
}
export async function resetRolePermissions(role: string): Promise<AccessControlRole> {
  const result = parseRole(await request(`/roles/${encodeURIComponent(role)}/reset`, { method: "POST" }));
  if (!result) throw new AccessControlApiError(502, "Resposta de acessos inválida.");
  return result;
}

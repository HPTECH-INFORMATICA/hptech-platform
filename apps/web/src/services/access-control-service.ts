import {
  isPermissionAction,
  isPermissionModule,
  type PermissionAction,
  type PermissionModule,
} from "@/auth/types";

export type AccessControlPermission = {
  module: PermissionModule;
  actions: PermissionAction[];
};

export type AccessControlRole = {
  role: string;
  permissions: AccessControlPermission[];
};

export type AccessControlModule = AccessControlPermission;

export type AccessControlCatalog = {
  roles: AccessControlRole[];
  modules: AccessControlModule[];
};

export class AccessControlApiError extends Error {
  constructor(public readonly status: number, message: string) {
    super(message);
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function parsePermission(value: unknown): AccessControlPermission | null {
  if (
    !isRecord(value) ||
    !isPermissionModule(value.module) ||
    !Array.isArray(value.actions) ||
    !value.actions.every(isPermissionAction)
  ) {
    return null;
  }
  return { module: value.module, actions: value.actions };
}

function parseCatalog(value: unknown): AccessControlCatalog | null {
  if (!isRecord(value) || !Array.isArray(value.roles) || !Array.isArray(value.modules)) {
    return null;
  }
  const modules = value.modules.map(parsePermission);
  const roles = value.roles.map((role) => {
    if (!isRecord(role) || typeof role.role !== "string" || !Array.isArray(role.permissions)) {
      return null;
    }
    const permissions = role.permissions.map(parsePermission);
    return permissions.some((permission) => permission === null)
      ? null
      : { role: role.role, permissions: permissions as AccessControlPermission[] };
  });
  if (modules.some((module) => module === null) || roles.some((role) => role === null)) {
    return null;
  }
  return {
    modules: modules as AccessControlModule[],
    roles: roles as AccessControlRole[],
  };
}

export async function getAccessControlCatalog(): Promise<AccessControlCatalog> {
  const response = await fetch("/api/access-control", {
    headers: { Accept: "application/json" },
    cache: "no-store",
  });
  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as { error?: string; detail?: string } | null;
    throw new AccessControlApiError(
      response.status,
      body?.detail ?? body?.error ?? "Não foi possível consultar os acessos.",
    );
  }
  const catalog = parseCatalog(await response.json().catch(() => null));
  if (!catalog) throw new AccessControlApiError(502, "Resposta de acessos inválida.");
  return catalog;
}

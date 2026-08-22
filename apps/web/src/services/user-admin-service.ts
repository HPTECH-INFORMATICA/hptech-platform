export const userRoles = [
  "OWNER",
  "ADMIN",
  "MANAGER",
  "PROFESSIONAL",
  "RECEPTIONIST",
  "SALES",
  "FINANCIAL",
  "VIEWER",
] as const;

export type UserRole = (typeof userRoles)[number];

export type AdminUser = {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

export type AdminUserList = {
  items: AdminUser[];
  total: number;
  page: number;
  page_size: number;
};

export class UserAdminApiError extends Error {
  constructor(public readonly status: number, message: string) {
    super(message);
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`/api/users${path}`, {
    ...init,
    headers: { Accept: "application/json", ...init?.headers },
    cache: "no-store",
  });
  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as
      | { detail?: string; error?: string }
      | null;
    throw new UserAdminApiError(
      response.status,
      body?.detail ?? body?.error ?? "Não foi possível concluir a operação.",
    );
  }
  if (response.status === 204) return undefined as T;
  return response.json() as Promise<T>;
}

export function listAdminUsers(params: URLSearchParams) {
  return request<AdminUserList>(`?${params.toString()}`);
}

export function updateAdminUser(id: string, data: { name: string; email: string }) {
  return request<AdminUser>(`/${encodeURIComponent(id)}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
}

export function updateAdminUserRole(id: string, role: UserRole) {
  return request<AdminUser>(`/${encodeURIComponent(id)}/role`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ role }),
  });
}

export function updateAdminUserStatus(id: string, isActive: boolean) {
  return request<AdminUser>(`/${encodeURIComponent(id)}/status`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ is_active: isActive }),
  });
}

export function deleteAdminUser(id: string) {
  return request<void>(`/${encodeURIComponent(id)}`, { method: "DELETE" });
}

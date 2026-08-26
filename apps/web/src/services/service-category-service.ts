export type ServiceCategoryData = {
  id: string;
  name: string;
  description: string | null;
  is_active: boolean;
  has_services: boolean;
  created_at: string;
  updated_at: string;
};

export type ServiceCategoryList = { items: ServiceCategoryData[]; total: number; page: number; page_size: number };
export type ServiceCategoryInput = { name: string; description: string | null };

export class ServiceCategoryApiError extends Error {
  constructor(public readonly status: number, message: string) { super(message); }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`/api/service-categories${path}`, { ...init, headers: { Accept: "application/json", ...init?.headers }, cache: "no-store" });
  if (!response.ok) {
    const body = await response.json().catch(() => null) as { detail?: string; error?: string } | null;
    throw new ServiceCategoryApiError(response.status, body?.detail ?? body?.error ?? "Não foi possível concluir a operação.");
  }
  if (response.status === 204) return undefined as T;
  return response.json() as Promise<T>;
}

export const listServiceCategories = (params: URLSearchParams) => request<ServiceCategoryList>(`?${params}`);
export const createServiceCategory = (data: ServiceCategoryInput) => request<ServiceCategoryData>("", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) });
export const updateServiceCategory = (id: string, data: ServiceCategoryInput) => request<ServiceCategoryData>(`/${encodeURIComponent(id)}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) });
export const updateServiceCategoryStatus = (id: string, isActive: boolean) => request<ServiceCategoryData>(`/${encodeURIComponent(id)}/status`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ is_active: isActive }) });
export const deleteServiceCategory = (id: string) => request<void>(`/${encodeURIComponent(id)}`, { method: "DELETE" });

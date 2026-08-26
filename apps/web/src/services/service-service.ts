export type ServiceData = {
  id: string;
  name: string;
  description: string | null;
  duration_minutes: number;
  price: string;
  category: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

export type ServiceList = {
  items: ServiceData[];
  total: number;
  page: number;
  page_size: number;
};

export type ServiceCreateInput = {
  name: string;
  description: string | null;
  duration_minutes: number;
  price: string;
  category: string | null;
};

export type ServiceUpdateInput = ServiceCreateInput;

export class ServiceApiError extends Error {
  constructor(public readonly status: number, message: string) {
    super(message);
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`/api/services${path}`, {
    ...init,
    headers: { Accept: "application/json", ...init?.headers },
    cache: "no-store",
  });
  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as
      | { detail?: string; error?: string }
      | null;
    throw new ServiceApiError(
      response.status,
      body?.detail ?? body?.error ?? "Não foi possível concluir a operação.",
    );
  }
  if (response.status === 204) return undefined as T;
  return response.json() as Promise<T>;
}

export function listServices(params: URLSearchParams) {
  return request<ServiceList>(`?${params.toString()}`);
}

export function getService(id: string) {
  return request<ServiceData>(`/${encodeURIComponent(id)}`);
}

export function createService(data: ServiceCreateInput) {
  return request<ServiceData>("", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
}

export function updateService(id: string, data: ServiceUpdateInput) {
  return request<ServiceData>(`/${encodeURIComponent(id)}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
}

export function updateServiceStatus(id: string, isActive: boolean) {
  return request<ServiceData>(`/${encodeURIComponent(id)}/status`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ is_active: isActive }),
  });
}

export function deleteService(id: string) {
  return request<void>(`/${encodeURIComponent(id)}`, { method: "DELETE" });
}

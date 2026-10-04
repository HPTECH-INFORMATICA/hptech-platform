export type TreatmentPlanItemData = {
  id: string;
  service_id: string;
  service_name: string;
  paid_sessions: number;
  complimentary_sessions: number;
};

export type TreatmentPlanData = {
  id: string;
  name: string;
  description: string | null;
  price: string;
  validity_days: number;
  is_active: boolean;
  items: TreatmentPlanItemData[];
  created_at: string;
  updated_at: string;
};

export type TreatmentPlanInput = {
  name: string;
  description: string | null;
  price: string;
  validity_days: number;
  items: Array<{
    service_id: string;
    paid_sessions: number;
    complimentary_sessions: number;
  }>;
};

export class TreatmentPlanApiError extends Error {
  constructor(public readonly status: number, message: string) {
    super(message);
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`/api/treatment-plans${path}`, {
    ...init,
    headers: { Accept: "application/json", ...init?.headers },
    cache: "no-store",
  });
  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as { detail?: string; error?: string } | null;
    throw new TreatmentPlanApiError(response.status, body?.detail ?? body?.error ?? "Não foi possível concluir a operação.");
  }
  if (response.status === 204) return undefined as T;
  return response.json() as Promise<T>;
}

export function listTreatmentPlans() {
  return request<{ items: TreatmentPlanData[] }>("?page=1&page_size=100");
}
export function createTreatmentPlan(data: TreatmentPlanInput) {
  return request<TreatmentPlanData>("", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) });
}
export function updateTreatmentPlan(id: string, data: TreatmentPlanInput) {
  return request<TreatmentPlanData>(`/${encodeURIComponent(id)}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) });
}
export function updateTreatmentPlanStatus(id: string, isActive: boolean) {
  return request<TreatmentPlanData>(`/${encodeURIComponent(id)}/status`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ is_active: isActive }) });
}
export function deleteTreatmentPlan(id: string) {
  return request<void>(`/${encodeURIComponent(id)}`, { method: "DELETE" });
}

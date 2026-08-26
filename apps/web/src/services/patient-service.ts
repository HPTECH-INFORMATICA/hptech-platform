export type PatientData = {
  id: string;
  name: string;
  phone: string | null;
  whatsapp: string | null;
  email: string | null;
  document: string | null;
  birth_date: string | null;
  is_active: boolean;
  has_leads: boolean;
  created_at: string;
  updated_at: string;
};

export type PatientList = {
  items: PatientData[];
  total: number;
  page: number;
  page_size: number;
};

export type PatientInput = {
  name: string;
  phone: string | null;
  whatsapp: string | null;
  email: string | null;
  document: string | null;
  birth_date: string | null;
};

export class PatientApiError extends Error {
  constructor(public readonly status: number, message: string) {
    super(message);
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`/api/patients${path}`, {
    ...init,
    headers: { Accept: "application/json", ...init?.headers },
    cache: "no-store",
  });
  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as
      | { detail?: string; error?: string }
      | null;
    throw new PatientApiError(
      response.status,
      body?.detail ?? body?.error ?? "Não foi possível concluir a operação.",
    );
  }
  if (response.status === 204) return undefined as T;
  return response.json() as Promise<T>;
}

export function listPatients(params: URLSearchParams) {
  return request<PatientList>(`?${params.toString()}`);
}

export function getPatient(id: string) {
  return request<PatientData>(`/${encodeURIComponent(id)}`);
}

export function createPatient(data: PatientInput) {
  return request<PatientData>("", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
}

export function updatePatient(id: string, data: PatientInput) {
  return request<PatientData>(`/${encodeURIComponent(id)}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
}

export function updatePatientStatus(id: string, isActive: boolean) {
  return request<PatientData>(`/${encodeURIComponent(id)}/status`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ is_active: isActive }),
  });
}

export function deletePatient(id: string) {
  return request<void>(`/${encodeURIComponent(id)}`, { method: "DELETE" });
}

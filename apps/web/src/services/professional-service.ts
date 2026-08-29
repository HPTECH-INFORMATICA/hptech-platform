export type ProfessionalData = {
  id: string;
  display_name: string;
  user_id: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

export type ProfessionalList = {
  items: ProfessionalData[];
  total: number;
  page: number;
  page_size: number;
};

export type ProfessionalInput = {
  display_name: string;
  user_id: string | null;
};

export type ProfessionalUserCandidate = {
  id: string;
  name: string;
  email: string;
};

export type ProfessionalUserCandidateList = {
  items: ProfessionalUserCandidate[];
  total: number;
  page: number;
  page_size: number;
};

export class ProfessionalApiError extends Error {
  constructor(public readonly status: number, message: string) {
    super(message);
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`/api/professionals${path}`, {
    ...init,
    headers: { Accept: "application/json", ...init?.headers },
    cache: "no-store",
  });
  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as
      | { detail?: string; error?: string }
      | null;
    throw new ProfessionalApiError(
      response.status,
      body?.detail ?? body?.error ?? "NÃ£o foi possÃ­vel concluir a operaÃ§Ã£o.",
    );
  }
  if (response.status === 204) return undefined as T;
  return response.json() as Promise<T>;
}

export function listProfessionals(params: URLSearchParams) {
  return request<ProfessionalList>(`?${params.toString()}`);
}

export function listProfessionalUserCandidates(params: URLSearchParams) {
  return request<ProfessionalUserCandidateList>(
    `/link-candidates?${params.toString()}`,
  );
}

export function createProfessional(data: ProfessionalInput) {
  return request<ProfessionalData>("", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
}

export function updateProfessional(id: string, data: ProfessionalInput) {
  return request<ProfessionalData>(`/${encodeURIComponent(id)}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
}

export function updateProfessionalStatus(id: string, isActive: boolean) {
  return request<ProfessionalData>(`/${encodeURIComponent(id)}/status`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ is_active: isActive }),
  });
}

export function deleteProfessional(id: string) {
  return request<void>(`/${encodeURIComponent(id)}`, { method: "DELETE" });
}

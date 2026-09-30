export type ProfessionalData = {
  id: string;
  display_name: string;
  full_name: string;
  social_name: string | null;
  cpf: string | null;
  birth_date: string | null;
  email: string | null;
  phone: string | null;
  whatsapp: string | null;
  profession: string | null;
  category: string | null;
  administrative_notes: string | null;
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
  full_name: string;
  social_name: string | null;
  cpf: string | null;
  birth_date: string | null;
  email: string | null;
  phone: string | null;
  whatsapp: string | null;
  profession: string | null;
  category: string | null;
  administrative_notes: string | null;
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

export type WeeklyAvailabilityInterval = {
  weekday: number;
  start_time: string;
  end_time: string;
};

export type WeeklyAvailability = {
  professional_id: string;
  timezone: string;
  intervals: WeeklyAvailabilityInterval[];
};

export type AvailabilityExceptionKind = "AVAILABLE" | "UNAVAILABLE";

export type AvailabilityExceptionData = {
  id: string;
  professional_id: string;
  local_date: string;
  kind: AvailabilityExceptionKind;
  start_time: string | null;
  end_time: string | null;
  created_at: string;
  updated_at: string;
};

export type AvailabilityExceptionInput = {
  local_date: string;
  kind: AvailabilityExceptionKind;
  start_time: string | null;
  end_time: string | null;
};

export type AvailabilityExceptionList = {
  items: AvailabilityExceptionData[];
  total: number;
  page: number;
  page_size: number;
  timezone: string;
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

export function getProfessional(id: string) {
  return request<ProfessionalData>(`/${encodeURIComponent(id)}`);
}

export function getWeeklyAvailability(professionalId: string) {
  return request<WeeklyAvailability>(
    `/${encodeURIComponent(professionalId)}/availability/weekly`,
  );
}

export function replaceWeeklyAvailability(
  professionalId: string,
  intervals: WeeklyAvailabilityInterval[],
) {
  return request<WeeklyAvailability>(
    `/${encodeURIComponent(professionalId)}/availability/weekly`,
    {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ intervals }),
    },
  );
}

export function listAvailabilityExceptions(
  professionalId: string,
  params: URLSearchParams,
) {
  const query = params.toString();
  return request<AvailabilityExceptionList>(
    `/${encodeURIComponent(professionalId)}/availability/exceptions${query ? `?${query}` : ""}`,
  );
}

export function createAvailabilityException(
  professionalId: string,
  data: AvailabilityExceptionInput,
) {
  return request<AvailabilityExceptionData>(
    `/${encodeURIComponent(professionalId)}/availability/exceptions`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    },
  );
}

export function updateAvailabilityException(
  professionalId: string,
  exceptionId: string,
  data: AvailabilityExceptionInput,
) {
  return request<AvailabilityExceptionData>(
    `/${encodeURIComponent(professionalId)}/availability/exceptions/${encodeURIComponent(exceptionId)}`,
    {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    },
  );
}

export function deleteAvailabilityException(
  professionalId: string,
  exceptionId: string,
) {
  return request<void>(
    `/${encodeURIComponent(professionalId)}/availability/exceptions/${encodeURIComponent(exceptionId)}`,
    { method: "DELETE" },
  );
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

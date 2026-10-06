export type AppointmentStatus =
  | "SCHEDULED"
  | "CONFIRMED"
  | "IN_PROGRESS"
  | "COMPLETED"
  | "CANCELED"
  | "NO_SHOW";

export type AppointmentFinancialStatus =
  | "NO_CHARGE"
  | "NOT_GENERATED"
  | "PENDING"
  | "PAID"
  | "CANCELED";

export type AppointmentData = {
  id: string;
  patient_id: string;
  professional_id: string;
  service_id: string;
  patient_plan_contract_item_id: string | null;
  plan_contract_id: string | null;
  plan_name: string | null;
  plan_session_sequence: number | null;
  plan_sessions_total: number | null;
  plan_sessions_remaining: number | null;
  plan_paid_sessions_remaining: number | null;
  plan_complimentary_sessions_remaining: number | null;
  plan_session_bucket: "PAID" | "COURTESY" | null;
  lead_id: string | null;
  service_name_snapshot: string;
  service_duration_minutes_snapshot: number;
  service_price_snapshot: string;
  starts_at: string;
  ends_at: string;
  status: AppointmentStatus;
  financial_status: AppointmentFinancialStatus;
  financial_transaction_id: string | null;
  financial_paid_date: string | null;
  financial_payment_method: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
};

export type AppointmentCivilDateTime = {
  local_datetime: string;
  utc_offset_minutes: number | null;
};

export type AppointmentCreateInput = {
  patient_id: string;
  professional_id: string;
  service_id: string;
  patient_plan_contract_item_id?: string;
  lead_id: string | null;
  starts_at: AppointmentCivilDateTime;
  notes: string | null;
};

export type AppointmentUpdateInput = {
  patient_id?: string;
  professional_id?: string;
  service_id?: string;
  duration_minutes?: number;
  notes?: string | null;
};

export type AppointmentRescheduleInput = {
  starts_at: AppointmentCivilDateTime;
  duration_minutes?: number;
};

export type AppointmentAction =
  | "confirm"
  | "start"
  | "complete"
  | "cancel"
  | "no-show";

type AppointmentList = {
  items: AppointmentData[];
  total: number;
  page: number;
  page_size: number;
};

export class AppointmentApiError extends Error {
  readonly status: number;

  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

async function requestPage(params: URLSearchParams): Promise<AppointmentList> {
  const response = await fetch(`/api/appointments?${params.toString()}`, {
    headers: { Accept: "application/json" },
    cache: "no-store",
  });
  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as
      | { detail?: string; error?: string }
      | null;
    throw new AppointmentApiError(
      response.status,
      body?.detail ?? body?.error ?? "Não foi possível carregar a agenda.",
    );
  }
  return response.json() as Promise<AppointmentList>;
}

async function requestAppointment(
  path: string,
  init?: RequestInit,
): Promise<AppointmentData> {
  const response = await fetch(`/api/appointments${path}`, {
    ...init,
    headers: { Accept: "application/json", ...init?.headers },
    cache: "no-store",
  });
  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as
      | { detail?: string; error?: string }
      | null;
    throw new AppointmentApiError(
      response.status,
      body?.detail ?? body?.error ?? "Não foi possível concluir a operação.",
    );
  }
  return response.json() as Promise<AppointmentData>;
}

export async function listAppointments(
  windowStart: string,
  windowEnd: string,
): Promise<AppointmentData[]> {
  const pageSize = 100;
  const firstParams = new URLSearchParams({
    from: windowStart,
    to: windowEnd,
    page: "1",
    page_size: String(pageSize),
  });
  const first = await requestPage(firstParams);
  const totalPages = Math.ceil(first.total / pageSize);
  if (totalPages <= 1) return first.items;

  const remaining = await Promise.all(
    Array.from({ length: totalPages - 1 }, (_, index) => {
      const params = new URLSearchParams(firstParams);
      params.set("page", String(index + 2));
      return requestPage(params);
    }),
  );
  return [first, ...remaining].flatMap((result) => result.items);
}

export function createAppointment(data: AppointmentCreateInput) {
  return requestAppointment("", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
}

export function updateAppointment(id: string, data: AppointmentUpdateInput) {
  return requestAppointment(`/${encodeURIComponent(id)}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
}

export function rescheduleAppointment(
  id: string,
  data: AppointmentRescheduleInput,
) {
  return requestAppointment(`/${encodeURIComponent(id)}/reschedule`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
}

export function transitionAppointment(id: string, action: AppointmentAction) {
  return requestAppointment(
    `/${encodeURIComponent(id)}/${encodeURIComponent(action)}`,
    { method: "POST", headers: { "Content-Type": "application/json" }, body: "{}" },
  );
}

export async function deleteAppointment(id: string, reason: string): Promise<void> {
  const response = await fetch(`/api/appointments/${encodeURIComponent(id)}`, {
    method: "DELETE",
    headers: { Accept: "application/json", "Content-Type": "application/json" },
    body: JSON.stringify({ reason }),
  });
  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as
      | { detail?: string; error?: string }
      | null;
    throw new AppointmentApiError(
      response.status,
      body?.detail ?? body?.error ?? "Não foi possível remover o agendamento.",
    );
  }
}

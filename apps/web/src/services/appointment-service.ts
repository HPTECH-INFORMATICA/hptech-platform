export type AppointmentStatus =
  | "SCHEDULED"
  | "CONFIRMED"
  | "IN_PROGRESS"
  | "COMPLETED"
  | "CANCELED"
  | "NO_SHOW";

export type AppointmentData = {
  id: string;
  patient_id: string;
  professional_id: string;
  service_id: string;
  lead_id: string | null;
  service_name_snapshot: string;
  service_duration_minutes_snapshot: number;
  service_price_snapshot: string;
  starts_at: string;
  ends_at: string;
  status: AppointmentStatus;
  notes: string | null;
  created_at: string;
  updated_at: string;
};

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

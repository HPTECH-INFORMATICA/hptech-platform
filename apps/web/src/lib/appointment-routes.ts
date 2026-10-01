const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const APPOINTMENT_ACTIONS = new Set([
  "reschedule",
  "confirm",
  "start",
  "complete",
  "cancel",
  "no-show",
]);

export const appointmentListQueryKeys = new Set([
  "from",
  "to",
  "professional_id",
  "patient_id",
  "service_id",
  "status",
  "page",
  "page_size",
]);

export type AppointmentBackendTarget = {
  path: string;
  queryKeys: ReadonlySet<string> | null;
};

export function resolveAppointmentBackendTarget(
  path: string[] | undefined,
  method: string,
): AppointmentBackendTarget | null {
  if (!path?.length) {
    return ["GET", "POST"].includes(method)
      ? {
          path: "/appointments",
          queryKeys: method === "GET" ? appointmentListQueryKeys : null,
        }
      : null;
  }
  if (!UUID_PATTERN.test(path[0])) return null;
  const id = encodeURIComponent(path[0]);
  if (path.length === 1 && ["GET", "PATCH", "DELETE"].includes(method)) {
    return { path: `/appointments/${id}`, queryKeys: null };
  }
  if (
    path.length === 2 &&
    method === "POST" &&
    APPOINTMENT_ACTIONS.has(path[1])
  ) {
    return {
      path: `/appointments/${id}/${encodeURIComponent(path[1])}`,
      queryKeys: null,
    };
  }
  return null;
}

export function validateAppointmentQuery(
  searchParams: URLSearchParams,
  allowedKeys: ReadonlySet<string> | null,
): string | null {
  if (allowedKeys === null) {
    return searchParams.size === 0
      ? null
      : "Parâmetros não permitidos nesta rota.";
  }
  for (const key of searchParams.keys()) {
    if (!allowedKeys.has(key)) return `Parâmetro não permitido: ${key}.`;
  }
  for (const key of ["professional_id", "patient_id", "service_id"]) {
    const value = searchParams.get(key);
    if (value !== null && !UUID_PATTERN.test(value)) {
      return `${key} inválido.`;
    }
  }
  return null;
}

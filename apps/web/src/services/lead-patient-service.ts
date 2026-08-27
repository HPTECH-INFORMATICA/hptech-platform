export type LeadPatientSummary = {
  id: string;
  name: string;
  is_active: boolean;
};

export type LeadPatientLink = {
  linked: boolean;
  patient: LeadPatientSummary | null;
};

export class LeadPatientApiError extends Error {
  constructor(
    public readonly status: number,
    message: string,
  ) {
    super(message);
  }
}

async function request(
  leadId: string,
  path: string,
  method: "GET" | "POST" | "PUT" | "DELETE",
): Promise<LeadPatientLink | void> {
  const response = await fetch(
    `/api/leads/${encodeURIComponent(leadId)}/patient-link${path}`,
    {
      method,
      headers: {
        Accept: "application/json",
        ...(method === "POST" || method === "PUT"
          ? { "Content-Type": "application/json" }
          : {}),
      },
      body: method === "POST" || method === "PUT" ? "{}" : undefined,
      cache: "no-store",
    },
  );

  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as
      | { detail?: string; error?: string }
      | null;
    throw new LeadPatientApiError(
      response.status,
      body?.detail ?? body?.error ?? "Não foi possível concluir a operação.",
    );
  }
  if (response.status === 204) return;
  return response.json() as Promise<LeadPatientLink>;
}

export function getLeadPatientLink(leadId: string) {
  return request(leadId, "", "GET") as Promise<LeadPatientLink>;
}

export function createPatientFromLead(leadId: string) {
  return request(leadId, "", "POST") as Promise<LeadPatientLink>;
}

export function linkLeadToPatient(leadId: string, patientId: string) {
  return request(leadId, `/${encodeURIComponent(patientId)}`, "PUT") as Promise<LeadPatientLink>;
}

export function unlinkLeadFromPatient(leadId: string) {
  return request(leadId, "", "DELETE") as Promise<void>;
}

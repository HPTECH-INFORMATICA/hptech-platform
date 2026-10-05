export type PatientPlanContractItem = {
  id: string;
  service_id: string;
  service_name_snapshot: string;
  paid_sessions_snapshot: number;
  complimentary_sessions_snapshot: number;
  paid_available: number;
  complimentary_available: number;
};

export type PatientPlanContractData = {
  id: string;
  patient_id: string;
  treatment_plan_id: string;
  plan_name_snapshot: string;
  plan_description_snapshot: string | null;
  price_snapshot: string;
  validity_days_snapshot: number;
  starts_on: string;
  expires_on: string;
  payment_due_date: string;
  status: "ACTIVE" | "CANCELED" | "EXPIRED" | "COMPLETED";
  financial_transaction_id: string | null;
  financial_status: "PENDING" | "PAID" | "CANCELED" | "NO_CHARGE";
  items: PatientPlanContractItem[];
  contracted_at: string;
};

export type PatientPlanContractInput = {
  patient_id: string;
  treatment_plan_id: string;
  starts_on: string;
  payment_due_date: string;
  paid_date: string | null;
  payment_method: string | null;
};

export class PatientPlanContractApiError extends Error {
  constructor(public readonly status: number, message: string) { super(message); }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`/api/patient-plan-contracts${path}`, { ...init, headers: { Accept: "application/json", ...init?.headers }, cache: "no-store" });
  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as { detail?: string; error?: string } | null;
    throw new PatientPlanContractApiError(response.status, body?.detail ?? body?.error ?? "Não foi possível concluir a operação.");
  }
  return response.json() as Promise<T>;
}

export function listPatientPlanContracts(patientId: string) {
  return request<{ items: PatientPlanContractData[] }>(`?patient_id=${encodeURIComponent(patientId)}&page=1&page_size=100`);
}

export function createPatientPlanContract(data: PatientPlanContractInput) {
  return request<PatientPlanContractData>("", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) });
}

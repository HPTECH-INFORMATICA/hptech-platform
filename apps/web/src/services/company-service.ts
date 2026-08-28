export type CompanyData = {
  id: string;
  name: string;
  legal_name: string | null;
  document: string | null;
  email: string | null;
  phone: string | null;
  slug: string;
  status: string;
  timezone: string;
  created_at: string;
  updated_at: string;
};

export type CompanyUpdateInput = {
  name: string;
  legal_name: string | null;
  document: string | null;
  email: string | null;
  phone: string | null;
  timezone: string;
};

export class CompanyApiError extends Error {
  constructor(public readonly status: number, message: string) {
    super(message);
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function nullableString(value: unknown): value is string | null {
  return value === null || typeof value === "string";
}

function parseCompany(value: unknown): CompanyData | null {
  if (
    !isRecord(value) ||
    typeof value.id !== "string" ||
    typeof value.name !== "string" ||
    !nullableString(value.legal_name) ||
    !nullableString(value.document) ||
    !nullableString(value.email) ||
    !nullableString(value.phone) ||
    typeof value.slug !== "string" ||
    typeof value.status !== "string" ||
    typeof value.timezone !== "string" ||
    typeof value.created_at !== "string" ||
    typeof value.updated_at !== "string"
  ) {
    return null;
  }
  return value as CompanyData;
}

async function request(init?: RequestInit): Promise<CompanyData> {
  const response = await fetch("/api/company", {
    ...init,
    headers: { Accept: "application/json", ...init?.headers },
    cache: "no-store",
  });
  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as
      | { error?: string; detail?: string }
      | null;
    throw new CompanyApiError(
      response.status,
      body?.detail ?? body?.error ?? "Não foi possível concluir a operação.",
    );
  }
  const company = parseCompany(await response.json());
  if (!company) {
    throw new CompanyApiError(502, "Resposta de empresa inválida.");
  }
  return company;
}

export function getCompany() {
  return request();
}

export function updateCompany(data: CompanyUpdateInput) {
  return request({
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
}

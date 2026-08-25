export type AuditActor = {
  id: string;
  name: string;
  email: string;
  role: string;
};

export type AuditLogItem = {
  id: string;
  action: string;
  actor: AuditActor | null;
  target_type: string;
  target_id: string | null;
  metadata: Record<string, unknown>;
  occurred_at: string;
};

export type AuditLogList = {
  items: AuditLogItem[];
  total: number;
  page: number;
  page_size: number;
};

export class AuditLogApiError extends Error {
  constructor(public readonly status: number, message: string) { super(message); }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function parseActor(value: unknown): AuditActor | null | undefined {
  if (value === null) return null;
  if (!isRecord(value) || ![value.id, value.name, value.email, value.role].every((item) => typeof item === "string")) return undefined;
  return { id: value.id as string, name: value.name as string, email: value.email as string, role: value.role as string };
}

function parseItem(value: unknown): AuditLogItem | null {
  if (!isRecord(value)) return null;
  const actor = parseActor(value.actor);
  if (
    typeof value.id !== "string" || typeof value.action !== "string" ||
    typeof value.target_type !== "string" ||
    (value.target_id !== null && typeof value.target_id !== "string") ||
    !isRecord(value.metadata) || typeof value.occurred_at !== "string" ||
    actor === undefined
  ) return null;
  return {
    id: value.id, action: value.action, actor,
    target_type: value.target_type, target_id: value.target_id,
    metadata: value.metadata, occurred_at: value.occurred_at,
  };
}

function parseList(value: unknown): AuditLogList | null {
  if (!isRecord(value) || !Array.isArray(value.items)) return null;
  const items = value.items.map(parseItem);
  if (
    items.some((item) => item === null) ||
    ![value.total, value.page, value.page_size].every(Number.isSafeInteger)
  ) return null;
  return { items: items as AuditLogItem[], total: value.total as number, page: value.page as number, page_size: value.page_size as number };
}

export async function listAuditLogs(params: URLSearchParams): Promise<AuditLogList> {
  const response = await fetch(`/api/audit-logs?${params.toString()}`, {
    headers: { Accept: "application/json" }, cache: "no-store",
  });
  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as { detail?: string; error?: string } | null;
    throw new AuditLogApiError(response.status, body?.detail ?? body?.error ?? "Não foi possível consultar a auditoria.");
  }
  const result = parseList(await response.json().catch(() => null));
  if (!result) throw new AuditLogApiError(502, "Resposta de auditoria inválida.");
  return result;
}

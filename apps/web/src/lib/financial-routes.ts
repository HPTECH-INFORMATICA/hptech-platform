const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const FINANCIAL_ACTIONS = new Set(["pay", "cancel"]);

export const financialListQueryKeys = new Set([
  "due_from",
  "due_to",
  "type",
  "status",
  "page",
  "page_size",
]);

export const financialSummaryQueryKeys = new Set(["due_from", "due_to"]);

export type FinancialBackendTarget = {
  path: string;
  queryKeys: ReadonlySet<string> | null;
};

export function resolveFinancialBackendTarget(
  path: string[] | undefined,
  method: string,
): FinancialBackendTarget | null {
  if (!path?.length) {
    return ["GET", "POST"].includes(method)
      ? {
          path: "/financial/transactions",
          queryKeys: method === "GET" ? financialListQueryKeys : null,
        }
      : null;
  }

  if (!UUID_PATTERN.test(path[0])) return null;
  const id = encodeURIComponent(path[0]);

  if (path.length === 1 && ["GET", "PATCH", "DELETE"].includes(method)) {
    return { path: `/financial/transactions/${id}`, queryKeys: null };
  }

  if (
    path.length === 2 &&
    method === "POST" &&
    FINANCIAL_ACTIONS.has(path[1])
  ) {
    return {
      path: `/financial/transactions/${id}/${encodeURIComponent(path[1])}`,
      queryKeys: null,
    };
  }

  return null;
}

export function validateFinancialQuery(
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

  const type = searchParams.get("type");
  if (type !== null && !["INCOME", "EXPENSE"].includes(type)) {
    return "Tipo de lançamento inválido.";
  }

  const status = searchParams.get("status");
  if (status !== null && !["PENDING", "PAID", "CANCELED"].includes(status)) {
    return "Status de lançamento inválido.";
  }

  for (const key of ["page", "page_size"]) {
    const value = searchParams.get(key);
    if (value !== null && (!/^\d+$/.test(value) || Number(value) < 1)) {
      return `${key} inválido.`;
    }
  }

  return null;
}

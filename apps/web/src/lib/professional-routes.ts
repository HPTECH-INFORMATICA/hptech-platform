const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export const professionalListQueryKeys = new Set([
  "page",
  "page_size",
  "search",
  "is_active",
]);

export const professionalCandidateQueryKeys = new Set([
  "page",
  "page_size",
  "search",
  "professional_id",
]);

export type ProfessionalBackendTarget = {
  path: string;
  queryKeys: ReadonlySet<string> | null;
};

export function resolveProfessionalBackendTarget(
  path: string[] | undefined,
  method: string,
): ProfessionalBackendTarget | null {
  if (!path?.length) {
    return ["GET", "POST"].includes(method)
      ? {
          path: "/professionals",
          queryKeys: method === "GET" ? professionalListQueryKeys : null,
        }
      : null;
  }
  if (path.length === 1 && path[0] === "link-candidates" && method === "GET") {
    return {
      path: "/professionals/link-candidates",
      queryKeys: professionalCandidateQueryKeys,
    };
  }
  if (!UUID_PATTERN.test(path[0])) return null;
  const id = encodeURIComponent(path[0]);
  if (path.length === 1 && ["GET", "PATCH", "DELETE"].includes(method)) {
    return { path: `/professionals/${id}`, queryKeys: null };
  }
  if (path.length === 2 && path[1] === "status" && method === "PATCH") {
    return { path: `/professionals/${id}/status`, queryKeys: null };
  }
  return null;
}

export function validateProfessionalQuery(
  searchParams: URLSearchParams,
  allowedKeys: ReadonlySet<string> | null,
): string | null {
  if (allowedKeys === null) {
    return searchParams.size === 0
      ? null
      : "ParÃ¢metros nÃ£o permitidos nesta rota.";
  }
  for (const key of searchParams.keys()) {
    if (!allowedKeys.has(key)) return `ParÃ¢metro nÃ£o permitido: ${key}.`;
  }
  const professionalId = searchParams.get("professional_id");
  if (professionalId !== null && !UUID_PATTERN.test(professionalId)) {
    return "professional_id invÃ¡lido.";
  }
  return null;
}

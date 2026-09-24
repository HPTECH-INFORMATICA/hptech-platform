const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const LANDING_PAGE_ACTIONS = new Set(["publish", "unpublish", "archive"]);

export const landingPageListQueryKeys = new Set([
  "status",
  "page",
  "page_size",
]);

export type LandingPageBackendTarget = {
  path: string;
  queryKeys: ReadonlySet<string> | null;
};

export function resolveLandingPageBackendTarget(
  path: string[] | undefined,
  method: string,
): LandingPageBackendTarget | null {
  if (!path?.length) {
    return ["GET", "POST"].includes(method)
      ? {
          path: "/landing-pages",
          queryKeys: method === "GET" ? landingPageListQueryKeys : null,
        }
      : null;
  }

  if (!UUID_PATTERN.test(path[0])) return null;
  const id = encodeURIComponent(path[0]);

  if (path.length === 1 && ["GET", "PATCH", "DELETE"].includes(method)) {
    return { path: `/landing-pages/${id}`, queryKeys: null };
  }

  if (
    path.length === 2 &&
    method === "POST" &&
    LANDING_PAGE_ACTIONS.has(path[1])
  ) {
    return {
      path: `/landing-pages/${id}/${encodeURIComponent(path[1])}`,
      queryKeys: null,
    };
  }

  return null;
}

export function validateLandingPageQuery(
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

  const status = searchParams.get("status");
  if (
    status !== null &&
    !["DRAFT", "PUBLISHED", "ARCHIVED"].includes(status)
  ) {
    return "Status de landing page inválido.";
  }

  for (const key of ["page", "page_size"]) {
    const value = searchParams.get(key);
    if (value !== null && (!/^\d+$/.test(value) || Number(value) < 1)) {
      return `${key} inválido.`;
    }
  }

  return null;
}

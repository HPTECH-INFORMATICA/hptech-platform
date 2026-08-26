import { NextResponse } from "next/server";

import { isSameOriginMutation } from "@/auth/request";
import {
  authenticatedBackendFetch,
  MissingSessionError,
} from "@/server/authenticated-backend";

type RouteContext = { params: Promise<{ path?: string[] }> };

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const LIST_QUERY_KEYS = new Set(["page", "page_size", "search", "is_active"]);

function resolveBackendPath(path: string[] | undefined, method: string) {
  if (!path?.length) {
    return ["GET", "POST"].includes(method) ? "/patients" : null;
  }
  if (!UUID_PATTERN.test(path[0])) return null;
  if (path.length === 1 && ["GET", "PATCH", "DELETE"].includes(method)) {
    return `/patients/${encodeURIComponent(path[0])}`;
  }
  if (path.length === 2 && path[1] === "status" && method === "PATCH") {
    return `/patients/${encodeURIComponent(path[0])}/status`;
  }
  return null;
}

function privateJson(body: object, status: number) {
  return NextResponse.json(body, {
    status,
    headers: { "Cache-Control": "private, no-store" },
  });
}

function proxyResponse(response: Response) {
  return new NextResponse(response.body, {
    status: response.status,
    headers: {
      "Cache-Control": "private, no-store",
      "Content-Type": response.headers.get("content-type") ?? "application/json",
    },
  });
}

function proxyError(error: unknown) {
  if (error instanceof MissingSessionError) {
    return privateJson({ error: "Sessão inválida." }, 401);
  }
  return privateJson({ error: "Não foi possível acessar os pacientes." }, 502);
}

async function handle(request: Request, context: RouteContext) {
  const method = request.method;
  if (method !== "GET" && !isSameOriginMutation(request)) {
    return privateJson({ error: "Origem não permitida." }, 403);
  }

  const backendPath = resolveBackendPath((await context.params).path, method);
  if (!backendPath) return privateJson({ error: "Caminho inválido." }, 400);

  const url = new URL(request.url);
  const query = new URLSearchParams();
  if (backendPath === "/patients" && method === "GET") {
    for (const [key, value] of url.searchParams) {
      if (!LIST_QUERY_KEYS.has(key)) {
        return privateJson({ error: `Parâmetro não permitido: ${key}.` }, 400);
      }
      query.append(key, value);
    }
  } else if (url.searchParams.size > 0) {
    return privateJson({ error: "Parâmetros não permitidos nesta rota." }, 400);
  }

  try {
    const hasBody = ["POST", "PATCH"].includes(method);
    const response = await authenticatedBackendFetch(
      `${backendPath}${query.size ? `?${query.toString()}` : ""}`,
      {
        method,
        headers: hasBody ? { "Content-Type": "application/json" } : undefined,
        body: hasBody ? await request.text() : undefined,
      },
    );
    return proxyResponse(response);
  } catch (error) {
    return proxyError(error);
  }
}

export const GET = handle;
export const POST = handle;
export const PATCH = handle;
export const DELETE = handle;

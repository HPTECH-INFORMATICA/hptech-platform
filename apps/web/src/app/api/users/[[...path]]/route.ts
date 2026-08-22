import { NextResponse } from "next/server";

import { isSameOriginMutation } from "@/auth/request";
import {
  authenticatedBackendFetch,
  MissingSessionError,
} from "@/server/authenticated-backend";

type RouteContext = { params: Promise<{ path?: string[] }> };

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const LIST_QUERY_KEYS = new Set([
  "page",
  "page_size",
  "search",
  "role",
  "is_active",
]);

function resolveBackendPath(path: string[] | undefined): string | null {
  if (!path?.length) return "/users";
  if (!UUID_PATTERN.test(path[0]) || path.length > 2) return null;
  if (path.length === 2 && !["role", "status"].includes(path[1])) return null;
  return `/users/${path.map(encodeURIComponent).join("/")}`;
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
    return NextResponse.json(
      { error: "Sessão inválida." },
      { status: 401, headers: { "Cache-Control": "private, no-store" } },
    );
  }
  return NextResponse.json(
    { error: "Não foi possível acessar a gestão de usuários." },
    { status: 502, headers: { "Cache-Control": "private, no-store" } },
  );
}

export async function GET(request: Request, context: RouteContext) {
  const backendPath = resolveBackendPath((await context.params).path);
  if (!backendPath) {
    return NextResponse.json({ error: "Caminho inválido." }, { status: 400 });
  }

  const url = new URL(request.url);
  const query = new URLSearchParams();
  if (backendPath === "/users") {
    url.searchParams.forEach((value, key) => {
      if (LIST_QUERY_KEYS.has(key)) query.append(key, value);
    });
  }

  try {
    const response = await authenticatedBackendFetch(
      `${backendPath}${query.size ? `?${query.toString()}` : ""}`,
      { method: "GET" },
    );
    return proxyResponse(response);
  } catch (error) {
    return proxyError(error);
  }
}

async function mutate(request: Request, context: RouteContext) {
  if (!isSameOriginMutation(request)) {
    return NextResponse.json(
      { error: "Origem não permitida." },
      { status: 403, headers: { "Cache-Control": "private, no-store" } },
    );
  }
  const backendPath = resolveBackendPath((await context.params).path);
  if (!backendPath || backendPath === "/users") {
    return NextResponse.json({ error: "Caminho inválido." }, { status: 400 });
  }
  try {
    const response = await authenticatedBackendFetch(backendPath, {
      method: request.method,
      headers:
        request.method === "PATCH" ? { "Content-Type": "application/json" } : undefined,
      body: request.method === "PATCH" ? await request.text() : undefined,
    });
    return proxyResponse(response);
  } catch (error) {
    return proxyError(error);
  }
}

export const PATCH = mutate;
export const DELETE = mutate;

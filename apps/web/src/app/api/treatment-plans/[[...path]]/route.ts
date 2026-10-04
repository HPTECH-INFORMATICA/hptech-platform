import { NextResponse } from "next/server";

import { isSameOriginMutation } from "@/auth/request";
import { authenticatedBackendFetch, MissingSessionError } from "@/server/authenticated-backend";

type RouteContext = { params: Promise<{ path?: string[] }> };
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function target(path: string[] | undefined, method: string) {
  if (!path?.length) return ["GET", "POST"].includes(method) ? "/treatment-plans" : null;
  if (!UUID.test(path[0])) return null;
  if (path.length === 1 && ["PUT", "DELETE"].includes(method)) return `/treatment-plans/${path[0]}`;
  if (path.length === 2 && path[1] === "status" && method === "PATCH") return `/treatment-plans/${path[0]}/status`;
  return null;
}

async function handle(request: Request, context: RouteContext) {
  if (request.method !== "GET" && !isSameOriginMutation(request)) return NextResponse.json({ error: "Origem não permitida." }, { status: 403 });
  const path = target((await context.params).path, request.method);
  if (!path) return NextResponse.json({ error: "Caminho inválido." }, { status: 400 });
  const query = request.method === "GET" ? new URL(request.url).search : "";
  try {
    const response = await authenticatedBackendFetch(`${path}${query}`, {
      method: request.method,
      headers: ["POST", "PUT", "PATCH"].includes(request.method) ? { "Content-Type": "application/json" } : undefined,
      body: ["POST", "PUT", "PATCH"].includes(request.method) ? await request.text() : undefined,
    });
    return new NextResponse(response.body, { status: response.status, headers: { "Cache-Control": "private, no-store", "Content-Type": response.headers.get("content-type") ?? "application/json" } });
  } catch (error) {
    return NextResponse.json({ error: error instanceof MissingSessionError ? "Sessão inválida." : "Não foi possível acessar os planos." }, { status: error instanceof MissingSessionError ? 401 : 502 });
  }
}

export const GET = handle;
export const POST = handle;
export const PUT = handle;
export const PATCH = handle;
export const DELETE = handle;

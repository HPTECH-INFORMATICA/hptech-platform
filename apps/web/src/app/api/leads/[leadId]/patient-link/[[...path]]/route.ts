import { NextResponse } from "next/server";

import { isSameOriginMutation } from "@/auth/request";
import {
  authenticatedBackendFetch,
  MissingSessionError,
} from "@/server/authenticated-backend";

type RouteContext = {
  params: Promise<{ leadId: string; path?: string[] }>;
};

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

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

function resolveBackendPath(
  leadId: string,
  path: string[] | undefined,
  method: string,
) {
  if (!UUID_PATTERN.test(leadId)) return null;
  if (!path?.length && ["GET", "POST", "DELETE"].includes(method)) {
    return `/leads/${encodeURIComponent(leadId)}/patient-link`;
  }
  if (
    path?.length === 1 &&
    method === "PUT" &&
    UUID_PATTERN.test(path[0])
  ) {
    return `/leads/${encodeURIComponent(leadId)}/patient-link/${encodeURIComponent(path[0])}`;
  }
  return null;
}

async function handle(request: Request, context: RouteContext) {
  if (request.method !== "GET" && !isSameOriginMutation(request)) {
    return privateJson({ error: "Origem não permitida." }, 403);
  }

  const { leadId, path } = await context.params;
  const backendPath = resolveBackendPath(leadId, path, request.method);
  if (!backendPath || new URL(request.url).searchParams.size > 0) {
    return privateJson({ error: "Caminho não permitido." }, 400);
  }

  try {
    const hasJsonBody = request.method === "POST" || request.method === "PUT";
    const response = await authenticatedBackendFetch(backendPath, {
      method: request.method,
      headers: hasJsonBody ? { "Content-Type": "application/json" } : undefined,
      body: hasJsonBody ? "{}" : undefined,
    });
    return proxyResponse(response);
  } catch (error) {
    if (error instanceof MissingSessionError) {
      return privateJson({ error: "Sessão inválida." }, 401);
    }
    return privateJson(
      { error: "Não foi possível acessar o vínculo do paciente." },
      502,
    );
  }
}

export const GET = handle;
export const POST = handle;
export const PUT = handle;
export const DELETE = handle;

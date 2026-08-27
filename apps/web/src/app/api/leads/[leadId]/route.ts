import { NextResponse } from "next/server";

import { isSameOriginMutation } from "@/auth/request";
import {
  authenticatedBackendFetch,
  MissingSessionError,
} from "@/server/authenticated-backend";

type RouteContext = { params: Promise<{ leadId: string }> };

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

async function handle(request: Request, context: RouteContext) {
  if (!isSameOriginMutation(request)) {
    return privateJson({ error: "Origem não permitida." }, 403);
  }
  if (new URL(request.url).searchParams.size > 0) {
    return privateJson({ error: "Parâmetros não permitidos nesta rota." }, 400);
  }

  const { leadId } = await context.params;
  if (!UUID_PATTERN.test(leadId)) {
    return privateJson({ error: "Identificador inválido." }, 400);
  }

  try {
    const response = await authenticatedBackendFetch(
      `/leads/${encodeURIComponent(leadId)}`,
      {
        method: request.method,
        headers:
          request.method === "PATCH"
            ? { "Content-Type": "application/json" }
            : undefined,
        body: request.method === "PATCH" ? await request.text() : undefined,
      },
    );
    return proxyResponse(response);
  } catch (error) {
    if (error instanceof MissingSessionError) {
      return privateJson({ error: "Sessão inválida." }, 401);
    }
    return privateJson({ error: "Não foi possível acessar o lead." }, 502);
  }
}

export const PATCH = handle;
export const DELETE = handle;

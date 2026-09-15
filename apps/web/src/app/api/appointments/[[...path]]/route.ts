import { NextResponse } from "next/server";

import { isSameOriginMutation } from "@/auth/request";
import {
  resolveAppointmentBackendTarget,
  validateAppointmentQuery,
} from "@/lib/appointment-routes";
import {
  authenticatedBackendFetch,
  MissingSessionError,
} from "@/server/authenticated-backend";

type RouteContext = { params: Promise<{ path?: string[] }> };

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
  return privateJson({ error: "Não foi possível acessar os agendamentos." }, 502);
}

async function handle(request: Request, context: RouteContext) {
  const method = request.method;
  if (method !== "GET" && !isSameOriginMutation(request)) {
    return privateJson({ error: "Origem não permitida." }, 403);
  }

  const target = resolveAppointmentBackendTarget(
    (await context.params).path,
    method,
  );
  if (!target) return privateJson({ error: "Caminho inválido." }, 400);

  const url = new URL(request.url);
  const queryError = validateAppointmentQuery(
    url.searchParams,
    target.queryKeys,
  );
  if (queryError) return privateJson({ error: queryError }, 400);

  try {
    const hasBody = method === "POST" || method === "PATCH";
    const query = url.searchParams.toString();
    const response = await authenticatedBackendFetch(
      `${target.path}${query ? `?${query}` : ""}`,
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

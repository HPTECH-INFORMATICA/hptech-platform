import { NextResponse } from "next/server";

import { isSameOriginMutation } from "@/auth/request";
import {
  resolveProfessionalBackendTarget,
  validateProfessionalQuery,
} from "@/lib/professional-routes";
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
    return privateJson({ error: "SessÃ£o invÃ¡lida." }, 401);
  }
  return privateJson({ error: "NÃ£o foi possÃ­vel acessar os profissionais." }, 502);
}

async function handle(request: Request, context: RouteContext) {
  const method = request.method;
  if (method !== "GET" && !isSameOriginMutation(request)) {
    return privateJson({ error: "Origem nÃ£o permitida." }, 403);
  }

  const target = resolveProfessionalBackendTarget(
    (await context.params).path,
    method,
  );
  if (!target) return privateJson({ error: "Caminho invÃ¡lido." }, 400);

  const url = new URL(request.url);
  const queryError = validateProfessionalQuery(url.searchParams, target.queryKeys);
  if (queryError) return privateJson({ error: queryError }, 400);

  try {
    const hasBody = ["POST", "PATCH"].includes(method);
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
export const DELETE = handle;

import { NextResponse } from "next/server";

import { isSameOriginMutation } from "@/auth/request";
import { publicLandingPageSubmissionBackendPath } from "@/lib/public-landing-page-routes";
import { publicBackendFetch } from "@/server/public-backend";

type RouteContext = {
  params: Promise<{ companySlug: string; landingPageSlug: string }>;
};

function publicJson(body: object, status: number, headers?: HeadersInit) {
  return NextResponse.json(body, {
    status,
    headers: { "Cache-Control": "no-store", ...headers },
  });
}

export async function POST(request: Request, context: RouteContext) {
  if (!isSameOriginMutation(request)) {
    return publicJson({ error: "Origem não permitida." }, 403);
  }

  const { companySlug, landingPageSlug } = await context.params;
  const path = publicLandingPageSubmissionBackendPath(
    companySlug,
    landingPageSlug,
  );
  if (!path) return publicJson({ error: "Caminho inválido." }, 400);

  const contentType = request.headers.get("content-type") ?? "";
  if (!contentType.toLowerCase().startsWith("application/json")) {
    return publicJson({ error: "Conteúdo inválido." }, 415);
  }
  const contentLength = Number(request.headers.get("content-length") ?? "0");
  if (!Number.isFinite(contentLength) || contentLength > 16_384) {
    return publicJson({ error: "Conteúdo muito grande." }, 413);
  }

  try {
    const response = await publicBackendFetch(path, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: await request.text(),
      cache: "no-store",
    });
    const headers = new Headers({
      "Cache-Control": "no-store",
      "Content-Type":
        response.headers.get("content-type") ?? "application/json",
    });
    const retryAfter = response.headers.get("retry-after");
    if (retryAfter) headers.set("Retry-After", retryAfter);
    return new NextResponse(response.body, {
      status: response.status,
      headers,
    });
  } catch {
    return publicJson(
      { error: "Não foi possível enviar seus dados agora." },
      502,
    );
  }
}

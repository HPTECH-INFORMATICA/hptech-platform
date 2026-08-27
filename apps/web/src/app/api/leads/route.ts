import { NextResponse } from "next/server";

import { isSameOriginMutation } from "@/auth/request";
import {
  authenticatedBackendFetch,
  MissingSessionError,
} from "@/server/authenticated-backend";

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

export async function POST(request: Request) {
  if (!isSameOriginMutation(request)) {
    return privateJson({ error: "Origem não permitida." }, 403);
  }
  if (new URL(request.url).searchParams.size > 0) {
    return privateJson({ error: "Parâmetros não permitidos nesta rota." }, 400);
  }

  try {
    const response = await authenticatedBackendFetch("/leads", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: await request.text(),
    });
    return proxyResponse(response);
  } catch (error) {
    if (error instanceof MissingSessionError) {
      return privateJson({ error: "Sessão inválida." }, 401);
    }
    return privateJson({ error: "Não foi possível acessar os leads." }, 502);
  }
}

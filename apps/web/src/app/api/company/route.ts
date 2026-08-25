import { NextResponse } from "next/server";

import { isSameOriginMutation } from "@/auth/request";
import {
  authenticatedBackendFetch,
  MissingSessionError,
} from "@/server/authenticated-backend";

const noStoreHeaders = { "Cache-Control": "private, no-store" };

async function proxy(method: "GET" | "PATCH", request?: Request) {
  try {
    const response = await authenticatedBackendFetch("/company", {
      method,
      headers: method === "PATCH" ? { "Content-Type": "application/json" } : undefined,
      body: request ? await request.text() : undefined,
    });
    return new NextResponse(response.body, {
      status: response.status,
      headers: {
        ...noStoreHeaders,
        "Content-Type": response.headers.get("content-type") ?? "application/json",
      },
    });
  } catch (error) {
    if (error instanceof MissingSessionError) {
      return NextResponse.json(
        { error: "Sessão inválida." },
        { status: 401, headers: noStoreHeaders },
      );
    }
    return NextResponse.json(
      { error: "Não foi possível acessar os dados da empresa." },
      { status: 502, headers: noStoreHeaders },
    );
  }
}

export function GET() {
  return proxy("GET");
}

export function PATCH(request: Request) {
  if (!isSameOriginMutation(request)) {
    return NextResponse.json(
      { error: "Origem não permitida." },
      { status: 403, headers: noStoreHeaders },
    );
  }
  return proxy("PATCH", request);
}

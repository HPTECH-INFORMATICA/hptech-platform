import { NextResponse } from "next/server";

import { isSameOriginMutation } from "@/auth/request";
import { authenticatedBackendFetch, MissingSessionError } from "@/server/authenticated-backend";

async function handle(request: Request) {
  if (request.method === "POST" && !isSameOriginMutation(request)) return NextResponse.json({ error: "Origem não permitida." }, { status: 403 });
  try {
    const query = request.method === "GET" ? new URL(request.url).search : "";
    const response = await authenticatedBackendFetch(`/patient-plan-contracts${query}`, {
      method: request.method,
      headers: request.method === "POST" ? { "Content-Type": "application/json" } : undefined,
      body: request.method === "POST" ? await request.text() : undefined,
    });
    return new NextResponse(response.body, { status: response.status, headers: { "Cache-Control": "private, no-store", "Content-Type": response.headers.get("content-type") ?? "application/json" } });
  } catch (error) {
    return NextResponse.json({ error: error instanceof MissingSessionError ? "Sessão inválida." : "Não foi possível acessar as contratações." }, { status: error instanceof MissingSessionError ? 401 : 502 });
  }
}

export const GET = handle;
export const POST = handle;

import { NextResponse } from "next/server";

import { expiredSessionCookie } from "@/auth/cookie";
import { isSameOriginMutation } from "@/auth/request";
import { authenticatedBackendFetch, MissingSessionError } from "@/server/authenticated-backend";

export async function POST(request: Request) {
  if (!isSameOriginMutation(request)) return NextResponse.json({ error: "Origem não permitida." }, { status: 403 });
  try {
    const backend = await authenticatedBackendFetch("/auth/change-password", {
      method: "POST", headers: { "Content-Type": "application/json" }, body: await request.text(),
    });
    const response = new NextResponse(backend.body, { status: backend.status, headers: { "Cache-Control": "private, no-store", "Content-Type": backend.headers.get("content-type") ?? "application/json" } });
    if (backend.ok) response.cookies.set(expiredSessionCookie());
    return response;
  } catch (error) {
    return NextResponse.json({ error: error instanceof MissingSessionError ? "Sessão inválida." : "Serviço indisponível." }, { status: error instanceof MissingSessionError ? 401 : 502 });
  }
}

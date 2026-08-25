import { NextResponse } from "next/server";

import { isSameOriginMutation } from "@/auth/request";
import { authenticatedBackendFetch, MissingSessionError } from "@/server/authenticated-backend";

const roles = new Set(["OWNER", "ADMIN", "MANAGER", "PROFESSIONAL", "RECEPTIONIST", "SALES", "FINANCIAL", "VIEWER"]);
const headers = { "Cache-Control": "private, no-store" };
type Context = { params: Promise<{ role: string }> };

export async function PUT(request: Request, context: Context) {
  if (!isSameOriginMutation(request)) return NextResponse.json({ error: "Origem não permitida." }, { status: 403, headers });
  const { role } = await context.params;
  if (!roles.has(role)) return NextResponse.json({ error: "Papel inválido." }, { status: 404, headers });
  try {
    const response = await authenticatedBackendFetch(`/access-control/roles/${encodeURIComponent(role)}`, {
      method: "PUT", headers: { "Content-Type": "application/json" }, body: await request.text(),
    });
    return new NextResponse(response.body, { status: response.status, headers: { ...headers, "Content-Type": response.headers.get("content-type") ?? "application/json" } });
  } catch (error) {
    if (error instanceof MissingSessionError) return NextResponse.json({ error: "Sessão inválida." }, { status: 401, headers });
    return NextResponse.json({ error: "Não foi possível atualizar os acessos." }, { status: 502, headers });
  }
}

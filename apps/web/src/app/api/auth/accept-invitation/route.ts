import { NextResponse } from "next/server";

import { isSameOriginMutation } from "@/auth/request";

function apiUrl() {
  const value = process.env.API_URL;
  if (!value) throw new Error("API_URL não configurada.");
  return value.replace(/\/$/, "");
}

export async function POST(request: Request) {
  if (!isSameOriginMutation(request)) {
    return NextResponse.json({ error: "Origem não permitida." }, { status: 403 });
  }
  const body: unknown = await request.json().catch(() => null);
  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "Dados inválidos." }, { status: 400 });
  }
  const { token, password } = body as Record<string, unknown>;
  if (typeof token !== "string" || !token || typeof password !== "string" || !password) {
    return NextResponse.json({ error: "Dados inválidos." }, { status: 400 });
  }
  try {
    const response = await fetch(`${apiUrl()}/auth/accept-invitation`, {
      method: "POST",
      headers: { Accept: "application/json", "Content-Type": "application/json" },
      body: JSON.stringify({ token, password }),
      cache: "no-store",
    });
    return new NextResponse(response.body, {
      status: response.status,
      headers: {
        "Cache-Control": "private, no-store",
        "Content-Type": response.headers.get("content-type") ?? "application/json",
      },
    });
  } catch {
    return NextResponse.json(
      { error: "Não foi possível aceitar o convite agora." },
      { status: 502, headers: { "Cache-Control": "private, no-store" } },
    );
  }
}

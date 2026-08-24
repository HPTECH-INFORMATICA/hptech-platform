import { NextResponse } from "next/server";

import { isSameOriginMutation } from "@/auth/request";

export async function POST(request: Request) {
  if (!isSameOriginMutation(request)) return NextResponse.json({ error: "Origem não permitida." }, { status: 403 });
  const body: unknown = await request.json().catch(() => null);
  const email = body && typeof body === "object" ? (body as Record<string, unknown>).email : null;
  if (typeof email !== "string" || !email.trim()) return NextResponse.json({ error: "Dados inválidos." }, { status: 400 });
  const apiUrl = process.env.API_URL;
  if (!apiUrl) return NextResponse.json({ error: "Serviço indisponível." }, { status: 503 });
  try {
    const response = await fetch(`${apiUrl.replace(/\/$/, "")}/auth/forgot-password`, {
      method: "POST", headers: { Accept: "application/json", "Content-Type": "application/json" },
      body: JSON.stringify({ email: email.trim() }), cache: "no-store",
    });
    return new NextResponse(response.body, { status: response.status, headers: { "Cache-Control": "private, no-store", "Content-Type": response.headers.get("content-type") ?? "application/json" } });
  } catch {
    return NextResponse.json({ error: "Serviço indisponível." }, { status: 502 });
  }
}

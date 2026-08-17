import { NextResponse } from "next/server";

import {
  authenticate,
  AuthenticationError,
  AuthenticationServiceError,
} from "@/auth/backend";
import { sessionCookie } from "@/auth/cookie";
import { isSameOriginMutation } from "@/auth/request";

type LoginPayload = {
  email: string;
  password: string;
};

function parseLoginPayload(value: unknown): LoginPayload | null {
  if (typeof value !== "object" || value === null) {
    return null;
  }

  const { email, password } = value as Record<string, unknown>;

  if (
    typeof email !== "string" ||
    !email.trim() ||
    typeof password !== "string" ||
    !password
  ) {
    return null;
  }

  return { email: email.trim(), password };
}

export async function POST(request: Request) {
  if (!isSameOriginMutation(request)) {
    return NextResponse.json(
      { error: "Origem não permitida." },
      { status: 403, headers: { "Cache-Control": "private, no-store" } },
    );
  }

  const payload = parseLoginPayload(await request.json().catch(() => null));

  if (!payload) {
    return NextResponse.json(
      { error: "Dados de acesso inválidos." },
      { status: 400, headers: { "Cache-Control": "private, no-store" } },
    );
  }

  try {
    const result = await authenticate(payload.email, payload.password);
    const response = NextResponse.json(
      { ok: true },
      { headers: { "Cache-Control": "private, no-store" } },
    );
    response.cookies.set(sessionCookie(result.accessToken, result.expiresIn));
    return response;
  } catch (error) {
    if (error instanceof AuthenticationError) {
      return NextResponse.json(
        { error: "Email ou senha inválidos." },
        { status: 401, headers: { "Cache-Control": "private, no-store" } },
      );
    }

    if (error instanceof AuthenticationServiceError) {
      return NextResponse.json(
        { error: "Não foi possível entrar agora. Tente novamente." },
        { status: 503, headers: { "Cache-Control": "private, no-store" } },
      );
    }

    return NextResponse.json(
      { error: "Não foi possível entrar agora. Tente novamente." },
      { status: 500, headers: { "Cache-Control": "private, no-store" } },
    );
  }
}

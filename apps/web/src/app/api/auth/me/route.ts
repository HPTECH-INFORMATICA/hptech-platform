import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { AuthenticationServiceError, fetchCurrentUser } from "@/auth/backend";
import {
  expiredSessionCookie,
  SESSION_COOKIE_NAME,
} from "@/auth/cookie";

export async function GET() {
  const cookieStore = await cookies();
  const accessToken = cookieStore.get(SESSION_COOKIE_NAME)?.value;

  if (!accessToken) {
    return NextResponse.json(
      { authenticated: false },
      { status: 401, headers: { "Cache-Control": "private, no-store" } },
    );
  }

  try {
    const user = await fetchCurrentUser(accessToken);

    if (!user) {
      const response = NextResponse.json(
        { authenticated: false },
        { status: 401, headers: { "Cache-Control": "private, no-store" } },
      );
      response.cookies.set(expiredSessionCookie());
      return response;
    }

    return NextResponse.json(user, {
      headers: { "Cache-Control": "private, no-store" },
    });
  } catch (error) {
    if (error instanceof AuthenticationServiceError) {
      return NextResponse.json(
        { error: "Serviço de autenticação indisponível." },
        { status: 503, headers: { "Cache-Control": "private, no-store" } },
      );
    }

    return NextResponse.json(
      { error: "Não foi possível validar a sessão." },
      { status: 500, headers: { "Cache-Control": "private, no-store" } },
    );
  }
}

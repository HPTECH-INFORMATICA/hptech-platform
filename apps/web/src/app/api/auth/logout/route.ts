import { NextResponse } from "next/server";

import { expiredSessionCookie } from "@/auth/cookie";
import { isSameOriginMutation } from "@/auth/request";

export async function POST(request: Request) {
  if (!isSameOriginMutation(request)) {
    return NextResponse.json({ error: "Origem não permitida." }, { status: 403 });
  }

  const response = NextResponse.json({ ok: true });
  response.cookies.set(expiredSessionCookie());
  return response;
}

import { NextResponse } from "next/server";

import { expiredSessionCookie } from "@/auth/cookie";
import { isSameOriginMutation } from "@/auth/request";

export async function POST(request: Request) {
  if (!isSameOriginMutation(request)) {
    return NextResponse.json(
      { error: "Origem não permitida." },
      { status: 403, headers: { "Cache-Control": "private, no-store" } },
    );
  }

  const response = NextResponse.json(
    { ok: true },
    { headers: { "Cache-Control": "private, no-store" } },
  );
  response.cookies.set(expiredSessionCookie());
  return response;
}

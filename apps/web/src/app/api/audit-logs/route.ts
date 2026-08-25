import { NextResponse } from "next/server";

import {
  authenticatedBackendFetch,
  MissingSessionError,
} from "@/server/authenticated-backend";

const allowedQueryKeys = new Set([
  "page", "page_size", "search", "action", "actor_user_id",
  "target_type", "target_id", "from", "to",
]);
const noStoreHeaders = { "Cache-Control": "private, no-store" };

export async function GET(request: Request) {
  const source = new URL(request.url).searchParams;
  const query = new URLSearchParams();
  source.forEach((value, key) => {
    if (allowedQueryKeys.has(key)) query.append(key, value);
  });
  try {
    const response = await authenticatedBackendFetch(
      `/audit-logs${query.size ? `?${query.toString()}` : ""}`,
      { method: "GET" },
    );
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
      { error: "Não foi possível consultar a auditoria." },
      { status: 502, headers: noStoreHeaders },
    );
  }
}

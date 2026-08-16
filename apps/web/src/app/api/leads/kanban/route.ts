import { NextResponse } from "next/server";

import {
  authenticatedBackendFetch,
  backendPathWithLegacyCompany,
  MissingSessionError,
} from "@/server/authenticated-backend";

export async function GET() {
  try {
    const backendResponse = await authenticatedBackendFetch(
      backendPathWithLegacyCompany("/leads/kanban"),
      { method: "GET" },
    );

    return new NextResponse(backendResponse.body, {
      status: backendResponse.status,
      headers: {
        "Content-Type":
          backendResponse.headers.get("content-type") ?? "application/json",
      },
    });
  } catch (error) {
    if (error instanceof MissingSessionError) {
      return NextResponse.json({ error: "Sessão inválida." }, { status: 401 });
    }

    return NextResponse.json(
      { error: "Não foi possível carregar os leads." },
      { status: 502 },
    );
  }
}

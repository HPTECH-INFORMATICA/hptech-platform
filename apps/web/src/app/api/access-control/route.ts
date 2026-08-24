import { NextResponse } from "next/server";

import {
  authenticatedBackendFetch,
  MissingSessionError,
} from "@/server/authenticated-backend";

const noStoreHeaders = { "Cache-Control": "private, no-store" };

export async function GET() {
  try {
    const response = await authenticatedBackendFetch("/access-control", {
      method: "GET",
    });
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
      { error: "Não foi possível consultar os acessos." },
      { status: 502, headers: noStoreHeaders },
    );
  }
}

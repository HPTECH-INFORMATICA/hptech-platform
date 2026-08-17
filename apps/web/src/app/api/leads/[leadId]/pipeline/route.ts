import { NextResponse } from "next/server";

import { isSameOriginMutation } from "@/auth/request";
import {
  authenticatedBackendFetch,
  MissingSessionError,
} from "@/server/authenticated-backend";

type RouteContext = {
  params: Promise<{ leadId: string }>;
};

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function PATCH(request: Request, context: RouteContext) {
  if (!isSameOriginMutation(request)) {
    return NextResponse.json(
      { error: "Origem não permitida." },
      { status: 403, headers: { "Cache-Control": "private, no-store" } },
    );
  }

  const { leadId } = await context.params;

  if (!UUID_PATTERN.test(leadId)) {
    return NextResponse.json(
      { error: "Identificador de lead inválido." },
      { status: 400, headers: { "Cache-Control": "private, no-store" } },
    );
  }

  try {
    const backendResponse = await authenticatedBackendFetch(
      `/leads/${encodeURIComponent(leadId)}/pipeline`,
      {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: await request.text(),
      },
    );

    return new NextResponse(backendResponse.body, {
      status: backendResponse.status,
      headers: {
        "Cache-Control": "private, no-store",
        "Content-Type":
          backendResponse.headers.get("content-type") ?? "application/json",
      },
    });
  } catch (error) {
    if (error instanceof MissingSessionError) {
      return NextResponse.json(
        { error: "Sessão inválida." },
        { status: 401, headers: { "Cache-Control": "private, no-store" } },
      );
    }

    return NextResponse.json(
      { error: "Não foi possível atualizar o lead." },
      { status: 502, headers: { "Cache-Control": "private, no-store" } },
    );
  }
}

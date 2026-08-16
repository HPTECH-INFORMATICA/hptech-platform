import { NextResponse } from "next/server";

import { isSameOriginMutation } from "@/auth/request";
import {
  authenticatedBackendFetch,
  backendPathWithLegacyCompany,
  MissingSessionError,
} from "@/server/authenticated-backend";

type RouteContext = {
  params: Promise<{ leadId: string }>;
};

export async function PATCH(request: Request, context: RouteContext) {
  if (!isSameOriginMutation(request)) {
    return NextResponse.json({ error: "Origem não permitida." }, { status: 403 });
  }

  const { leadId } = await context.params;

  try {
    const backendResponse = await authenticatedBackendFetch(
      backendPathWithLegacyCompany(
        `/leads/${encodeURIComponent(leadId)}/pipeline`,
      ),
      {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: await request.text(),
      },
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
      { error: "Não foi possível atualizar o lead." },
      { status: 502 },
    );
  }
}

import { NextResponse } from "next/server";

import {
  financialSummaryQueryKeys,
  validateFinancialQuery,
} from "@/lib/financial-routes";
import {
  authenticatedBackendFetch,
  MissingSessionError,
} from "@/server/authenticated-backend";

function privateJson(body: object, status: number) {
  return NextResponse.json(body, {
    status,
    headers: { "Cache-Control": "private, no-store" },
  });
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const queryError = validateFinancialQuery(
    url.searchParams,
    financialSummaryQueryKeys,
  );
  if (queryError) return privateJson({ error: queryError }, 400);

  try {
    const query = url.searchParams.toString();
    const response = await authenticatedBackendFetch(
      `/financial/summary${query ? `?${query}` : ""}`,
      { method: "GET" },
    );
    return new NextResponse(response.body, {
      status: response.status,
      headers: {
        "Cache-Control": "private, no-store",
        "Content-Type": response.headers.get("content-type") ?? "application/json",
      },
    });
  } catch (error) {
    if (error instanceof MissingSessionError) {
      return privateJson({ error: "Sessão inválida." }, 401);
    }
    return privateJson({ error: "Não foi possível carregar o fluxo de caixa." }, 502);
  }
}

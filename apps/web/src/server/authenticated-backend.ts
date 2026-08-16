import "server-only";

import { cookies } from "next/headers";

import { SESSION_COOKIE_NAME } from "@/auth/cookie";

export class MissingSessionError extends Error {}

function getApiUrl(): string {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL;

  if (!apiUrl) {
    throw new Error("NEXT_PUBLIC_API_URL não está configurada.");
  }

  return apiUrl.replace(/\/$/, "");
}

export async function authenticatedBackendFetch(
  path: string,
  init?: RequestInit,
): Promise<Response> {
  if (!path.startsWith("/")) {
    throw new Error("O caminho do backend deve ser absoluto.");
  }

  const cookieStore = await cookies();
  const accessToken = cookieStore.get(SESSION_COOKIE_NAME)?.value;

  if (!accessToken) {
    throw new MissingSessionError("Sessão ausente.");
  }

  const headers = new Headers(init?.headers);
  headers.set("Accept", "application/json");
  headers.set("Authorization", `Bearer ${accessToken}`);

  return fetch(`${getApiUrl()}${path}`, {
    ...init,
    headers,
    cache: "no-store",
  });
}

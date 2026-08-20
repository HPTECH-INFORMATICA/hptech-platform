import "server-only";

import { cookies } from "next/headers";

import { SESSION_COOKIE_NAME } from "@/auth/cookie";

export class MissingSessionError extends Error {}

const SAFE_BACKEND_PATH = /^\/[A-Za-z0-9_/%-]+$/;

function getApiUrl(): string {
  const apiUrl = process.env.API_URL;

  if (!apiUrl) {
    throw new Error("API_URL não está configurada.");
  }

  return apiUrl.replace(/\/$/, "");
}

export async function authenticatedBackendFetch(
  path: string,
  init?: RequestInit,
): Promise<Response> {
  if (
    !SAFE_BACKEND_PATH.test(path) ||
    path.startsWith("//") ||
    path.includes("..")
  ) {
    throw new Error("O caminho do backend não é permitido.");
  }

  const cookieStore = await cookies();
  const accessToken = cookieStore.get(SESSION_COOKIE_NAME)?.value;

  if (!accessToken) {
    throw new MissingSessionError("Sessão ausente.");
  }

  const headers = new Headers(init?.headers);
  headers.delete("Cookie");
  headers.delete("Host");
  headers.set("Accept", "application/json");
  headers.set("Authorization", `Bearer ${accessToken}`);

  return fetch(`${getApiUrl()}${path}`, {
    ...init,
    headers,
    cache: "no-store",
  });
}

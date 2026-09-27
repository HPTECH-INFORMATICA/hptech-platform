import "server-only";

const SAFE_BACKEND_PATH = /^\/[A-Za-z0-9_/%?&=.+-]+$/;

function getApiUrl(): string {
  const apiUrl = process.env.API_URL;
  if (!apiUrl) throw new Error("API_URL não está configurada.");
  return apiUrl.replace(/\/$/, "");
}

export function publicBackendFetch(
  path: string,
  init?: RequestInit,
): Promise<Response> {
  if (
    !SAFE_BACKEND_PATH.test(path) ||
    path.startsWith("//") ||
    path.includes("..")
  ) {
    throw new Error("O caminho público do backend não é permitido.");
  }

  const headers = new Headers(init?.headers);
  headers.delete("Authorization");
  headers.delete("Cookie");
  headers.delete("Host");
  headers.set("Accept", "application/json");

  return fetch(`${getApiUrl()}${path}`, {
    ...init,
    headers,
  });
}

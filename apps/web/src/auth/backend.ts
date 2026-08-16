import type { CurrentUser } from "./types";

type LoginResult = {
  accessToken: string;
  expiresIn: number;
};

export class AuthenticationError extends Error {}
export class AuthenticationServiceError extends Error {}

function getApiUrl(): string {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL;

  if (!apiUrl) {
    throw new AuthenticationServiceError(
      "NEXT_PUBLIC_API_URL não está configurada.",
    );
  }

  return apiUrl.replace(/\/$/, "");
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function parseCurrentUser(value: unknown): CurrentUser | null {
  if (!isRecord(value) || !isRecord(value.company)) {
    return null;
  }

  const { company } = value;

  if (
    !isNonEmptyString(value.id) ||
    !isNonEmptyString(value.name) ||
    !isNonEmptyString(value.email) ||
    !isNonEmptyString(value.role) ||
    typeof value.active !== "boolean" ||
    !isNonEmptyString(company.id) ||
    !isNonEmptyString(company.name) ||
    !isNonEmptyString(company.slug) ||
    !isNonEmptyString(company.status)
  ) {
    return null;
  }

  return {
    id: value.id,
    name: value.name,
    email: value.email,
    role: value.role,
    active: value.active,
    company: {
      id: company.id,
      name: company.name,
      slug: company.slug,
      status: company.status,
    },
  };
}

export async function authenticate(
  email: string,
  password: string,
): Promise<LoginResult> {
  let response: Response;

  try {
    response = await fetch(`${getApiUrl()}/auth/login`, {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ email, password }),
      cache: "no-store",
    });
  } catch {
    throw new AuthenticationServiceError("Serviço de autenticação indisponível.");
  }

  if (response.status === 401) {
    throw new AuthenticationError("Credenciais inválidas.");
  }

  if (!response.ok) {
    throw new AuthenticationServiceError("Serviço de autenticação indisponível.");
  }

  const body: unknown = await response.json().catch(() => null);

  if (
    !isRecord(body) ||
    !isNonEmptyString(body.access_token) ||
    body.token_type !== "bearer" ||
    typeof body.expires_in !== "number" ||
    !Number.isSafeInteger(body.expires_in) ||
    body.expires_in <= 0
  ) {
    throw new AuthenticationServiceError("Resposta de autenticação inválida.");
  }

  return {
    accessToken: body.access_token,
    expiresIn: body.expires_in,
  };
}

export async function fetchCurrentUser(
  accessToken: string,
): Promise<CurrentUser | null> {
  let response: Response;

  try {
    response = await fetch(`${getApiUrl()}/auth/me`, {
      method: "GET",
      headers: {
        Accept: "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
      cache: "no-store",
    });
  } catch {
    throw new AuthenticationServiceError("Serviço de autenticação indisponível.");
  }

  if (response.status === 401 || response.status === 403) {
    return null;
  }

  if (!response.ok) {
    throw new AuthenticationServiceError("Serviço de autenticação indisponível.");
  }

  const user = parseCurrentUser(await response.json().catch(() => null));

  if (!user) {
    throw new AuthenticationServiceError("Resposta de identidade inválida.");
  }

  return user;
}

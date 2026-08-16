export const SESSION_COOKIE_NAME = "hptech_session";

const baseCookieOptions = {
  httpOnly: true,
  sameSite: "lax",
  secure: process.env.NODE_ENV === "production",
  path: "/",
} as const;

export function sessionCookie(
  value: string,
  maxAge: number,
) {
  return {
    name: SESSION_COOKIE_NAME,
    value,
    maxAge,
    ...baseCookieOptions,
  };
}

export function expiredSessionCookie() {
  return sessionCookie("", 0);
}

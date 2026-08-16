import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { fetchCurrentUser } from "./backend";
import { SESSION_COOKIE_NAME } from "./cookie";
import type { CurrentUser } from "./types";

export async function getCurrentUser(): Promise<CurrentUser | null> {
  const cookieStore = await cookies();
  const accessToken = cookieStore.get(SESSION_COOKIE_NAME)?.value;

  if (!accessToken) {
    return null;
  }

  return fetchCurrentUser(accessToken);
}

export async function requireCurrentUser(): Promise<CurrentUser> {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  return user;
}

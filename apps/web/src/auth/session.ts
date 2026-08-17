import { cookies } from "next/headers";
import { notFound, redirect } from "next/navigation";

import { fetchCurrentUser } from "./backend";
import { SESSION_COOKIE_NAME } from "./cookie";
import { hasPermission } from "./types";
import type {
  CurrentUser,
  PermissionAction,
  PermissionModule,
} from "./types";

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

export async function requireCurrentUserPermission(
  module: PermissionModule,
  action: PermissionAction,
): Promise<CurrentUser> {
  const user = await requireCurrentUser();

  if (!hasPermission(user, module, action)) {
    notFound();
  }

  return user;
}

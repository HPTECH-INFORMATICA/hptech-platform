import { redirect } from "next/navigation";

import { getCurrentUser } from "@/auth/session";

export default async function Home() {
  const user = await getCurrentUser();

  redirect(user ? "/inicio" : "/login");
}

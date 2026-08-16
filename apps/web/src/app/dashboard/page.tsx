import { requireCurrentUser } from "@/auth/session";
import SessionUser from "@/auth/SessionUser";
import DashboardHome from "@/components/dashboard/DashboardHome";
import AppShell from "@/components/layout/AppShell";

export default async function DashboardPage() {
  const user = await requireCurrentUser();

  return (
    <AppShell title="Dashboard" userArea={<SessionUser user={user} />}>
      <DashboardHome />
    </AppShell>
  );
}

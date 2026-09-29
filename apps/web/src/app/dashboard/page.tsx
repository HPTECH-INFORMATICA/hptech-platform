import { requireCurrentUserPermission } from "@/auth/session";
import SessionUser from "@/auth/SessionUser";
import DashboardHome from "@/components/dashboard/DashboardHome";
import AppShell from "@/components/layout/AppShell";

export default async function DashboardPage() {
  const user = await requireCurrentUserPermission("DASHBOARD", "VIEW");

  return (
    <AppShell
      title="Dashboard"
      clinicName={user.company.name}
      permissions={user.permissions}
      userArea={<SessionUser user={user} />}
    >
      <DashboardHome />
    </AppShell>
  );
}

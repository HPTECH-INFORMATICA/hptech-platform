import DashboardHome from "@/components/dashboard/DashboardHome";
import AppShell from "@/components/layout/AppShell";

export default function DashboardPage() {
  return (
    <AppShell title="Dashboard">
      <DashboardHome />
    </AppShell>
  );
}

import { requireCurrentUser } from "@/auth/session";
import SessionUser from "@/auth/SessionUser";
import CRMHome from "@/components/crm/CRMHome";
import AppShell from "@/components/layout/AppShell";

export default async function CRMPage() {
  const user = await requireCurrentUser();

  return (
    <AppShell title="CRM" userArea={<SessionUser user={user} />}>
      <CRMHome />
    </AppShell>
  );
}

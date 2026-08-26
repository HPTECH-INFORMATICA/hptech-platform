import { requireCurrentUserPermission } from "@/auth/session";
import SessionUser from "@/auth/SessionUser";
import AppShell from "@/components/layout/AppShell";

import ServicesPage from "./ServicesPage";

export default async function ServicesRoute() {
  const user = await requireCurrentUserPermission("SERVICES", "VIEW");

  return (
    <AppShell
      title="Serviços"
      permissions={user.permissions}
      userArea={<SessionUser user={user} />}
    >
      <ServicesPage currentUser={user} />
    </AppShell>
  );
}

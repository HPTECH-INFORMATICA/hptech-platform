import { requireCurrentUserPermission } from "@/auth/session";
import SessionUser from "@/auth/SessionUser";
import AppShell from "@/components/layout/AppShell";

import ProfessionalsPage from "./ProfessionalsPage";

export default async function ProfessionalsRoute() {
  const user = await requireCurrentUserPermission("PROFESSIONALS", "VIEW");

  return (
    <AppShell
      title="Profissionais"
      clinicName={user.company.name}
      permissions={user.permissions}
      userArea={<SessionUser user={user} />}
    >
      <ProfessionalsPage currentUser={user} />
    </AppShell>
  );
}

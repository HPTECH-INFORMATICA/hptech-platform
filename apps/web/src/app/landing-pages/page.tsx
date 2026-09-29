import { requireCurrentUserPermission } from "@/auth/session";
import SessionUser from "@/auth/SessionUser";
import AppShell from "@/components/layout/AppShell";

import LandingPagesPage from "./LandingPagesPage";

export default async function LandingPagesRoute() {
  const user = await requireCurrentUserPermission("LANDING_PAGES", "VIEW");

  return (
    <AppShell
      title="Landing Pages"
      clinicName={user.company.name}
      permissions={user.permissions}
      userArea={<SessionUser user={user} />}
    >
      <LandingPagesPage currentUser={user} />
    </AppShell>
  );
}

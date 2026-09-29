import { requireCurrentUserPermission } from "@/auth/session";
import SessionUser from "@/auth/SessionUser";
import AppShell from "@/components/layout/AppShell";
import { todayInTimezone } from "@/lib/professional-availability";

import ProfessionalAvailabilityPage from "./ProfessionalAvailabilityPage";

export default async function ProfessionalAvailabilityRoute({
  params,
}: {
  params: Promise<{ professionalId: string }>;
}) {
  const user = await requireCurrentUserPermission("PROFESSIONALS", "VIEW");
  const { professionalId } = await params;

  return (
    <AppShell
      title="Disponibilidade profissional"
      clinicName={user.company.name}
      permissions={user.permissions}
      userArea={<SessionUser user={user} />}
    >
      <ProfessionalAvailabilityPage
        currentUser={user}
        professionalId={professionalId}
        today={todayInTimezone(user.company.timezone)}
      />
    </AppShell>
  );
}

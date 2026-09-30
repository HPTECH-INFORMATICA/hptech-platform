import { requireCurrentUserPermission } from "@/auth/session";
import SessionUser from "@/auth/SessionUser";
import AppShell from "@/components/layout/AppShell";

import ProfessionalsPage from "./ProfessionalsPage";

function todayInTimezone(timezone: string): string {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${values.year}-${values.month}-${values.day}`;
}

export default async function ProfessionalsRoute() {
  const user = await requireCurrentUserPermission("PROFESSIONALS", "VIEW");

  return (
    <AppShell
      title="Profissionais"
      clinicName={user.company.name}
      permissions={user.permissions}
      userArea={<SessionUser user={user} />}
    >
      <ProfessionalsPage
        currentUser={user}
        maxBirthDate={todayInTimezone(user.company.timezone)}
      />
    </AppShell>
  );
}

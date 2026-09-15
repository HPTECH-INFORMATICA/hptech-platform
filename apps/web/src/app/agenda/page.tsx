import { requireCurrentUserPermission } from "@/auth/session";
import SessionUser from "@/auth/SessionUser";
import AppShell from "@/components/layout/AppShell";

import AgendaPage from "./AgendaPage";

function todayInTimezone(timezone: string): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${values.year}-${values.month}-${values.day}`;
}

export default async function AgendaRoute() {
  const user = await requireCurrentUserPermission("APPOINTMENTS", "VIEW");

  return (
    <AppShell
      title="Agenda"
      permissions={user.permissions}
      userArea={<SessionUser user={user} />}
    >
      <AgendaPage
        timezone={user.company.timezone}
        initialDate={todayInTimezone(user.company.timezone)}
      />
    </AppShell>
  );
}

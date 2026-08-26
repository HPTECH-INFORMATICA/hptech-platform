import { requireCurrentUserPermission } from "@/auth/session";
import SessionUser from "@/auth/SessionUser";
import AppShell from "@/components/layout/AppShell";

import PatientsPage from "./PatientsPage";

function todayInSaoPaulo(): string {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Sao_Paulo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${values.year}-${values.month}-${values.day}`;
}

export default async function PatientsRoute() {
  const user = await requireCurrentUserPermission("PATIENTS", "VIEW");

  return (
    <AppShell
      title="Pacientes"
      permissions={user.permissions}
      userArea={<SessionUser user={user} />}
    >
      <PatientsPage currentUser={user} maxBirthDate={todayInSaoPaulo()} />
    </AppShell>
  );
}

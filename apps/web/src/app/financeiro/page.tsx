import { requireCurrentUserPermission } from "@/auth/session";
import SessionUser from "@/auth/SessionUser";
import AppShell from "@/components/layout/AppShell";

import FinancialPage from "./FinancialPage";

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

export default async function FinanceiroPage() {
  const user = await requireCurrentUserPermission("FINANCIAL", "VIEW");

  return (
    <AppShell
      title="Financeiro"
      permissions={user.permissions}
      userArea={<SessionUser user={user} />}
    >
      <FinancialPage
        currentUser={user}
        initialDate={todayInTimezone(user.company.timezone)}
      />
    </AppShell>
  );
}

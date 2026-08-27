import { requireCurrentUserPermission } from "@/auth/session";
import { hasPermission } from "@/auth/types";
import SessionUser from "@/auth/SessionUser";
import CRMHome from "@/components/crm/CRMHome";
import AppShell from "@/components/layout/AppShell";

export default async function CRMPage() {
  const user = await requireCurrentUserPermission("CRM", "VIEW");
  const canUpdate = hasPermission(user, "CRM", "UPDATE");
  const canViewPatients = hasPermission(user, "PATIENTS", "VIEW");
  const canCreatePatient =
    canUpdate && hasPermission(user, "PATIENTS", "CREATE");
  const canLinkPatient = canUpdate && canViewPatients;
  const canUnlinkPatient =
    canUpdate && hasPermission(user, "PATIENTS", "UPDATE");

  return (
    <AppShell
      title="CRM"
      permissions={user.permissions}
      userArea={<SessionUser user={user} />}
    >
      <CRMHome
        canUpdate={canUpdate}
        canViewPatients={canViewPatients}
        canCreatePatient={canCreatePatient}
        canLinkPatient={canLinkPatient}
        canUnlinkPatient={canUnlinkPatient}
      />
    </AppShell>
  );
}

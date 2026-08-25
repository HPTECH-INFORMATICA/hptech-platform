import { redirect } from "next/navigation";

import { requireCurrentUserPermission } from "@/auth/session";
import { hasPermission } from "@/auth/types";
import SessionUser from "@/auth/SessionUser";
import AppShell from "@/components/layout/AppShell";

import AdminPanel from "./AdminPanel";
import { parseAdminTab } from "./tabs";

type ConfiguracoesPageProps = {
  searchParams: Promise<{ tab?: string | string[] }>;
};

export default async function ConfiguracoesPage({
  searchParams,
}: ConfiguracoesPageProps) {
  const user = await requireCurrentUserPermission("COMPANY", "VIEW");
  const requestedTab = (await searchParams).tab;
  const activeTab = parseAdminTab(requestedTab);

  if (requestedTab !== undefined && activeTab === null) {
    redirect("/configuracoes?tab=visao-geral");
  }

  if (activeTab === "usuarios" && !hasPermission(user, "USERS", "VIEW")) {
    redirect("/configuracoes?tab=visao-geral");
  }

  if (activeTab === "acessos" && !hasPermission(user, "ACCESS_CONTROL", "VIEW")) {
    redirect("/configuracoes?tab=visao-geral");
  }

  if (activeTab === "auditoria" && !hasPermission(user, "AUDIT", "VIEW")) {
    redirect("/configuracoes?tab=visao-geral");
  }

  return (
    <AppShell
      title="Configurações"
      permissions={user.permissions}
      userArea={<SessionUser user={user} />}
    >
      <AdminPanel user={user} activeTab={activeTab ?? "visao-geral"} />
    </AppShell>
  );
}

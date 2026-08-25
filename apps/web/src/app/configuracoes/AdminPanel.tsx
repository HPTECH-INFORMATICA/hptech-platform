"use client";

import { useCallback, useState } from "react";
import { useRouter } from "next/navigation";

import { hasPermission, type CurrentUser } from "@/auth/types";
import Badge from "@/components/ui/Badge";
import Card from "@/components/ui/Card";
import PageHeader from "@/components/ui/PageHeader";
import Section from "@/components/ui/Section";
import Tabs, {
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/Tabs";

import type { AdminTab } from "./tabs";
import UsersPanel from "./UsersPanel";
import AccessControlPanel from "./AccessControlPanel";
import AuditPanel from "./AuditPanel";

type AdminPanelProps = {
  user: CurrentUser;
  activeTab: AdminTab;
};

const roleLabels: Record<string, string> = {
  OWNER: "Proprietário",
  ADMIN: "Administrador",
};

const companyStatusLabels: Record<string, string> = {
  ACTIVE: "Ativa",
  TRIAL: "Em avaliação",
  SUSPENDED: "Suspensa",
  CANCELED: "Cancelada",
};

function DefinitionItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0 space-y-1">
      <dt className="text-sm font-medium text-hp-muted">{label}</dt>
      <dd className="break-words text-sm text-hp-foreground">{value}</dd>
    </div>
  );
}

export default function AdminPanel({ user, activeTab }: AdminPanelProps) {
  const router = useRouter();
  const roleLabel = roleLabels[user.role] ?? user.role;
  const companyStatus = companyStatusLabels[user.company.status] ?? user.company.status;
  const canViewUsers = hasPermission(user, "USERS", "VIEW");
  const canViewAccessControl = hasPermission(user, "ACCESS_CONTROL", "VIEW");
  const canViewAudit = hasPermission(user, "AUDIT", "VIEW");
  const [accessControlDirty, setAccessControlDirty] = useState(false);
  const handleAccessControlDirty = useCallback(
    (dirty: boolean) => setAccessControlDirty(dirty),
    [],
  );

  function changeTab(tab: string) {
    if (accessControlDirty && tab !== "acessos") return;
    router.push(`/configuracoes?tab=${encodeURIComponent(tab)}`);
  }

  return (
    <div className="min-w-0 space-y-8">
      <PageHeader
        title="Painel Administrativo"
        description="Consulte a identidade administrativa e os dados atuais da empresa em um único painel."
        metadata={<Badge variant="primary">{roleLabel}</Badge>}
      />

      <Tabs value={activeTab} onValueChange={changeTab}>
        <div className="max-w-full overflow-x-auto pb-1">
          <TabsList aria-label="Seções do Painel Administrativo">
            <TabsTrigger value="visao-geral" disabled={accessControlDirty}>Visão geral</TabsTrigger>
            <TabsTrigger value="empresa" disabled={accessControlDirty}>Empresa</TabsTrigger>
            {canViewUsers ? (
              <TabsTrigger value="usuarios" disabled={accessControlDirty}>Usuários</TabsTrigger>
            ) : null}
            {canViewAccessControl ? (
              <TabsTrigger value="acessos">Acessos e permissões</TabsTrigger>
            ) : null}
            {canViewAudit ? (
              <TabsTrigger value="auditoria" disabled={accessControlDirty}>
                Auditoria
              </TabsTrigger>
            ) : null}
          </TabsList>
        </div>

        <TabsContent value="visao-geral">
          <Section
            title="Visão geral"
            description="Informações reais da sessão e do tenant autenticado."
          >
            <div className="grid min-w-0 gap-4 md:grid-cols-2">
              <Card variant="subtle">
                <h3 className="text-lg font-semibold text-hp-foreground">
                  Identidade atual
                </h3>
                <dl className="mt-4 grid min-w-0 gap-4 sm:grid-cols-2">
                  <DefinitionItem label="Nome" value={user.name} />
                  <DefinitionItem label="Email" value={user.email} />
                  <DefinitionItem label="Papel" value={roleLabel} />
                  <DefinitionItem
                    label="Estado da conta"
                    value={user.active ? "Ativa" : "Inativa"}
                  />
                </dl>
              </Card>

              <Card variant="subtle">
                <h3 className="text-lg font-semibold text-hp-foreground">
                  Empresa autenticada
                </h3>
                <dl className="mt-4 grid min-w-0 gap-4 sm:grid-cols-2">
                  <DefinitionItem label="Nome" value={user.company.name} />
                  <DefinitionItem label="Status" value={companyStatus} />
                  <DefinitionItem label="Slug" value={user.company.slug} />
                  <DefinitionItem label="Tenant ID" value={user.company.id} />
                </dl>
              </Card>
            </div>
          </Section>
        </TabsContent>

        <TabsContent value="empresa">
          <Section
            title="Empresa"
            description="Dados de identificação disponíveis na sessão atual. Edição será tratada em lote futuro."
          >
            <Card variant="outlined">
              <dl className="grid min-w-0 gap-5 sm:grid-cols-2">
                <DefinitionItem label="Nome" value={user.company.name} />
                <DefinitionItem label="Status" value={companyStatus} />
                <DefinitionItem label="Slug" value={user.company.slug} />
                <DefinitionItem label="Tenant ID" value={user.company.id} />
              </dl>
            </Card>
          </Section>
        </TabsContent>

        {canViewUsers ? (
          <TabsContent value="usuarios">
            <UsersPanel currentUser={user} />
          </TabsContent>
        ) : null}

        {canViewAccessControl ? (
          <TabsContent value="acessos">
            <AccessControlPanel
              canManageUsers={canViewUsers}
              onManageUsers={() => changeTab("usuarios")}
              onDirtyChange={handleAccessControlDirty}
            />
          </TabsContent>
        ) : null}

        {canViewAudit ? (
          <TabsContent value="auditoria">
            <AuditPanel />
          </TabsContent>
        ) : null}
      </Tabs>
    </div>
  );
}

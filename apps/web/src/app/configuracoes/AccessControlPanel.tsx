"use client";

import { useEffect, useState } from "react";

import Alert from "@/components/ui/Alert";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import EmptyState from "@/components/ui/EmptyState";
import Section from "@/components/ui/Section";
import Skeleton from "@/components/ui/Skeleton";
import Table, { TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/Table";
import {
  AccessControlApiError,
  getAccessControlCatalog,
  type AccessControlCatalog,
  type AccessControlModule,
  type AccessControlRole,
} from "@/services/access-control-service";

type AccessControlPanelProps = {
  canManageUsers: boolean;
  onManageUsers: () => void;
};

const roleLabels: Record<string, string> = {
  OWNER: "Proprietário", ADMIN: "Administrador", MANAGER: "Gerente",
  PROFESSIONAL: "Profissional", RECEPTIONIST: "Recepcionista", SALES: "Vendas",
  FINANCIAL: "Financeiro", VIEWER: "Visualizador",
};
const roleDescriptions: Record<string, string> = {
  OWNER: "Controle integral da empresa e da administração.",
  ADMIN: "Administração da empresa, usuários e operação.",
  MANAGER: "Gestão da operação comercial.",
  PROFESSIONAL: "Consulta operacional em modo leitura.",
  RECEPTIONIST: "Atendimento e atualização da operação comercial.",
  SALES: "Criação e atualização da operação comercial.",
  FINANCIAL: "Consulta operacional em modo leitura.",
  VIEWER: "Consulta da plataforma em modo leitura.",
};
const moduleLabels: Record<string, string> = {
  DASHBOARD: "Dashboard", CRM: "CRM", COMPANY: "Empresa", USERS: "Usuários",
  ACCESS_CONTROL: "Acessos e permissões",
};
const actionLabels: Record<string, string> = {
  VIEW: "Visualizar", CREATE: "Criar", UPDATE: "Atualizar", DELETE: "Excluir",
  BLOCK: "Bloquear", MANAGE_ROLE: "Gerenciar papel",
};

function actionsForModule(role: AccessControlRole, module: AccessControlModule) {
  return role.permissions.find((permission) => permission.module === module.module)?.actions ?? [];
}

function PermissionBadges({ actions }: { actions: AccessControlRole["permissions"][number]["actions"] }) {
  if (actions.length === 0) return <Badge size="sm" variant="neutral">Sem acesso</Badge>;
  return <>{actions.map((action) => <Badge key={action} size="sm" variant="success">{actionLabels[action] ?? action}</Badge>)}</>;
}

function RolePermissions({ role, modules }: { role: AccessControlRole; modules: AccessControlModule[] }) {
  return (
    <div className="space-y-3">
      {modules.map((module) => (
        <div key={module.module} className="space-y-2">
          <p className="text-sm font-medium text-hp-foreground">{moduleLabels[module.module] ?? module.module}</p>
          <div className="flex flex-wrap gap-2">
            <PermissionBadges actions={actionsForModule(role, module)} />
          </div>
        </div>
      ))}
    </div>
  );
}

export default function AccessControlPanel({ canManageUsers, onManageUsers }: AccessControlPanelProps) {
  const [catalog, setCatalog] = useState<AccessControlCatalog | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reload, setReload] = useState(0);

  useEffect(() => {
    let active = true;
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const result = await getAccessControlCatalog();
        if (active) setCatalog(result);
      } catch (reason) {
        if (!active) return;
        setCatalog(null);
        setError(
          reason instanceof AccessControlApiError && reason.status === 401
            ? "Sua sessão não é mais válida. Entre novamente para continuar."
            : reason instanceof AccessControlApiError && reason.status === 403
              ? "Você não possui permissão para consultar os acessos."
              : "Não foi possível carregar os acessos e permissões.",
        );
      } finally {
        if (active) setLoading(false);
      }
    };
    void load();
    return () => { active = false; };
  }, [reload]);

  return (
    <Section title="Acessos e Permissões" description="Consulte as permissões padrão definidas para cada papel da plataforma.">
      <Card variant="subtle" className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div><h3 className="font-semibold text-hp-foreground">Política de acesso</h3><p className="mt-1 text-sm text-hp-muted">Os acessos são definidos pelo papel do usuário.</p></div>
        {canManageUsers ? <Button variant="outline" onClick={onManageUsers}>Gerenciar usuários</Button> : null}
      </Card>

      {loading ? <div aria-label="Carregando acessos" className="space-y-3"><Skeleton height={48} /><Skeleton height={96} /><Skeleton height={96} /></div> : null}
      {!loading && error ? <Alert variant="danger" title="Falha ao carregar" description={error} action={<Button variant="outline" onClick={() => setReload((value) => value + 1)}>Tentar novamente</Button>} /> : null}
      {!loading && !error && catalog?.roles.length === 0 ? <EmptyState title="Nenhum acesso disponível" description="O catálogo de acessos não retornou papéis configurados." /> : null}

      {!loading && !error && catalog?.roles.length ? (
        <>
          <div className="hidden overflow-x-auto rounded-[var(--radius-lg)] border border-hp-border md:block">
            <Table hoverable={false}>
              <TableHeader><TableRow><TableHead scope="col">Papel</TableHead>{catalog.modules.map((module) => <TableHead key={module.module} scope="col">{moduleLabels[module.module] ?? module.module}</TableHead>)}</TableRow></TableHeader>
              <TableBody>{catalog.roles.map((role) => <TableRow key={role.role}><TableHead scope="row"><span className="block font-semibold">{roleLabels[role.role] ?? role.role}</span><span className="mt-1 block min-w-48 whitespace-normal text-xs font-normal text-hp-muted">{roleDescriptions[role.role]}</span></TableHead>{catalog.modules.map((module) => <TableCell key={module.module}><div className="flex min-w-32 flex-wrap gap-2"><PermissionBadges actions={actionsForModule(role, module)} /></div></TableCell>)}</TableRow>)}</TableBody>
            </Table>
          </div>
          <div className="grid gap-4 md:hidden">{catalog.roles.map((role) => <Card key={role.role} variant="outlined"><h3 className="text-lg font-semibold text-hp-foreground">{roleLabels[role.role] ?? role.role}</h3><p className="mb-4 mt-1 text-sm text-hp-muted">{roleDescriptions[role.role]}</p><RolePermissions role={role} modules={catalog.modules} /></Card>)}</div>
        </>
      ) : null}
    </Section>
  );
}

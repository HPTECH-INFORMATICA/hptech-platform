"use client";

import { useEffect, useMemo, useState } from "react";

import Alert from "@/components/ui/Alert";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import Checkbox from "@/components/ui/Checkbox";
import Dialog, { DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/Dialog";
import EmptyState from "@/components/ui/EmptyState";
import Section from "@/components/ui/Section";
import Skeleton from "@/components/ui/Skeleton";
import Table, { TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/Table";
import { AccessControlApiError, getAccessControlCatalog, resetRolePermissions, updateRolePermissions, type AccessControlCatalog, type AccessControlModule, type AccessControlPermissionInput, type AccessControlRole } from "@/services/access-control-service";

type Props = { canManageUsers: boolean; onManageUsers: () => void; onDirtyChange: (dirty: boolean) => void };
const roleLabels: Record<string, string> = { OWNER: "Proprietário", ADMIN: "Administrador", MANAGER: "Gerente", PROFESSIONAL: "Profissional", RECEPTIONIST: "Recepcionista", SALES: "Vendas", FINANCIAL: "Financeiro", VIEWER: "Visualizador" };
const roleDescriptions: Record<string, string> = { OWNER: "Autoridade máxima protegida da empresa.", ADMIN: "Administração da empresa, usuários e operação.", MANAGER: "Gestão da operação comercial.", PROFESSIONAL: "Consulta operacional em modo leitura.", RECEPTIONIST: "Atendimento e atualização da operação comercial.", SALES: "Criação e atualização da operação comercial.", FINANCIAL: "Consulta operacional em modo leitura.", VIEWER: "Consulta da plataforma em modo leitura." };
const moduleLabels: Record<string, string> = { DASHBOARD: "Dashboard", CRM: "CRM", COMPANY: "Empresa", USERS: "Usuários", ACCESS_CONTROL: "Acessos e permissões", AUDIT: "Auditoria", SERVICES: "Serviços" };
const actionLabels: Record<string, string> = { VIEW: "Visualizar", CREATE: "Criar", UPDATE: "Editar", DELETE: "Excluir", BLOCK: "Bloquear", MANAGE_ROLE: "Gerenciar papel", MANAGE: "Gerenciar acessos" };

function pairKey(module: string, action: string) { return `${module}/${action}`; }
function rolePairs(role: AccessControlRole) { return new Set(role.effective_permissions.flatMap((permission) => permission.actions.map((action) => pairKey(permission.module, action)))); }
function equalSets(left: Set<string>, right: Set<string>) { return left.size === right.size && [...left].every((value) => right.has(value)); }
function errorText(reason: unknown) {
  if (!(reason instanceof AccessControlApiError)) return "Não foi possível concluir a operação.";
  if (reason.status === 401) return "Sua sessão não é mais válida. Entre novamente para continuar.";
  if (reason.status === 403) return "Você não possui permissão para gerenciar estes acessos.";
  if (reason.status === 422) return reason.message;
  if (reason.status === 409) return "A configuração foi alterada. Recarregue e tente novamente.";
  return "Não foi possível concluir a operação.";
}

export default function AccessControlPanel({ canManageUsers, onManageUsers, onDirtyChange }: Props) {
  const [catalog, setCatalog] = useState<AccessControlCatalog | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reload, setReload] = useState(0);
  const [editingRole, setEditingRole] = useState<string | null>(null);
  const [draft, setDraft] = useState<Set<string>>(new Set());
  const [mutationError, setMutationError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [confirmation, setConfirmation] = useState<"save" | "reset" | null>(null);
  const editing = catalog?.roles.find((role) => role.role === editingRole) ?? null;
  const dirty = Boolean(editing && !equalSets(draft, rolePairs(editing)));

  useEffect(() => { onDirtyChange(dirty); return () => onDirtyChange(false); }, [dirty, onDirtyChange]);
  useEffect(() => {
    const warn = (event: BeforeUnloadEvent) => { if (dirty) event.preventDefault(); };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);
  useEffect(() => {
    let active = true;
    const load = async () => {
      setLoading(true); setError(null);
      try { const result = await getAccessControlCatalog(); if (active) setCatalog(result); }
      catch (reason) { if (active) { setCatalog(null); setError(errorText(reason)); } }
      finally { if (active) setLoading(false); }
    };
    void load(); return () => { active = false; };
  }, [reload]);

  const allPermissions = useMemo(() => catalog?.modules.flatMap((module) => module.actions.map((action) => ({ module: module.module, action }))) ?? [], [catalog]);
  function beginEdit(role: AccessControlRole) { setEditingRole(role.role); setDraft(rolePairs(role)); setMutationError(null); }
  function cancelEdit() { setEditingRole(null); setDraft(new Set()); setMutationError(null); }
  function toggle(key: string, checked: boolean) { setDraft((current) => { const next = new Set(current); if (checked) next.add(key); else next.delete(key); return next; }); }
  function updateCatalogRole(role: AccessControlRole) { setCatalog((current) => current ? { ...current, roles: current.roles.map((item) => item.role === role.role ? role : item) } : current); }
  async function confirmMutation() {
    if (!editing || !confirmation) return;
    setSaving(true); setMutationError(null);
    try {
      const updated = confirmation === "reset" ? await resetRolePermissions(editing.role) : await updateRolePermissions(editing.role, allPermissions.filter(({ module, action }) => draft.has(pairKey(module, action))) as AccessControlPermissionInput[]);
      updateCatalogRole(updated); cancelEdit(); setConfirmation(null);
    } catch (reason) { setConfirmation(null); setMutationError(errorText(reason)); }
    finally { setSaving(false); }
  }

  function PermissionControl({ role, module }: { role: AccessControlRole; module: AccessControlModule }) {
    const values = editingRole === role.role ? draft : rolePairs(role);
    return <div className="space-y-1">{module.actions.map((action) => {
      const key = pairKey(module.module, action);
      return editingRole === role.role
        ? <Checkbox key={key} label={actionLabels[action] ?? action} checked={values.has(key)} onChange={(event) => toggle(key, event.target.checked)} className="min-w-36" />
        : <div key={key} className="flex items-center gap-2 text-sm"><Badge size="sm" variant={values.has(key) ? "success" : "neutral"}>{values.has(key) ? "Permitido" : "Sem acesso"}</Badge><span>{actionLabels[action] ?? action}</span></div>;
    })}</div>;
  }
  function RoleActions({ role }: { role: AccessControlRole }) {
    if (role.role === "OWNER") return <Badge size="sm" variant="primary">Protegido</Badge>;
    if (role.editable && !editingRole) return <Button size="sm" variant="outline" onClick={() => beginEdit(role)}>Editar permissões</Button>;
    if (editingRole !== role.role) return null;
    return <><Button size="sm" disabled={!dirty || saving} onClick={() => setConfirmation("save")}>Salvar alterações</Button><Button size="sm" variant="ghost" disabled={saving} onClick={cancelEdit}>Cancelar</Button>{role.customized ? <Button size="sm" variant="danger" disabled={saving} onClick={() => setConfirmation("reset")}>Restaurar padrão</Button> : null}</>;
  }

  if (loading) return <Section title="Acessos e Permissões"><div aria-label="Carregando acessos" className="space-y-3"><Skeleton height={64} /><Skeleton height={120} /></div></Section>;
  if (error) return <Section title="Acessos e Permissões"><Alert variant="danger" title="Falha ao carregar" description={error} action={<Button variant="outline" onClick={() => setReload((value) => value + 1)}>Tentar novamente</Button>} /></Section>;
  if (!catalog?.roles.length) return <Section title="Acessos e Permissões"><EmptyState title="Nenhum acesso disponível" description="O catálogo não retornou papéis configurados." /></Section>;

  return (
    <Section title="Acessos e Permissões" description="Os acessos abaixo definem o que cada papel pode visualizar e executar.">
      <Card variant="subtle" className="space-y-2"><p className="text-sm text-hp-foreground">Alterar um papel afeta todos os usuários da empresa que possuem esse papel.</p><p className="text-sm text-hp-muted">Permissões do Proprietário são protegidas. A alteração de papel continua na aba Usuários.</p>{canManageUsers && !dirty ? <Button variant="outline" onClick={onManageUsers}>Gerenciar usuários</Button> : null}</Card>
      {mutationError ? <Alert variant="danger" title="Alteração não concluída" description={mutationError} /> : null}
      <div className="hidden overflow-x-auto rounded-[var(--radius-lg)] border border-hp-border md:block"><Table hoverable={false}><TableHeader><TableRow><TableHead scope="col">Papel</TableHead>{catalog.modules.map((module) => <TableHead key={module.module} scope="col">{moduleLabels[module.module] ?? module.module}</TableHead>)}</TableRow></TableHeader><TableBody>{catalog.roles.map((role) => <TableRow key={role.role}><TableHead scope="row"><span className="block font-semibold">{roleLabels[role.role] ?? role.role}</span><span className="mt-1 block min-w-48 whitespace-normal text-xs font-normal text-hp-muted">{roleDescriptions[role.role]}</span><Badge className="mt-2" size="sm" variant={role.customized ? "warning" : "neutral"}>{role.customized ? "Personalizado" : "Padrão"}</Badge><div className="mt-3 flex flex-wrap gap-2"><RoleActions role={role} /></div></TableHead>{catalog.modules.map((module) => <TableCell key={module.module} className="min-w-48"><PermissionControl role={role} module={module} /></TableCell>)}</TableRow>)}</TableBody></Table></div>
      <div className="grid gap-4 md:hidden">{catalog.roles.map((role) => <Card key={role.role} variant="outlined" className="space-y-4"><div><div className="flex flex-wrap items-center gap-2"><h3 className="text-lg font-semibold">{roleLabels[role.role] ?? role.role}</h3><Badge size="sm" variant={role.customized ? "warning" : "neutral"}>{role.customized ? "Personalizado" : "Padrão"}</Badge></div><p className="mt-1 text-sm text-hp-muted">{roleDescriptions[role.role]}</p></div>{catalog.modules.map((module) => <div key={module.module}><h4 className="mb-2 font-medium">{moduleLabels[module.module] ?? module.module}</h4><PermissionControl role={role} module={module} /></div>)}<div className="flex flex-wrap gap-2"><RoleActions role={role} /></div></Card>)}</div>
      <Dialog open={confirmation !== null} onOpenChange={(open) => { if (!open && !saving) setConfirmation(null); }}><DialogContent><DialogHeader><DialogTitle>{confirmation === "reset" ? "Restaurar permissões padrão?" : `Alterar acessos de ${editing ? roleLabels[editing.role] : "papel"}?`}</DialogTitle><DialogDescription>{confirmation === "reset" ? "As personalizações serão removidas e o papel voltará à política oficial." : "A alteração afetará todos os usuários da empresa que possuem este papel."}</DialogDescription></DialogHeader><DialogFooter><Button variant="ghost" disabled={saving} onClick={() => setConfirmation(null)}>Cancelar</Button><Button variant={confirmation === "reset" ? "danger" : "primary"} loading={saving} onClick={() => void confirmMutation()}>{confirmation === "reset" ? "Restaurar padrão" : "Confirmar alterações"}</Button></DialogFooter></DialogContent></Dialog>
    </Section>
  );
}

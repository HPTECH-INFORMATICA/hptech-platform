"use client";

import { useEffect, useMemo, useState } from "react";

import { hasPermission, type CurrentUser } from "@/auth/types";
import Alert from "@/components/ui/Alert";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import Dialog, {
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/Dialog";
import EmptyState from "@/components/ui/EmptyState";
import Input from "@/components/ui/Input";
import Pagination from "@/components/ui/Pagination";
import SearchBox from "@/components/ui/SearchBox";
import Section from "@/components/ui/Section";
import Select from "@/components/ui/Select";
import Skeleton from "@/components/ui/Skeleton";
import Table, {
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/Table";
import useToast from "@/hooks/useToast";
import {
  createUserInvitation,
  deleteAdminUser,
  listUserInvitations,
  listAdminUsers,
  revokeUserInvitation,
  updateAdminUser,
  updateAdminUserRole,
  updateAdminUserStatus,
  UserAdminApiError,
  userRoles,
  type AdminUser,
  type UserInvitation,
  type UserRole,
} from "@/services/user-admin-service";

const PAGE_SIZE = 10;
const roleLabels: Record<UserRole, string> = {
  OWNER: "Proprietário",
  ADMIN: "Administrador",
  MANAGER: "Gerente",
  PROFESSIONAL: "Profissional",
  RECEPTIONIST: "Recepção",
  SALES: "Vendas",
  FINANCIAL: "Financeiro",
  VIEWER: "Visualizador",
};
const roleOptions = userRoles.map((role) => ({ value: role, label: roleLabels[role] }));
const filterRoleOptions = [{ value: "", label: "Todos os papéis" }, ...roleOptions];
const statusOptions = [
  { value: "", label: "Todos os estados" },
  { value: "true", label: "Ativos" },
  { value: "false", label: "Bloqueados" },
];

function errorMessage(error: unknown): string {
  if (!(error instanceof UserAdminApiError)) return "Ocorreu um erro inesperado.";
  if (error.status === 401) return "Sua sessão expirou. Entre novamente.";
  if (error.status === 403) return "Você não possui permissão para esta operação.";
  if (error.status === 404) return "O usuário não foi encontrado ou não pertence à empresa.";
  if (error.status === 409) return error.message || "A operação viola uma regra administrativa.";
  if (error.status === 422) return "Revise os dados informados e tente novamente.";
  return error.message;
}

function StatusBadge({ active }: { active: boolean }) {
  return (
    <Badge variant={active ? "success" : "danger"}>
      {active ? "Ativo" : "Bloqueado"}
    </Badge>
  );
}

export default function UsersPanel({ currentUser }: { currentUser: CurrentUser }) {
  const { toast } = useToast();
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [role, setRole] = useState("");
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reload, setReload] = useState(0);
  const [selected, setSelected] = useState<AdminUser | null>(null);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [editRole, setEditRole] = useState<UserRole>("VIEWER");
  const [saving, setSaving] = useState(false);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteName, setInviteName] = useState("");
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<UserRole>("VIEWER");
  const [invitations, setInvitations] = useState<UserInvitation[]>([]);
  const canUpdate = hasPermission(currentUser, "USERS", "UPDATE");
  const canManageRole = hasPermission(currentUser, "USERS", "MANAGE_ROLE");
  const canBlock = hasPermission(currentUser, "USERS", "BLOCK");
  const canDelete = hasPermission(currentUser, "USERS", "DELETE");
  const canCreate = hasPermission(currentUser, "USERS", "CREATE");

  useEffect(() => {
    if (!canCreate) return;
    let active = true;
    void listUserInvitations()
      .then((items) => active && setInvitations(items))
      .catch(() => undefined);
    return () => { active = false; };
  }, [canCreate, reload]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setDebouncedSearch(search.trim());
      setPage(1);
    }, 300);
    return () => window.clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    let active = true;
    const params = new URLSearchParams({ page: String(page), page_size: String(PAGE_SIZE) });
    if (debouncedSearch) params.set("search", debouncedSearch);
    if (role) params.set("role", role);
    if (status) params.set("is_active", status);
    const loadUsers = async () => {
      setLoading(true);
      setError(null);
      try {
        const result = await listAdminUsers(params);
        if (!active) return;
        setUsers(result.items);
        setTotal(result.total);
      } catch (reason) {
        if (active) setError(errorMessage(reason));
      } finally {
        if (active) setLoading(false);
      }
    };
    void loadUsers();
    return () => {
      active = false;
    };
  }, [debouncedSearch, page, reload, role, status]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const hasActions = canUpdate || canManageRole || canBlock || canDelete;
  const resultLabel = useMemo(
    () => `${total} ${total === 1 ? "usuário encontrado" : "usuários encontrados"}`,
    [total],
  );

  function openEditor(user: AdminUser) {
    setSelected(user);
    setName(user.name);
    setEmail(user.email);
    setEditRole(user.role);
  }

  async function saveEditor() {
    if (!selected) return;
    setSaving(true);
    try {
      if (canUpdate && (name.trim() !== selected.name || email.trim() !== selected.email)) {
        await updateAdminUser(selected.id, { name: name.trim(), email: email.trim() });
      }
      if (canManageRole && editRole !== selected.role) {
        await updateAdminUserRole(selected.id, editRole);
      }
      toast({ variant: "success", description: "Usuário atualizado com sucesso." });
      setSelected(null);
      setReload((value) => value + 1);
    } catch (reason) {
      toast({ variant: "danger", description: errorMessage(reason) });
    } finally {
      setSaving(false);
    }
  }

  async function toggleStatus(user: AdminUser) {
    if (user.is_active && !window.confirm(`Bloquear o acesso de ${user.name}?`)) return;
    try {
      await updateAdminUserStatus(user.id, !user.is_active);
      toast({
        variant: "success",
        description: user.is_active ? "Usuário bloqueado." : "Usuário reativado.",
      });
      setReload((value) => value + 1);
    } catch (reason) {
      toast({ variant: "danger", description: errorMessage(reason) });
    }
  }

  async function removeUser(user: AdminUser) {
    if (!window.confirm(`Remover o acesso de ${user.name}? Esta ação é uma exclusão lógica.`)) return;
    try {
      await deleteAdminUser(user.id);
      toast({ variant: "success", description: "Acesso do usuário removido." });
      setReload((value) => value + 1);
    } catch (reason) {
      toast({ variant: "danger", description: errorMessage(reason) });
    }
  }

  async function inviteUser() {
    setSaving(true);
    try {
      const invitation = await createUserInvitation({
        name: inviteName.trim(), email: inviteEmail.trim(), role: inviteRole,
      });
      toast({
        variant: invitation.delivery_status === "DELIVERED" ? "success" : "warning",
        description: invitation.delivery_status === "DELIVERED"
          ? "Convite enviado."
          : "Convite criado, mas o email não pôde ser entregue.",
      });
      setInviteOpen(false);
      setInviteName("");
      setInviteEmail("");
      setInviteRole("VIEWER");
      setReload((value) => value + 1);
    } catch (reason) {
      toast({ variant: "danger", description: errorMessage(reason) });
    } finally {
      setSaving(false);
    }
  }

  async function revokeInvitation(id: string) {
    try {
      await revokeUserInvitation(id);
      toast({ variant: "success", description: "Convite revogado." });
      setReload((value) => value + 1);
    } catch (reason) {
      toast({ variant: "danger", description: errorMessage(reason) });
    }
  }

  const actions = (user: AdminUser) => (
    <div className="flex flex-wrap gap-2">
      {(canUpdate || canManageRole) && (
        <Button variant="outline" size="sm" onClick={() => openEditor(user)}>Editar</Button>
      )}
      {canBlock && (
        <Button variant="ghost" size="sm" onClick={() => toggleStatus(user)}>
          {user.is_active ? "Bloquear" : "Reativar"}
        </Button>
      )}
      {canDelete && (
        <Button variant="danger" size="sm" onClick={() => removeUser(user)}>Remover</Button>
      )}
    </div>
  );

  return (
    <Section title="Usuários" description="Gerencie acesso, dados básicos e papéis da sua empresa.">
      <div className="space-y-5">
        {canCreate ? <div className="flex justify-end"><Button onClick={() => setInviteOpen(true)}>Convidar usuário</Button></div> : null}
        <div className="grid gap-4 lg:grid-cols-[minmax(16rem,1fr)_14rem_14rem]">
          <SearchBox
            label="Buscar usuários"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            onClear={() => setSearch("")}
            clearLabel="Limpar busca"
            placeholder="Nome ou email"
            loading={loading}
          />
          <Select label="Papel" options={filterRoleOptions} value={role} onChange={(event) => { setRole(event.target.value); setPage(1); }} />
          <Select label="Estado" options={statusOptions} value={status} onChange={(event) => { setStatus(event.target.value); setPage(1); }} />
        </div>

        {error ? (
          <Alert
            variant="danger"
            title="Não foi possível carregar os usuários"
            description={error}
            action={<Button variant="outline" size="sm" onClick={() => setReload((value) => value + 1)}>Tentar novamente</Button>}
          />
        ) : null}

        {loading ? (
          <div className="space-y-3" aria-label="Carregando usuários">
            <Skeleton height="3rem" />
            <Skeleton height="3rem" />
            <Skeleton height="3rem" />
          </div>
        ) : !error && users.length === 0 ? (
          <EmptyState title="Nenhum usuário encontrado" description="Ajuste a busca ou os filtros para consultar outros usuários." />
        ) : !error ? (
          <>
            <p className="text-sm text-hp-muted" aria-live="polite">{resultLabel}</p>
            <div className="hidden overflow-x-auto rounded-[var(--radius-lg)] border border-hp-border md:block">
              <Table>
                <TableHeader><TableRow><TableHead>Usuário</TableHead><TableHead>Papel</TableHead><TableHead>Estado</TableHead>{hasActions && <TableHead>Ações</TableHead>}</TableRow></TableHeader>
                <TableBody>
                  {users.map((user) => (
                    <TableRow key={user.id}>
                      <TableCell><div className="font-medium text-hp-foreground">{user.name}</div><div className="text-sm text-hp-muted">{user.email}</div></TableCell>
                      <TableCell>{roleLabels[user.role]}</TableCell>
                      <TableCell><StatusBadge active={user.is_active} /></TableCell>
                      {hasActions && <TableCell>{actions(user)}</TableCell>}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            <div className="grid gap-3 md:hidden">
              {users.map((user) => (
                <Card key={user.id} variant="outlined">
                  <div className="flex items-start justify-between gap-3"><div className="min-w-0"><h3 className="break-words font-semibold">{user.name}</h3><p className="break-all text-sm text-hp-muted">{user.email}</p></div><StatusBadge active={user.is_active} /></div>
                  <p className="mt-3 text-sm">{roleLabels[user.role]}</p>
                  {hasActions && <div className="mt-4">{actions(user)}</div>}
                </Card>
              ))}
            </div>
            <Pagination page={page} totalPages={totalPages} onPageChange={setPage} disabled={loading} />
            {canCreate && invitations.length ? (
              <div className="space-y-3">
                <h3 className="text-base font-semibold">Convites</h3>
                {invitations.map((invitation) => (
                  <Card key={invitation.id} variant="outlined" padding="sm">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div><p className="font-medium">{invitation.name}</p><p className="text-sm text-hp-muted">{invitation.email} · {roleLabels[invitation.role]}</p></div>
                      <div className="flex items-center gap-2">
                        <Badge variant={invitation.state === "PENDING" ? "info" : invitation.state === "DELIVERY_FAILED" ? "danger" : "neutral"}>{invitation.state}</Badge>
                        {["PENDING", "DELIVERY_FAILED"].includes(invitation.state) ? <Button variant="ghost" size="sm" onClick={() => revokeInvitation(invitation.id)}>Revogar</Button> : null}
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            ) : null}
          </>
        ) : null}
      </div>

      <Dialog open={selected !== null} onOpenChange={(open) => !open && setSelected(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar usuário</DialogTitle>
            <DialogDescription>Altere somente os dados autorizados para esta conta.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {canUpdate ? (
              <><Input label="Nome" value={name} onChange={(event) => setName(event.target.value)} required /><Input label="Email" type="email" value={email} onChange={(event) => setEmail(event.target.value)} required /></>
            ) : null}
            {canManageRole ? <Select label="Papel" options={roleOptions} value={editRole} onChange={(event) => setEditRole(event.target.value as UserRole)} /> : null}
          </div>
          <DialogFooter>
            <DialogClose className="inline-flex min-h-11 items-center justify-center rounded-[var(--radius-md)] px-4 font-semibold text-hp-foreground hover:bg-hp-surface-subtle">Cancelar</DialogClose>
            <Button loading={saving} onClick={saveEditor}>Salvar alterações</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <Dialog open={inviteOpen} onOpenChange={setInviteOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Convidar usuário</DialogTitle><DialogDescription>O convidado receberá um link para definir a própria senha.</DialogDescription></DialogHeader>
          <div className="space-y-4">
            <Input label="Nome" value={inviteName} onChange={(event) => setInviteName(event.target.value)} required />
            <Input label="Email" type="email" value={inviteEmail} onChange={(event) => setInviteEmail(event.target.value)} required />
            <Select label="Papel" options={currentUser.role === "OWNER" ? roleOptions : roleOptions.filter((option) => option.value !== "OWNER")} value={inviteRole} onChange={(event) => setInviteRole(event.target.value as UserRole)} />
          </div>
          <DialogFooter>
            <DialogClose className="inline-flex min-h-11 items-center justify-center rounded-[var(--radius-md)] px-4 font-semibold text-hp-foreground hover:bg-hp-surface-subtle">Cancelar</DialogClose>
            <Button loading={saving} disabled={!inviteName.trim() || !inviteEmail.trim()} onClick={inviteUser}>Enviar convite</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Section>
  );
}

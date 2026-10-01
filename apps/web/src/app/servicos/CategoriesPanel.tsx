"use client";

import { useEffect, useMemo, useState } from "react";

import { hasPermission, type CurrentUser } from "@/auth/types";
import Alert from "@/components/ui/Alert";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import Dialog, { DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/Dialog";
import DropdownMenu, { DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/DropdownMenu";
import EmptyState from "@/components/ui/EmptyState";
import Input from "@/components/ui/Input";
import Pagination from "@/components/ui/Pagination";
import SearchBox from "@/components/ui/SearchBox";
import Select from "@/components/ui/Select";
import Skeleton from "@/components/ui/Skeleton";
import Table, { TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/Table";
import Textarea from "@/components/ui/Textarea";
import useToast from "@/hooks/useToast";
import {
  createServiceCategory,
  deleteServiceCategory,
  listServiceCategories,
  ServiceCategoryApiError,
  updateServiceCategory,
  updateServiceCategoryStatus,
  type ServiceCategoryData,
} from "@/services/service-category-service";

const PAGE_SIZE = 10;
const statusOptions = [{ value: "", label: "Todos" }, { value: "true", label: "Ativos" }, { value: "false", label: "Inativos" }];

function message(error: unknown) {
  if (!(error instanceof ServiceCategoryApiError)) return "Ocorreu um erro inesperado.";
  if (error.status === 401) return "Sua sessão expirou. Entre novamente.";
  if (error.status === 403) return "Você não possui permissão para esta operação.";
  if (error.status === 404) return "A categoria não foi encontrada ou não pertence à empresa.";
  if (error.status === 409) return error.message;
  if (error.status === 422) return "Revise os dados informados e tente novamente.";
  return error.message;
}

export default function CategoriesPanel({ currentUser }: { currentUser: CurrentUser }) {
  const { toast } = useToast();
  const [items, setItems] = useState<ServiceCategoryData[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reload, setReload] = useState(0);
  const [editorOpen, setEditorOpen] = useState(false);
  const [editing, setEditing] = useState<ServiceCategoryData | null>(null);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [formError, setFormError] = useState<string | null>(null);
  const [statusTarget, setStatusTarget] = useState<ServiceCategoryData | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<ServiceCategoryData | null>(null);
  const [saving, setSaving] = useState(false);
  const canCreate = hasPermission(currentUser, "SERVICE_CATEGORIES", "CREATE");
  const canUpdate = hasPermission(currentUser, "SERVICE_CATEGORIES", "UPDATE");
  const canDelete = hasPermission(currentUser, "SERVICE_CATEGORIES", "DELETE");
  const hasActions = canUpdate || canDelete;

  useEffect(() => {
    const timer = window.setTimeout(() => { setDebouncedSearch(search.trim()); setPage(1); }, 300);
    return () => window.clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    let active = true;
    const params = new URLSearchParams({ page: String(page), page_size: String(PAGE_SIZE) });
    if (debouncedSearch) params.set("search", debouncedSearch);
    if (status) params.set("is_active", status);
    const load = async () => {
      setLoading(true); setError(null);
      try {
        const result = await listServiceCategories(params);
        if (active) { setItems(result.items); setTotal(result.total); }
      } catch (reason) { if (active) setError(message(reason)); }
      finally { if (active) setLoading(false); }
    };
    void load();
    return () => { active = false; };
  }, [debouncedSearch, page, reload, status]);

  const dirty = useMemo(() => editing
    ? name.trim() !== editing.name || (description.trim() || null) !== editing.description
    : Boolean(name.trim() || description.trim()), [description, editing, name]);

  function openCreate() { setEditing(null); setName(""); setDescription(""); setFormError(null); setEditorOpen(true); }
  function openEdit(item: ServiceCategoryData) { setEditing(item); setName(item.name); setDescription(item.description ?? ""); setFormError(null); setEditorOpen(true); }

  async function save() {
    if (!name.trim()) { setFormError("Informe o nome da categoria."); return; }
    setSaving(true); setFormError(null);
    try {
      const data = { name: name.trim(), description: description.trim() || null };
      if (editing) await updateServiceCategory(editing.id, data); else await createServiceCategory(data);
      toast({ variant: "success", description: editing ? "Categoria atualizada com sucesso." : "Categoria cadastrada com sucesso." });
      setEditorOpen(false); setReload((value) => value + 1);
    } catch (reason) { setFormError(message(reason)); }
    finally { setSaving(false); }
  }

  async function changeStatus() {
    if (!statusTarget) return;
    setSaving(true);
    try {
      await updateServiceCategoryStatus(statusTarget.id, !statusTarget.is_active);
      toast({ variant: "success", description: statusTarget.is_active ? "Categoria desativada." : "Categoria reativada." });
      setStatusTarget(null); setReload((value) => value + 1);
    } catch (reason) { toast({ variant: "danger", description: message(reason) }); }
    finally { setSaving(false); }
  }

  async function remove() {
    if (!deleteTarget) return;
    setSaving(true);
    try {
      await deleteServiceCategory(deleteTarget.id);
      toast({ variant: "success", description: "Categoria removida da operação." });
      setDeleteTarget(null); setReload((value) => value + 1);
    } catch (reason) { toast({ variant: "danger", description: message(reason) }); }
    finally { setSaving(false); }
  }

  const actions = (item: ServiceCategoryData) => hasActions ? <DropdownMenu>
    <DropdownMenuTrigger aria-label={`Ações de ${item.name}`} className="inline-flex size-10 items-center justify-center rounded-[var(--radius-md)] text-xl font-bold text-hp-muted hover:bg-hp-surface-subtle hover:text-hp-foreground focus-visible:outline-2 focus-visible:outline-hp-focus">•••</DropdownMenuTrigger>
    <DropdownMenuContent align="end">
      {canUpdate ? <DropdownMenuItem onSelect={() => openEdit(item)}>Editar categoria</DropdownMenuItem> : null}
      {canUpdate ? <DropdownMenuItem onSelect={() => setStatusTarget(item)}>{item.is_active ? "Desativar" : "Reativar"}</DropdownMenuItem> : null}
      {canDelete && canUpdate ? <DropdownMenuSeparator /> : null}
      {canDelete && item.has_services ? <DropdownMenuLabel>Remoção bloqueada: possui serviços</DropdownMenuLabel> : null}
      {canDelete ? <DropdownMenuItem variant="danger" disabled={item.has_services} onSelect={() => setDeleteTarget(item)}>Remover categoria</DropdownMenuItem> : null}
    </DropdownMenuContent>
  </DropdownMenu> : null;

  return <div className="space-y-6">
    <div className="flex justify-end">{canCreate ? <Button onClick={openCreate}>Nova categoria</Button> : null}</div>
    <section aria-label="Filtros de categorias" className="grid gap-4 md:grid-cols-[minmax(16rem,1fr)_12rem]"><SearchBox label="Buscar categorias" value={search} onChange={(event) => setSearch(event.target.value)} onClear={() => setSearch("")} clearLabel="Limpar busca" loading={loading} /><Select label="Status" options={statusOptions} value={status} onChange={(event) => { setStatus(event.target.value); setPage(1); }} /></section>
    {error ? <Alert variant="danger" title="Não foi possível carregar as categorias" description={error} action={<Button size="sm" variant="outline" onClick={() => setReload((value) => value + 1)}>Tentar novamente</Button>} /> : null}
    {loading ? <div className="space-y-3" aria-label="Carregando categorias"><Skeleton height="3rem" /><Skeleton height="3rem" /></div> : !error && items.length === 0 ? <EmptyState title="Nenhuma categoria cadastrada" description="Nenhuma categoria corresponde à busca e aos filtros atuais." action={canCreate ? <Button onClick={openCreate}>Cadastrar primeira categoria</Button> : undefined} /> : !error ? <>
      <p className="text-sm text-hp-muted" aria-live="polite">{total} {total === 1 ? "categoria encontrada" : "categorias encontradas"}</p>
      <div className="hidden md:block"><Table><TableHeader><TableRow><TableHead className="w-48">Nome</TableHead><TableHead>Descrição</TableHead><TableHead className="w-24">Status</TableHead>{hasActions ? <TableHead className="w-16 text-right"><span className="sr-only">Ações</span></TableHead> : null}</TableRow></TableHeader><TableBody>{items.map((item) => <TableRow key={item.id}><TableCell className="w-48 font-semibold">{item.name}</TableCell><TableCell>{item.description ?? "Sem descrição"}</TableCell><TableCell className="w-24"><Badge variant={item.is_active ? "success" : "neutral"}>{item.is_active ? "Ativa" : "Inativa"}</Badge></TableCell>{hasActions ? <TableCell className="w-16 text-right">{actions(item)}</TableCell> : null}</TableRow>)}</TableBody></Table></div>
      <div className="grid gap-4 md:hidden">{items.map((item) => <Card key={item.id} variant="outlined" padding="sm"><div className="flex h-full min-w-0 flex-col gap-3"><div className="flex justify-between gap-3"><h2 className="font-semibold">{item.name}</h2><Badge variant={item.is_active ? "success" : "neutral"}>{item.is_active ? "Ativa" : "Inativa"}</Badge></div><p className="text-sm text-hp-muted">{item.description ?? "Sem descrição"}</p><div className="mt-auto pt-1">{actions(item)}</div></div></Card>)}</div>
      {Math.ceil(total / PAGE_SIZE) > 1 ? <Pagination page={page} totalPages={Math.ceil(total / PAGE_SIZE)} onPageChange={setPage} /> : null}
    </> : null}
    <Dialog open={editorOpen} onOpenChange={setEditorOpen}><DialogContent><DialogHeader><DialogTitle>{editing ? "Editar categoria" : "Nova categoria"}</DialogTitle><DialogDescription>{editing ? "Atualize os dados da categoria." : "Cadastre uma categoria para organizar os serviços."}</DialogDescription></DialogHeader><div className="space-y-4"><Input label="Nome" required value={name} onChange={(event) => setName(event.target.value)} /><Textarea label="Descrição" value={description} onChange={(event) => setDescription(event.target.value)} />{formError ? <Alert variant="danger" description={formError} /> : null}</div><DialogFooter><DialogClose className="inline-flex min-h-11 items-center justify-center rounded-[var(--radius-md)] px-4 font-semibold hover:bg-hp-surface-subtle">Cancelar</DialogClose><Button loading={saving} disabled={!dirty} onClick={() => void save()}>{editing ? "Salvar alterações" : "Salvar"}</Button></DialogFooter></DialogContent></Dialog>
    <Dialog open={statusTarget !== null} onOpenChange={(open) => !open && setStatusTarget(null)}><DialogContent><DialogHeader><DialogTitle>{statusTarget?.is_active ? "Desativar categoria" : "Reativar categoria"}</DialogTitle><DialogDescription>{statusTarget?.is_active ? "A categoria ficará indisponível para novos serviços. Serviços existentes continuarão preservando a categoria." : "A categoria voltará a ficar disponível para novos serviços."}</DialogDescription></DialogHeader><DialogFooter><DialogClose className="inline-flex min-h-11 items-center justify-center rounded-[var(--radius-md)] px-4 font-semibold hover:bg-hp-surface-subtle">Cancelar</DialogClose><Button loading={saving} variant={statusTarget?.is_active ? "danger" : "primary"} onClick={() => void changeStatus()}>Confirmar</Button></DialogFooter></DialogContent></Dialog>
    <Dialog open={deleteTarget !== null} onOpenChange={(open) => !open && setDeleteTarget(null)}><DialogContent><DialogHeader><DialogTitle>Remover categoria</DialogTitle><DialogDescription>A categoria será removida da operação e não aparecerá em novos cadastros. Serviços existentes e seu histórico permanecerão preservados.</DialogDescription></DialogHeader><DialogFooter><DialogClose className="inline-flex min-h-11 items-center justify-center rounded-[var(--radius-md)] px-4 font-semibold hover:bg-hp-surface-subtle">Cancelar</DialogClose><Button loading={saving} variant="danger" onClick={() => void remove()}>Remover categoria</Button></DialogFooter></DialogContent></Dialog>
  </div>;
}

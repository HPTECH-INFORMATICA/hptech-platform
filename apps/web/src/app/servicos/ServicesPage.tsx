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
import PageHeader from "@/components/ui/PageHeader";
import Pagination from "@/components/ui/Pagination";
import SearchBox from "@/components/ui/SearchBox";
import Select from "@/components/ui/Select";
import Skeleton from "@/components/ui/Skeleton";
import Tabs, { TabsContent, TabsList, TabsTrigger } from "@/components/ui/Tabs";
import Table, {
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/Table";
import Textarea from "@/components/ui/Textarea";
import useToast from "@/hooks/useToast";
import { listServiceCategories, type ServiceCategoryData } from "@/services/service-category-service";
import {
  createService,
  deleteService,
  listServices,
  ServiceApiError,
  updateService,
  updateServiceStatus,
  type ServiceCreateInput,
  type ServiceData,
} from "@/services/service-service";

import CategoriesPanel from "./CategoriesPanel";

const PAGE_SIZE = 10;
const statusOptions = [
  { value: "", label: "Todos" },
  { value: "true", label: "Ativos" },
  { value: "false", label: "Inativos" },
];

type FormDraft = {
  name: string;
  description: string;
  duration: string;
  price: string;
  category: string;
};

const emptyDraft: FormDraft = {
  name: "",
  description: "",
  duration: "",
  price: "",
  category: "",
};

function draftFromService(service: ServiceData): FormDraft {
  return {
    name: service.name,
    description: service.description ?? "",
    duration: String(service.duration_minutes),
    price: service.price,
    category: service.category?.id ?? "",
  };
}

function payloadFromDraft(draft: FormDraft): ServiceCreateInput {
  return {
    name: draft.name.trim(),
    description: draft.description.trim() || null,
    duration_minutes: Number(draft.duration),
    price: draft.price.trim().replace(",", "."),
    category_id: draft.category || null,
  };
}

function validateDraft(draft: FormDraft): string | null {
  if (!draft.name.trim()) return "Informe o nome do serviço.";
  if (!/^\d+$/.test(draft.duration)) return "Informe a duração em minutos inteiros.";
  const duration = Number(draft.duration);
  if (duration < 1 || duration > 1440) {
    return "A duração deve ficar entre 1 e 1440 minutos.";
  }
  if (!/^\d+(?:[.,]\d{1,2})?$/.test(draft.price.trim())) {
    return "Informe um preço válido com até duas casas decimais.";
  }
  if (!draft.category) return "Selecione uma categoria.";
  return null;
}

function formatPrice(price: string): string {
  const [integer = "0", fraction = ""] = price.replace(",", ".").split(".");
  const grouped = integer.replace(/^0+(?=\d)/, "").replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  return `R$ ${grouped || "0"},${fraction.padEnd(2, "0").slice(0, 2)}`;
}

function errorMessage(error: unknown): string {
  if (!(error instanceof ServiceApiError)) return "Ocorreu um erro inesperado.";
  if (error.status === 401) return "Sua sessão expirou. Entre novamente.";
  if (error.status === 403) return "Você não possui permissão para esta operação.";
  if (error.status === 404) return "O serviço não foi encontrado ou não pertence à empresa.";
  if (error.status === 409) return error.message || "A operação entrou em conflito com o estado atual.";
  if (error.status === 422) return "Revise os dados informados e tente novamente.";
  if (error.status >= 500) return "O serviço está temporariamente indisponível. Tente novamente.";
  return error.message;
}

function StatusBadge({ active }: { active: boolean }) {
  return <Badge variant={active ? "success" : "neutral"}>{active ? "Ativo" : "Inativo"}</Badge>;
}

function ServicesCatalog({ currentUser }: { currentUser: CurrentUser }) {
  const { toast } = useToast();
  const [items, setItems] = useState<ServiceData[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [category, setCategory] = useState("");
  const [categories, setCategories] = useState<ServiceCategoryData[]>([]);
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reload, setReload] = useState(0);
  const [editorOpen, setEditorOpen] = useState(false);
  const [editing, setEditing] = useState<ServiceData | null>(null);
  const [draft, setDraft] = useState<FormDraft>(emptyDraft);
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [statusTarget, setStatusTarget] = useState<ServiceData | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<ServiceData | null>(null);

  const canCreate = hasPermission(currentUser, "SERVICES", "CREATE");
  const canUpdate = hasPermission(currentUser, "SERVICES", "UPDATE");
  const canDelete = hasPermission(currentUser, "SERVICES", "DELETE");
  const hasActions = canUpdate || canDelete;
  const canCreateCategory = hasPermission(currentUser, "SERVICE_CATEGORIES", "CREATE");

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setDebouncedSearch(search.trim());
      setPage(1);
    }, 300);
    return () => window.clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    let active = true;
    void listServiceCategories(new URLSearchParams({ page: "1", page_size: "100", is_active: "true" }))
      .then((result) => { if (active) setCategories(result.items); })
      .catch(() => { if (active) setCategories([]); });
    return () => { active = false; };
  }, [reload]);

  useEffect(() => {
    let active = true;
    const params = new URLSearchParams({ page: String(page), page_size: String(PAGE_SIZE) });
    if (debouncedSearch) params.set("search", debouncedSearch);
    if (category) params.set("category_id", category);
    if (status) params.set("is_active", status);
    const loadServices = async () => {
      setLoading(true);
      setError(null);
      try {
        const result = await listServices(params);
        if (!active) return;
        setItems(result.items);
        setTotal(result.total);
      } catch (reason) {
        if (active) setError(errorMessage(reason));
      } finally {
        if (active) setLoading(false);
      }
    };
    void loadServices();
    return () => { active = false; };
  }, [category, debouncedSearch, page, reload, status]);

  const initialPayload = useMemo(
    () => (editing ? payloadFromDraft(draftFromService(editing)) : null),
    [editing],
  );
  const currentPayload = payloadFromDraft(draft);
  const dirty = editing
    ? JSON.stringify(currentPayload) !== JSON.stringify(initialPayload)
    : Object.values(draft).some((value) => value.trim() !== "");
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  function openCreate() {
    setEditing(null);
    setDraft(emptyDraft);
    setFormError(null);
    setEditorOpen(true);
  }

  function openEdit(service: ServiceData) {
    setEditing(service);
    setDraft(draftFromService(service));
    setFormError(null);
    setEditorOpen(true);
  }

  function updateDraft(field: keyof FormDraft, value: string) {
    setDraft((current) => ({ ...current, [field]: value }));
  }

  async function save() {
    const validation = validateDraft(draft);
    if (validation) {
      setFormError(validation);
      return;
    }
    setSaving(true);
    setFormError(null);
    try {
      if (editing) await updateService(editing.id, payloadFromDraft(draft));
      else await createService(payloadFromDraft(draft));
      toast({ variant: "success", description: editing ? "Serviço atualizado com sucesso." : "Serviço cadastrado com sucesso." });
      setEditorOpen(false);
      setReload((value) => value + 1);
    } catch (reason) {
      setFormError(errorMessage(reason));
    } finally {
      setSaving(false);
    }
  }

  async function confirmStatus() {
    if (!statusTarget) return;
    setSaving(true);
    try {
      await updateServiceStatus(statusTarget.id, !statusTarget.is_active);
      toast({ variant: "success", description: statusTarget.is_active ? "Serviço desativado." : "Serviço reativado." });
      setStatusTarget(null);
      setReload((value) => value + 1);
    } catch (reason) {
      toast({ variant: "danger", description: errorMessage(reason) });
    } finally {
      setSaving(false);
    }
  }

  async function confirmDelete() {
    if (!deleteTarget) return;
    setSaving(true);
    try {
      await deleteService(deleteTarget.id);
      toast({ variant: "success", description: "Serviço removido da operação." });
      setDeleteTarget(null);
      setReload((value) => value + 1);
    } catch (reason) {
      toast({ variant: "danger", description: errorMessage(reason) });
    } finally {
      setSaving(false);
    }
  }

  const actions = (service: ServiceData) => hasActions ? (
    <div className="flex flex-wrap gap-2">
      {canUpdate ? <Button size="sm" variant="ghost" onClick={() => openEdit(service)}>Editar</Button> : null}
      {canUpdate ? <Button size="sm" variant="outline" onClick={() => setStatusTarget(service)}>{service.is_active ? "Desativar" : "Reativar"}</Button> : null}
      {canDelete ? <Button size="sm" variant="danger" onClick={() => setDeleteTarget(service)}>Remover</Button> : null}
    </div>
  ) : null;

  return (
    <div className="space-y-8">
      <div className="flex justify-end">{canCreate ? <Button disabled={categories.length === 0} onClick={openCreate}>Novo serviço</Button> : null}</div>
      {categories.length === 0 ? <Alert variant="info" title="Nenhuma categoria ativa disponível" description={canCreateCategory ? "Cadastre ou reative uma categoria antes de criar um serviço." : "Solicite a um usuário autorizado o cadastro ou a reativação de uma categoria."} /> : null}

      <section aria-label="Filtros de serviços" className="grid gap-4 lg:grid-cols-[minmax(16rem,1fr)_minmax(12rem,18rem)_12rem]">
        <SearchBox label="Buscar serviços" value={search} onChange={(event) => setSearch(event.target.value)} onClear={() => setSearch("")} clearLabel="Limpar busca" placeholder="Nome ou categoria" loading={loading} />
        <Select label="Categoria" options={[{ value: "", label: "Todas" }, ...categories.map((item) => ({ value: item.id, label: item.name }))]} value={category} onChange={(event) => { setCategory(event.target.value); setPage(1); }} />
        <Select label="Status" options={statusOptions} value={status} onChange={(event) => { setStatus(event.target.value); setPage(1); }} />
      </section>

      {error ? <Alert variant="danger" title="Não foi possível carregar os serviços" description={error} action={<Button variant="outline" size="sm" onClick={() => setReload((value) => value + 1)}>Tentar novamente</Button>} /> : null}

      {loading ? (
        <div className="space-y-3" aria-label="Carregando serviços"><Skeleton height="3rem" /><Skeleton height="3rem" /><Skeleton height="3rem" /></div>
      ) : !error && items.length === 0 ? (
        <EmptyState title="Nenhum serviço cadastrado" description="Nenhum serviço corresponde à busca e aos filtros atuais." action={canCreate ? <Button onClick={openCreate}>Cadastrar primeiro serviço</Button> : undefined} />
      ) : !error ? (
        <>
          <p className="text-sm text-hp-muted" aria-live="polite">{total} {total === 1 ? "serviço encontrado" : "serviços encontrados"}</p>
          <div className="hidden md:block">
            <Table>
              <TableHeader><TableRow><TableHead>Nome</TableHead><TableHead>Categoria</TableHead><TableHead>Duração</TableHead><TableHead>Preço</TableHead><TableHead>Status</TableHead>{hasActions ? <TableHead>Ações</TableHead> : null}</TableRow></TableHeader>
              <TableBody>{items.map((service) => <TableRow key={service.id}><TableCell><span className="font-semibold">{service.name}</span>{service.description ? <span className="mt-1 block text-sm text-hp-muted">{service.description}</span> : null}</TableCell><TableCell>{service.category?.name ?? "Sem categoria"}</TableCell><TableCell>{service.duration_minutes} min</TableCell><TableCell>{formatPrice(service.price)}</TableCell><TableCell><StatusBadge active={service.is_active} /></TableCell>{hasActions ? <TableCell>{actions(service)}</TableCell> : null}</TableRow>)}</TableBody>
            </Table>
          </div>
          <div className="grid gap-4 md:hidden">{items.map((service) => <Card key={service.id} variant="outlined" padding="sm"><div className="flex h-full min-w-0 flex-col gap-3"><div className="flex items-start justify-between gap-3"><div className="min-w-0"><h2 className="break-words font-semibold text-hp-foreground">{service.name}</h2>{service.description ? <p className="mt-1 break-words text-sm text-hp-muted">{service.description}</p> : null}</div><StatusBadge active={service.is_active} /></div><dl className="grid grid-cols-2 gap-3 text-sm"><div><dt className="text-hp-muted">Categoria</dt><dd>{service.category?.name ?? "Sem categoria"}</dd></div><div><dt className="text-hp-muted">Duração</dt><dd>{service.duration_minutes} min</dd></div><div><dt className="text-hp-muted">Preço</dt><dd>{formatPrice(service.price)}</dd></div></dl><div className="mt-auto pt-1">{actions(service)}</div></div></Card>)}</div>
          {totalPages > 1 ? <Pagination page={page} totalPages={totalPages} onPageChange={setPage} /> : null}
        </>
      ) : null}

      <Dialog open={editorOpen} onOpenChange={setEditorOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editing ? "Editar serviço" : "Novo serviço"}</DialogTitle><DialogDescription>{editing ? "Atualize os dados operacionais do serviço." : "Cadastre um serviço oferecido pela empresa."}</DialogDescription></DialogHeader>
          <div className="space-y-4">
            <Input label="Nome" required value={draft.name} onChange={(event) => updateDraft("name", event.target.value)} />
            <Textarea label="Descrição" value={draft.description} onChange={(event) => updateDraft("description", event.target.value)} />
            <div className="grid gap-4 sm:grid-cols-2"><Input label="Duração em minutos" required inputMode="numeric" value={draft.duration} onChange={(event) => updateDraft("duration", event.target.value)} /><Input label="Preço" required inputMode="decimal" value={draft.price} onChange={(event) => updateDraft("price", event.target.value)} description="Use vírgula ou ponto e até duas casas decimais." /></div>
            <Select label="Categoria" required value={draft.category} onChange={(event) => updateDraft("category", event.target.value)} options={[
              { value: "", label: "Selecione uma categoria" },
              ...categories.map((item) => ({ value: item.id, label: item.name })),
              ...(editing?.category && !editing.category.is_active && !categories.some((item) => item.id === editing.category?.id)
                ? [{ value: editing.category.id, label: `${editing.category.name} (inativa)` }]
                : []),
            ]} />
            {formError ? <Alert variant="danger" description={formError} /> : null}
          </div>
          <DialogFooter><DialogClose className="inline-flex min-h-11 items-center justify-center rounded-[var(--radius-md)] px-4 font-semibold text-hp-foreground hover:bg-hp-surface-subtle">Cancelar</DialogClose><Button loading={saving} disabled={!dirty} onClick={() => void save()}>Salvar</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={statusTarget !== null} onOpenChange={(open) => !open && setStatusTarget(null)}>
        <DialogContent><DialogHeader><DialogTitle>{statusTarget?.is_active ? "Desativar serviço" : "Reativar serviço"}</DialogTitle><DialogDescription>Confirme a alteração de status de {statusTarget?.name}.</DialogDescription></DialogHeader><DialogFooter><DialogClose className="inline-flex min-h-11 items-center justify-center rounded-[var(--radius-md)] px-4 font-semibold text-hp-foreground hover:bg-hp-surface-subtle">Cancelar</DialogClose><Button loading={saving} variant={statusTarget?.is_active ? "danger" : "primary"} onClick={() => void confirmStatus()}>Confirmar</Button></DialogFooter></DialogContent>
      </Dialog>

      <Dialog open={deleteTarget !== null} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <DialogContent><DialogHeader><DialogTitle>Remover serviço</DialogTitle><DialogDescription>O serviço será removido da operação e deixará de aparecer nas listagens normais. O histórico será preservado.</DialogDescription></DialogHeader><DialogFooter><DialogClose className="inline-flex min-h-11 items-center justify-center rounded-[var(--radius-md)] px-4 font-semibold text-hp-foreground hover:bg-hp-surface-subtle">Cancelar</DialogClose><Button loading={saving} variant="danger" onClick={() => void confirmDelete()}>Remover serviço</Button></DialogFooter></DialogContent>
      </Dialog>
    </div>
  );
}

export default function ServicesPage({ currentUser }: { currentUser: CurrentUser }) {
  const canViewCategories = hasPermission(currentUser, "SERVICE_CATEGORIES", "VIEW");

  return <div className="space-y-8">
    <PageHeader title="Serviços" description="Cadastro dos serviços oferecidos pela empresa." />
    {canViewCategories ? <Tabs defaultValue="services">
      <TabsList><TabsTrigger value="services">Serviços</TabsTrigger><TabsTrigger value="categories">Categorias</TabsTrigger></TabsList>
      <TabsContent value="services"><ServicesCatalog currentUser={currentUser} /></TabsContent>
      <TabsContent value="categories"><CategoriesPanel currentUser={currentUser} /></TabsContent>
    </Tabs> : <ServicesCatalog currentUser={currentUser} />}
  </div>;
}

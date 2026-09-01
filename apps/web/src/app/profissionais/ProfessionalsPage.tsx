"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";

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
import Table, {
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/Table";
import useToast from "@/hooks/useToast";
import {
  createProfessional,
  deleteProfessional,
  listProfessionals,
  listProfessionalUserCandidates,
  ProfessionalApiError,
  updateProfessional,
  updateProfessionalStatus,
  type ProfessionalData,
  type ProfessionalInput,
  type ProfessionalUserCandidate,
} from "@/services/professional-service";

const PAGE_SIZE = 10;
const CANDIDATE_PAGE_SIZE = 10;
const statusOptions = [
  { value: "", label: "Todos" },
  { value: "true", label: "Ativos" },
  { value: "false", label: "Inativos" },
];

type FormDraft = {
  displayName: string;
  userId: string;
};

const emptyDraft: FormDraft = { displayName: "", userId: "" };

function normalizeName(value: string): string {
  return value.trim().replace(/\s+/g, " ");
}

function payloadFromDraft(draft: FormDraft): ProfessionalInput {
  return {
    display_name: normalizeName(draft.displayName),
    user_id: draft.userId || null,
  };
}

function draftFromProfessional(professional: ProfessionalData): FormDraft {
  return {
    displayName: professional.display_name,
    userId: professional.user_id ?? "",
  };
}

function errorMessage(error: unknown): string {
  if (!(error instanceof ProfessionalApiError)) {
    return "Ocorreu um erro inesperado.";
  }
  if (error.status === 401) return "Sua sessão expirou. Entre novamente.";
  if (error.status === 403) return "Você não possui permissão para esta operação.";
  if (error.status === 404) {
    return "O profissional ou a conta selecionada não foi encontrado nesta empresa.";
  }
  if (error.status === 409) return error.message;
  if (error.status === 422) return "Revise os dados informados e tente novamente.";
  if (error.status >= 500) {
    return "O serviço está temporariamente indisponível. Tente novamente.";
  }
  return error.message;
}

function StatusBadge({ active }: { active: boolean }) {
  return (
    <Badge variant={active ? "success" : "neutral"}>
      {active ? "Ativo" : "Inativo"}
    </Badge>
  );
}

export default function ProfessionalsPage({ currentUser }: { currentUser: CurrentUser }) {
  const { toast } = useToast();
  const [items, setItems] = useState<ProfessionalData[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reload, setReload] = useState(0);

  const [editorOpen, setEditorOpen] = useState(false);
  const [editing, setEditing] = useState<ProfessionalData | null>(null);
  const [draft, setDraft] = useState<FormDraft>(emptyDraft);
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [statusTarget, setStatusTarget] = useState<ProfessionalData | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<ProfessionalData | null>(null);

  const [candidateSearch, setCandidateSearch] = useState("");
  const [debouncedCandidateSearch, setDebouncedCandidateSearch] = useState("");
  const [candidatePage, setCandidatePage] = useState(1);
  const [candidateItems, setCandidateItems] = useState<ProfessionalUserCandidate[]>([]);
  const [candidateTotal, setCandidateTotal] = useState(0);
  const [candidateLoading, setCandidateLoading] = useState(false);
  const [candidateError, setCandidateError] = useState<string | null>(null);
  const [candidateReload, setCandidateReload] = useState(0);
  const [selectedCandidate, setSelectedCandidate] =
    useState<ProfessionalUserCandidate | null>(null);

  const canCreate = hasPermission(currentUser, "PROFESSIONALS", "CREATE");
  const canUpdate = hasPermission(currentUser, "PROFESSIONALS", "UPDATE");
  const canDelete = hasPermission(currentUser, "PROFESSIONALS", "DELETE");
  useEffect(() => {
    const timer = window.setTimeout(() => {
      setDebouncedSearch(search.trim());
      setPage(1);
    }, 300);
    return () => window.clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    let active = true;
    const params = new URLSearchParams({
      page: String(page),
      page_size: String(PAGE_SIZE),
    });
    if (debouncedSearch) params.set("search", debouncedSearch);
    if (statusFilter) params.set("is_active", statusFilter);

    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const result = await listProfessionals(params);
        if (!active) return;
        setItems(result.items);
        setTotal(result.total);
      } catch (reason) {
        if (active) setError(errorMessage(reason));
      } finally {
        if (active) setLoading(false);
      }
    };
    void load();
    return () => {
      active = false;
    };
  }, [debouncedSearch, page, reload, statusFilter]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setDebouncedCandidateSearch(candidateSearch.trim());
      setCandidatePage(1);
    }, 300);
    return () => window.clearTimeout(timer);
  }, [candidateSearch]);

  useEffect(() => {
    if (!editorOpen) return;
    let active = true;
    const params = new URLSearchParams({
      page: String(candidatePage),
      page_size: String(CANDIDATE_PAGE_SIZE),
    });
    if (debouncedCandidateSearch) params.set("search", debouncedCandidateSearch);
    if (editing) params.set("professional_id", editing.id);

    const loadCandidates = async () => {
      setCandidateLoading(true);
      setCandidateError(null);
      try {
        const result = await listProfessionalUserCandidates(params);
        if (!active) return;
        setCandidateItems(result.items);
        setCandidateTotal(result.total);
        const selected = result.items.find((item) => item.id === draft.userId);
        if (selected) setSelectedCandidate(selected);
      } catch (reason) {
        if (active) setCandidateError(errorMessage(reason));
      } finally {
        if (active) setCandidateLoading(false);
      }
    };
    void loadCandidates();
    return () => {
      active = false;
    };
  }, [candidatePage, candidateReload, debouncedCandidateSearch, draft.userId, editing, editorOpen]);

  const currentPayload = payloadFromDraft(draft);
  const initialPayload = useMemo(
    () => (editing ? payloadFromDraft(draftFromProfessional(editing)) : null),
    [editing],
  );
  const dirty = editing
    ? JSON.stringify(currentPayload) !== JSON.stringify(initialPayload)
    : Boolean(currentPayload.display_name || currentPayload.user_id);
  const valid = currentPayload.display_name.length > 0;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const candidateTotalPages = Math.max(
    1,
    Math.ceil(candidateTotal / CANDIDATE_PAGE_SIZE),
  );
  const candidatePool =
    selectedCandidate && !candidateItems.some((item) => item.id === selectedCandidate.id)
      ? [selectedCandidate, ...candidateItems]
      : candidateItems;
  const currentLinkUnavailable = Boolean(
    draft.userId && !candidatePool.some((item) => item.id === draft.userId),
  );
  const candidateOptions = [
    { value: "", label: "Sem conta vinculada" },
    ...(currentLinkUnavailable
      ? [
          {
            value: draft.userId,
            label: "Conta atualmente vinculada (indisponÃ­vel)",
          },
        ]
      : []),
    ...candidatePool.map((item) => ({
      value: item.id,
      label: `${item.name} — ${item.email}`,
    })),
  ];

  function resetCandidateState() {
    setCandidateSearch("");
    setDebouncedCandidateSearch("");
    setCandidatePage(1);
    setCandidateItems([]);
    setCandidateTotal(0);
    setCandidateError(null);
    setCandidateReload(0);
    setSelectedCandidate(null);
  }

  function openCreate() {
    setEditing(null);
    setDraft(emptyDraft);
    setFormError(null);
    resetCandidateState();
    setEditorOpen(true);
  }

  function openEdit(professional: ProfessionalData) {
    setEditing(professional);
    setDraft(draftFromProfessional(professional));
    setFormError(null);
    resetCandidateState();
    setEditorOpen(true);
  }

  function closeEditor() {
    setEditorOpen(false);
    setEditing(null);
    setDraft(emptyDraft);
    setFormError(null);
    resetCandidateState();
  }

  async function save() {
    if (!valid || !dirty) return;
    setSaving(true);
    setFormError(null);
    try {
      if (editing) await updateProfessional(editing.id, currentPayload);
      else await createProfessional(currentPayload);
      toast({
        variant: "success",
        description: editing
          ? "Profissional atualizado com sucesso."
          : "Profissional cadastrado com sucesso.",
      });
      closeEditor();
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
      await updateProfessionalStatus(statusTarget.id, !statusTarget.is_active);
      toast({
        variant: "success",
        description: statusTarget.is_active
          ? "Profissional inativado."
          : "Profissional reativado.",
      });
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
      await deleteProfessional(deleteTarget.id);
      toast({ variant: "success", description: "Profissional removido da operação." });
      setDeleteTarget(null);
      setReload((value) => value + 1);
    } catch (reason) {
      toast({ variant: "danger", description: errorMessage(reason) });
    } finally {
      setSaving(false);
    }
  }

  function actions(professional: ProfessionalData) {
    return (
      <div className="flex flex-wrap gap-2">
        <Link
          href={`/profissionais/${encodeURIComponent(professional.id)}/disponibilidade`}
          className="inline-flex min-h-11 items-center justify-center rounded-[var(--radius-md)] px-3 text-sm font-semibold text-hp-primary outline-none transition-colors hover:bg-hp-primary-soft focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-hp-focus sm:min-h-9"
        >
          Disponibilidade
        </Link>
        {canUpdate ? (
          <Button size="sm" variant="ghost" onClick={() => openEdit(professional)}>
            Editar
          </Button>
        ) : null}
        {canUpdate ? (
          <Button
            size="sm"
            variant="outline"
            onClick={() => setStatusTarget(professional)}
          >
            {professional.is_active ? "Inativar" : "Reativar"}
          </Button>
        ) : null}
        {canDelete ? (
          <Button
            size="sm"
            variant="danger"
            onClick={() => setDeleteTarget(professional)}
          >
            Remover
          </Button>
        ) : null}
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <PageHeader
        title="Profissionais"
        description="Cadastro dos profissionais operacionais da empresa."
        actions={canCreate ? <Button onClick={openCreate}>Novo profissional</Button> : undefined}
      />

      <section
        aria-label="Filtros de profissionais"
        className="grid gap-4 md:grid-cols-[minmax(16rem,1fr)_12rem]"
      >
        <SearchBox
          label="Buscar profissionais"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          onClear={() => setSearch("")}
          clearLabel="Limpar busca"
          placeholder="Nome de exibição"
          loading={loading}
        />
        <Select
          label="Status"
          options={statusOptions}
          value={statusFilter}
          onChange={(event) => {
            setStatusFilter(event.target.value);
            setPage(1);
          }}
        />
      </section>

      {error ? (
        <Alert
          variant="danger"
          title="Não foi possível carregar os profissionais"
          description={error}
          action={
            <Button
              variant="outline"
              size="sm"
              onClick={() => setReload((value) => value + 1)}
            >
              Tentar novamente
            </Button>
          }
        />
      ) : null}

      {loading ? (
        <div className="space-y-3" aria-label="Carregando profissionais">
          <Skeleton height="3rem" />
          <Skeleton height="3rem" />
          <Skeleton height="3rem" />
        </div>
      ) : !error && items.length === 0 ? (
        <EmptyState
          title="Nenhum profissional cadastrado"
          description="Nenhum profissional corresponde à busca e aos filtros atuais."
          action={
            canCreate ? <Button onClick={openCreate}>Cadastrar primeiro profissional</Button> : undefined
          }
        />
      ) : !error ? (
        <>
          <p className="text-sm text-hp-muted" aria-live="polite">
            {total} {total === 1 ? "profissional encontrado" : "profissionais encontrados"}
          </p>
          <div className="hidden md:block">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>Conta de acesso</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((professional) => (
                  <TableRow key={professional.id}>
                    <TableCell>
                      <span className="font-semibold">{professional.display_name}</span>
                    </TableCell>
                    <TableCell>
                      {professional.user_id ? "Vinculado" : "Sem conta vinculada"}
                    </TableCell>
                    <TableCell><StatusBadge active={professional.is_active} /></TableCell>
                    <TableCell>{actions(professional)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          <div className="grid min-w-0 gap-4 md:hidden">
            {items.map((professional) => (
              <Card key={professional.id} variant="outlined" padding="sm">
                <div className="space-y-4">
                  <div className="flex min-w-0 items-start justify-between gap-3">
                    <h2 className="min-w-0 break-words font-semibold text-hp-foreground">
                      {professional.display_name}
                    </h2>
                    <StatusBadge active={professional.is_active} />
                  </div>
                  <p className="text-sm text-hp-muted">
                    {professional.user_id ? "Conta vinculada" : "Sem conta vinculada"}
                  </p>
                  {actions(professional)}
                </div>
              </Card>
            ))}
          </div>
          {totalPages > 1 ? (
            <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
          ) : null}
        </>
      ) : null}

      <Dialog
        open={editorOpen}
        onOpenChange={(open) => {
          if (!open) closeEditor();
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? "Editar profissional" : "Novo profissional"}</DialogTitle>
            <DialogDescription>
              {editing
                ? "Atualize os dados operacionais e o vínculo opcional de acesso."
                : "Cadastre um profissional, com ou sem conta de acesso vinculada."}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <Input
              label="Nome de exibição"
              required
              value={draft.displayName}
              onChange={(event) =>
                setDraft((current) => ({ ...current, displayName: event.target.value }))
              }
              maxLength={150}
            />
            <SearchBox
              label="Buscar conta para vínculo"
              value={candidateSearch}
              onChange={(event) => setCandidateSearch(event.target.value)}
              onClear={() => setCandidateSearch("")}
              clearLabel="Limpar busca de contas"
              placeholder="Nome ou email"
              loading={candidateLoading}
              description="A busca inclui somente contas elegíveis desta empresa."
            />
            <Select
              label="Conta de acesso (opcional)"
              options={candidateOptions}
              value={draft.userId}
              disabled={candidateLoading && candidateItems.length === 0}
              onChange={(event) => {
                const userId = event.target.value;
                setDraft((current) => ({ ...current, userId }));
                setSelectedCandidate(
                  candidateItems.find((item) => item.id === userId) ?? null,
                );
              }}
            />
            {candidateError ? (
              <Alert
                variant="danger"
                description={candidateError}
                action={
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setCandidateReload((value) => value + 1)}
                  >
                    Tentar novamente
                  </Button>
                }
              />
            ) : null}
            {candidateTotalPages > 1 ? (
              <Pagination
                page={candidatePage}
                totalPages={candidateTotalPages}
                onPageChange={setCandidatePage}
                disabled={candidateLoading}
              />
            ) : null}
            {formError ? <Alert variant="danger" description={formError} /> : null}
          </div>
          <DialogFooter>
            <DialogClose className="inline-flex min-h-11 items-center justify-center rounded-[var(--radius-md)] px-4 font-semibold text-hp-foreground hover:bg-hp-surface-subtle">
              Cancelar
            </DialogClose>
            <Button loading={saving} disabled={!valid || !dirty} onClick={() => void save()}>
              Salvar alterações
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={statusTarget !== null}
        onOpenChange={(open) => !open && setStatusTarget(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {statusTarget?.is_active ? "Inativar profissional" : "Reativar profissional"}
            </DialogTitle>
            <DialogDescription>
              Confirme a alteração de status de {statusTarget?.display_name}. Inativar não remove o cadastro.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <DialogClose className="inline-flex min-h-11 items-center justify-center rounded-[var(--radius-md)] px-4 font-semibold text-hp-foreground hover:bg-hp-surface-subtle">
              Cancelar
            </DialogClose>
            <Button
              loading={saving}
              variant={statusTarget?.is_active ? "danger" : "primary"}
              onClick={() => void confirmStatus()}
            >
              Confirmar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={deleteTarget !== null}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Remover profissional</DialogTitle>
            <DialogDescription>
              O profissional será removido da operação por exclusão lógica. A conta de acesso vinculada não será apagada.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <DialogClose className="inline-flex min-h-11 items-center justify-center rounded-[var(--radius-md)] px-4 font-semibold text-hp-foreground hover:bg-hp-surface-subtle">
              Cancelar
            </DialogClose>
            <Button loading={saving} variant="danger" onClick={() => void confirmDelete()}>
              Remover profissional
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

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
import DatePicker from "@/components/ui/DatePicker";
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
import Textarea from "@/components/ui/Textarea";
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
const CANDIDATE_PAGE_SIZE = 100;
const statusOptions = [
  { value: "", label: "Todos" },
  { value: "true", label: "Ativos" },
  { value: "false", label: "Inativos" },
];

type FormDraft = {
  displayName: string;
  fullName: string;
  socialName: string;
  cpf: string;
  birthDate: string;
  email: string;
  phone: string;
  whatsapp: string;
  profession: string;
  category: string;
  administrativeNotes: string;
  userId: string;
};

const emptyDraft: FormDraft = {
  displayName: "",
  fullName: "",
  socialName: "",
  cpf: "",
  birthDate: "",
  email: "",
  phone: "",
  whatsapp: "",
  profession: "",
  category: "",
  administrativeNotes: "",
  userId: "",
};

function normalizeName(value: string): string {
  return value.trim().replace(/\s+/g, " ");
}

function optionalValue(value: string): string | null {
  return value.trim() || null;
}

function payloadFromDraft(draft: FormDraft): ProfessionalInput {
  return {
    display_name: normalizeName(draft.displayName),
    full_name: normalizeName(draft.fullName),
    social_name: optionalValue(draft.socialName),
    cpf: optionalValue(draft.cpf),
    birth_date: optionalValue(draft.birthDate),
    email: optionalValue(draft.email)?.toLowerCase() ?? null,
    phone: optionalValue(draft.phone),
    whatsapp: optionalValue(draft.whatsapp),
    profession: optionalValue(draft.profession),
    category: optionalValue(draft.category),
    administrative_notes: optionalValue(draft.administrativeNotes),
    user_id: draft.userId || null,
  };
}

function draftFromProfessional(professional: ProfessionalData): FormDraft {
  return {
    displayName: professional.display_name,
    fullName: professional.full_name,
    socialName: professional.social_name ?? "",
    cpf: professional.cpf ?? "",
    birthDate: professional.birth_date ?? "",
    email: professional.email ?? "",
    phone: professional.phone ?? "",
    whatsapp: professional.whatsapp ?? "",
    profession: professional.profession ?? "",
    category: professional.category ?? "",
    administrativeNotes: professional.administrative_notes ?? "",
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

type ProfessionalsPageProps = {
  currentUser: CurrentUser;
  maxBirthDate: string;
};

export default function ProfessionalsPage({
  currentUser,
  maxBirthDate,
}: ProfessionalsPageProps) {
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

  const [candidateItems, setCandidateItems] = useState<ProfessionalUserCandidate[]>([]);
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
    if (!editorOpen) return;
    let active = true;
    const params = new URLSearchParams({
      page: "1",
      page_size: String(CANDIDATE_PAGE_SIZE),
    });
    if (editing) params.set("professional_id", editing.id);

    const loadCandidates = async () => {
      setCandidateLoading(true);
      setCandidateError(null);
      try {
        const result = await listProfessionalUserCandidates(params);
        if (!active) return;
        setCandidateItems(result.items);
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
  }, [candidateReload, draft.userId, editing, editorOpen]);

  const currentPayload = payloadFromDraft(draft);
  const initialPayload = useMemo(
    () => (editing ? payloadFromDraft(draftFromProfessional(editing)) : null),
    [editing],
  );
  const dirty = editing
    ? JSON.stringify(currentPayload) !== JSON.stringify(initialPayload)
    : Boolean(currentPayload.display_name || currentPayload.full_name);
  const valid =
    currentPayload.display_name.length > 0 &&
    currentPayload.full_name.length > 0 &&
    (!currentPayload.birth_date || currentPayload.birth_date <= maxBirthDate);
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
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
    setCandidateItems([]);
    setCandidateError(null);
    setCandidateReload(0);
    setSelectedCandidate(null);
  }

  function updateDraft(field: keyof FormDraft, value: string) {
    setDraft((current) => ({ ...current, [field]: value }));
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
          placeholder="Nome, CPF, email ou profissão"
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
                  <TableHead>Profissão / categoria</TableHead>
                  <TableHead>Contato</TableHead>
                  <TableHead>Conta de acesso</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((professional) => (
                  <TableRow key={professional.id}>
                    <TableCell>
                      <div>
                        <p className="font-semibold">{professional.display_name}</p>
                        <p className="text-sm text-hp-muted">{professional.full_name}</p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <p>{professional.profession ?? "Não informada"}</p>
                      {professional.category ? (
                        <p className="text-sm text-hp-muted">{professional.category}</p>
                      ) : null}
                    </TableCell>
                    <TableCell>
                      <p>{professional.whatsapp ?? professional.phone ?? "Não informado"}</p>
                      {professional.email ? (
                        <p className="text-sm text-hp-muted">{professional.email}</p>
                      ) : null}
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
                    {professional.profession ?? "Profissão não informada"}
                    {professional.category ? ` · ${professional.category}` : ""}
                  </p>
                  <p className="text-sm text-hp-muted">
                    {professional.whatsapp ?? professional.phone ?? professional.email ?? "Contato não informado"}
                  </p>
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
        <DialogContent className="max-w-4xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing ? "Editar profissional" : "Novo profissional"}</DialogTitle>
            <DialogDescription>
              {editing
                ? "Atualize os dados operacionais e o vínculo opcional de acesso."
                : "Cadastre um profissional, com ou sem conta de acesso vinculada."}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-6">
            <section className="space-y-4" aria-labelledby="professional-identification">
              <h3 id="professional-identification" className="font-semibold text-hp-foreground">
                Identificação
              </h3>
              <div className="grid gap-4 sm:grid-cols-2">
                <Input
                  label="Nome completo"
                  required
                  value={draft.fullName}
                  onChange={(event) => updateDraft("fullName", event.target.value)}
                  maxLength={150}
                />
                <Input
                  label="Nome de exibição"
                  required
                  description="Nome usado na agenda e nas telas operacionais."
                  value={draft.displayName}
                  onChange={(event) => updateDraft("displayName", event.target.value)}
                  maxLength={150}
                />
                <Input
                  label="Nome social"
                  value={draft.socialName}
                  onChange={(event) => updateDraft("socialName", event.target.value)}
                  maxLength={150}
                />
                <Input
                  label="CPF"
                  inputMode="numeric"
                  placeholder="000.000.000-00"
                  description="O CPF será validado e armazenado somente com dígitos."
                  value={draft.cpf}
                  onChange={(event) => updateDraft("cpf", event.target.value)}
                  maxLength={14}
                />
                <DatePicker
                  mode="single"
                  label="Data de nascimento"
                  value={draft.birthDate}
                  maxDate={maxBirthDate}
                  onValueChange={(value) => updateDraft("birthDate", value ?? "")}
                />
              </div>
            </section>

            <section className="space-y-4" aria-labelledby="professional-contact">
              <h3 id="professional-contact" className="font-semibold text-hp-foreground">
                Contato
              </h3>
              <div className="grid gap-4 sm:grid-cols-2">
                <Input
                  label="Email"
                  type="email"
                  value={draft.email}
                  onChange={(event) => updateDraft("email", event.target.value)}
                  maxLength={150}
                />
                <Input
                  label="Telefone"
                  inputMode="tel"
                  value={draft.phone}
                  onChange={(event) => updateDraft("phone", event.target.value)}
                  maxLength={30}
                />
                <Input
                  label="WhatsApp"
                  inputMode="tel"
                  value={draft.whatsapp}
                  onChange={(event) => updateDraft("whatsapp", event.target.value)}
                  maxLength={30}
                />
              </div>
            </section>

            <section className="space-y-4" aria-labelledby="professional-occupation">
              <h3 id="professional-occupation" className="font-semibold text-hp-foreground">
                Atuação profissional
              </h3>
              <div className="grid gap-4 sm:grid-cols-2">
                <Input
                  label="Profissão"
                  placeholder="Ex.: Biomédica"
                  value={draft.profession}
                  onChange={(event) => updateDraft("profession", event.target.value)}
                  maxLength={100}
                />
                <Input
                  label="Categoria"
                  placeholder="Ex.: Estética avançada"
                  value={draft.category}
                  onChange={(event) => updateDraft("category", event.target.value)}
                  maxLength={100}
                />
              </div>
              <Textarea
                label="Observações administrativas"
                description="Uso interno da clínica. Não faz parte do prontuário do paciente."
                value={draft.administrativeNotes}
                onChange={(event) => updateDraft("administrativeNotes", event.target.value)}
                maxLength={2000}
                showCount
                rows={3}
              />
            </section>

            <section className="space-y-4" aria-labelledby="professional-access">
              <h3 id="professional-access" className="font-semibold text-hp-foreground">
                Acesso ao sistema
              </h3>
            <Select
              label="Conta de acesso (opcional)"
              description={
                <>
                  Somente contas ativas da clínica e ainda sem outro profissional
                  vinculado aparecem aqui. Crie ou convide a conta em{" "}
                  <Link
                    href="/configuracoes?tab=usuarios"
                    className="font-semibold text-hp-primary hover:underline"
                  >
                    Configurações › Usuários
                  </Link>{" "}
                  antes de fazer o vínculo.
                </>
              }
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
            </section>
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

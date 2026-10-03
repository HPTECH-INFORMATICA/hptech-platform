"use client";

import { useEffect, useMemo, useState } from "react";

import { hasPermission, type CurrentUser } from "@/auth/types";
import Alert from "@/components/ui/Alert";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import DatePicker from "@/components/ui/DatePicker";
import Dialog, {
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/Dialog";
import EmptyState from "@/components/ui/EmptyState";
import {
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "@/components/ui/DropdownMenu";
import Input from "@/components/ui/Input";
import PageHeader from "@/components/ui/PageHeader";
import Pagination from "@/components/ui/Pagination";
import SearchBox from "@/components/ui/SearchBox";
import RowActionsMenu from "@/components/ui/RowActionsMenu";
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
  createPatient,
  deletePatient,
  listPatients,
  PatientApiError,
  updatePatient,
  updatePatientStatus,
  type PatientData,
  type PatientInput,
} from "@/services/patient-service";

const PAGE_SIZE = 10;
const statusOptions = [
  { value: "", label: "Todos" },
  { value: "true", label: "Ativos" },
  { value: "false", label: "Inativos" },
];

type FormDraft = {
  name: string;
  phone: string;
  whatsapp: string;
  email: string;
  document: string;
  birthDate: string | null;
};

const emptyDraft: FormDraft = {
  name: "",
  phone: "",
  whatsapp: "",
  email: "",
  document: "",
  birthDate: null,
};

function draftFromPatient(patient: PatientData): FormDraft {
  return {
    name: patient.name,
    phone: patient.phone ?? "",
    whatsapp: patient.whatsapp ?? "",
    email: patient.email ?? "",
    document: patient.document ?? "",
    birthDate: patient.birth_date,
  };
}

function optionalText(value: string): string | null {
  return value.trim() || null;
}

function payloadFromDraft(draft: FormDraft): PatientInput {
  return {
    name: draft.name.trim().replace(/\s+/g, " "),
    phone: optionalText(draft.phone),
    whatsapp: optionalText(draft.whatsapp),
    email: optionalText(draft.email)?.toLowerCase() ?? null,
    document: optionalText(draft.document),
    birth_date: draft.birthDate,
  };
}

function validateDraft(draft: FormDraft, maxBirthDate: string): string | null {
  const payload = payloadFromDraft(draft);
  if (!payload.name) return "Informe o nome do paciente.";
  if (payload.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(payload.email)) {
    return "Informe um email válido.";
  }
  if (payload.birth_date && payload.birth_date > maxBirthDate) {
    return "A data de nascimento não pode estar no futuro.";
  }
  return null;
}

function errorMessage(error: unknown): string {
  if (!(error instanceof PatientApiError)) return "Ocorreu um erro inesperado.";
  if (error.status === 401) return "Sua sessão expirou. Entre novamente.";
  if (error.status === 403) return "Você não possui permissão para esta operação.";
  if (error.status === 404) return "O paciente não foi encontrado ou não pertence à empresa.";
  if (error.status === 409) {
    return error.message.includes("vinculado")
      ? "Este paciente possui leads vinculados e não pode ser removido."
      : error.message;
  }
  if (error.status === 422) return "Revise os dados informados e tente novamente.";
  if (error.status >= 500) return "O serviço está temporariamente indisponível. Tente novamente.";
  return error.message;
}

function formatBirthDate(value: string | null): string {
  if (!value) return "Não informada";
  const [year, month, day] = value.split("-");
  return `${day}/${month}/${year}`;
}

function contact(patient: PatientData): { label: string; value: string } | null {
  if (patient.phone) return { label: "Telefone", value: patient.phone };
  if (patient.whatsapp) return { label: "WhatsApp", value: patient.whatsapp };
  if (patient.email) return { label: "Email", value: patient.email };
  return null;
}

function StatusBadge({ active }: { active: boolean }) {
  return <Badge variant={active ? "success" : "neutral"}>{active ? "Ativo" : "Inativo"}</Badge>;
}

type PatientsPageProps = {
  currentUser: CurrentUser;
  maxBirthDate: string;
};

export default function PatientsPage({ currentUser, maxBirthDate }: PatientsPageProps) {
  const { toast } = useToast();
  const [items, setItems] = useState<PatientData[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reload, setReload] = useState(0);
  const [editorOpen, setEditorOpen] = useState(false);
  const [editing, setEditing] = useState<PatientData | null>(null);
  const [draft, setDraft] = useState<FormDraft>(emptyDraft);
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [statusTarget, setStatusTarget] = useState<PatientData | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<PatientData | null>(null);

  const canCreate = hasPermission(currentUser, "PATIENTS", "CREATE");
  const canUpdate = hasPermission(currentUser, "PATIENTS", "UPDATE");
  const canDelete = hasPermission(currentUser, "PATIENTS", "DELETE");
  const hasActions = canUpdate || canDelete;

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
        const result = await listPatients(params);
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

  const initialPayload = useMemo(
    () => (editing ? payloadFromDraft(draftFromPatient(editing)) : null),
    [editing],
  );
  const currentPayload = payloadFromDraft(draft);
  const dirty = editing
    ? JSON.stringify(currentPayload) !== JSON.stringify(initialPayload)
    : Object.values(draft).some((value) => value !== null && value.trim() !== "");
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  function openCreate() {
    setEditing(null);
    setDraft(emptyDraft);
    setFormError(null);
    setEditorOpen(true);
  }

  function openEdit(patient: PatientData) {
    setEditing(patient);
    setDraft(draftFromPatient(patient));
    setFormError(null);
    setEditorOpen(true);
  }

  function updateDraft(field: keyof Omit<FormDraft, "birthDate">, value: string) {
    setDraft((current) => ({ ...current, [field]: value }));
  }

  async function save() {
    const validation = validateDraft(draft, maxBirthDate);
    if (validation) {
      setFormError(validation);
      return;
    }
    setSaving(true);
    setFormError(null);
    try {
      if (editing) await updatePatient(editing.id, currentPayload);
      else await createPatient(currentPayload);
      toast({
        variant: "success",
        description: editing
          ? "Paciente atualizado com sucesso."
          : "Paciente cadastrado com sucesso.",
      });
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
      await updatePatientStatus(statusTarget.id, !statusTarget.is_active);
      toast({
        variant: "success",
        description: statusTarget.is_active
          ? "Paciente desativado."
          : "Paciente reativado.",
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
      await deletePatient(deleteTarget.id);
      toast({ variant: "success", description: "Paciente removido da operação." });
      setDeleteTarget(null);
      setReload((value) => value + 1);
    } catch (reason) {
      toast({ variant: "danger", description: errorMessage(reason) });
      if (reason instanceof PatientApiError && reason.status === 409) {
        setDeleteTarget(null);
        setReload((value) => value + 1);
      }
    } finally {
      setSaving(false);
    }
  }

  function actions(patient: PatientData) {
    if (!hasActions) return null;
    return (
      <RowActionsMenu label={`Ações de ${patient.name}`}>
        {canUpdate ? (
          <DropdownMenuItem onSelect={() => openEdit(patient)}>
            Editar paciente
          </DropdownMenuItem>
        ) : null}
        {canUpdate ? (
          <DropdownMenuItem onSelect={() => setStatusTarget(patient)}>
            {patient.is_active ? "Desativar" : "Reativar"}
          </DropdownMenuItem>
        ) : null}
        {canDelete && canUpdate ? <DropdownMenuSeparator /> : null}
        {canDelete ? (
          <DropdownMenuItem
            variant="danger"
            disabled={patient.has_leads}
            title={patient.has_leads ? "Este paciente possui leads vinculados e não pode ser removido." : undefined}
            onSelect={() => setDeleteTarget(patient)}
          >
            {patient.has_leads ? "Remoção indisponível" : "Remover paciente"}
          </DropdownMenuItem>
        ) : null}
      </RowActionsMenu>
    );
  }

  return (
    <div className="space-y-8">
      <PageHeader
        title="Pacientes"
        description="Cadastro e gestão da identidade clínica dos pacientes da empresa."
        actions={canCreate ? <Button onClick={openCreate}>Novo paciente</Button> : undefined}
      />

      <section
        aria-label="Filtros de pacientes"
        className="grid gap-4 md:grid-cols-[minmax(16rem,1fr)_12rem]"
      >
        <SearchBox
          label="Buscar pacientes"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          onClear={() => setSearch("")}
          clearLabel="Limpar busca"
          placeholder="Nome, contato ou documento"
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
          title="Não foi possível carregar os pacientes"
          description={error}
          action={
            <Button variant="outline" size="sm" onClick={() => setReload((value) => value + 1)}>
              Tentar novamente
            </Button>
          }
        />
      ) : null}

      {loading ? (
        <div className="space-y-3" aria-label="Carregando pacientes">
          <Skeleton height="3rem" />
          <Skeleton height="3rem" />
          <Skeleton height="3rem" />
        </div>
      ) : !error && items.length === 0 ? (
        <EmptyState
          title="Nenhum paciente cadastrado."
          description="Nenhum paciente corresponde à busca e aos filtros atuais."
          action={canCreate ? <Button onClick={openCreate}>Cadastrar primeiro paciente</Button> : undefined}
        />
      ) : !error ? (
        <>
          <p className="text-sm text-hp-muted" aria-live="polite">
            {total} {total === 1 ? "paciente encontrado" : "pacientes encontrados"}
          </p>
          <div className="hidden md:block">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>Contato</TableHead>
                  <TableHead>Nascimento</TableHead>
                  <TableHead>Status</TableHead>
                  {hasActions ? <TableHead className="w-16 text-right"><span className="sr-only">Ações</span></TableHead> : null}
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((patient) => {
                  const primaryContact = contact(patient);
                  return (
                    <TableRow key={patient.id}>
                      <TableCell><span className="font-semibold">{patient.name}</span></TableCell>
                      <TableCell>
                        {primaryContact ? (
                          <span><span className="sr-only">{primaryContact.label}: </span>{primaryContact.value}</span>
                        ) : "Não informado"}
                      </TableCell>
                      <TableCell>{formatBirthDate(patient.birth_date)}</TableCell>
                      <TableCell><StatusBadge active={patient.is_active} /></TableCell>
                      {hasActions ? <TableCell className="w-16 text-right">{actions(patient)}</TableCell> : null}
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>

          <div className="grid min-w-0 gap-4 md:hidden">
            {items.map((patient) => {
              const primaryContact = contact(patient);
              return (
                <Card key={patient.id} variant="outlined" padding="sm">
                  <div className="flex h-full min-w-0 flex-col gap-4">
                    <div className="flex min-w-0 items-start justify-between gap-3">
                      <h2 className="min-w-0 break-words font-semibold text-hp-foreground">
                        {patient.name}
                      </h2>
                      <StatusBadge active={patient.is_active} />
                    </div>
                    <dl className="grid gap-3 text-sm sm:grid-cols-2">
                      <div className="min-w-0">
                        <dt className="text-hp-muted">Contato</dt>
                        <dd className="break-words">{primaryContact?.value ?? "Não informado"}</dd>
                      </div>
                      <div>
                        <dt className="text-hp-muted">Nascimento</dt>
                        <dd>{formatBirthDate(patient.birth_date)}</dd>
                      </div>
                    </dl>
                    <div className="mt-auto flex justify-end pt-1">{actions(patient)}</div>
                  </div>
                </Card>
              );
            })}
          </div>
          {totalPages > 1 ? (
            <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
          ) : null}
        </>
      ) : null}

      <Dialog open={editorOpen} onOpenChange={setEditorOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? "Editar paciente" : "Novo paciente"}</DialogTitle>
            <DialogDescription>
              {editing
                ? "Atualize os dados da identidade clínica do paciente."
                : "Cadastre a identidade clínica do paciente."}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <Input
              label="Nome"
              required
              value={draft.name}
              onChange={(event) => updateDraft("name", event.target.value)}
            />
            <div className="grid gap-4 sm:grid-cols-2">
              <Input
                label="Telefone"
                inputMode="tel"
                value={draft.phone}
                onChange={(event) => updateDraft("phone", event.target.value)}
              />
              <Input
                label="WhatsApp"
                inputMode="tel"
                value={draft.whatsapp}
                onChange={(event) => updateDraft("whatsapp", event.target.value)}
              />
            </div>
            <Input
              label="Email"
              type="email"
              value={draft.email}
              onChange={(event) => updateDraft("email", event.target.value)}
            />
            <Input
              label="Documento"
              value={draft.document}
              onChange={(event) => updateDraft("document", event.target.value)}
              description="Campo genérico, sem máscara ou matching automático."
            />
            <DatePicker
              mode="single"
              label="Data de nascimento"
              value={draft.birthDate}
              maxDate={maxBirthDate}
              onValueChange={(value) => setDraft((current) => ({ ...current, birthDate: value }))}
            />
            {formError ? <Alert variant="danger" description={formError} /> : null}
          </div>
          <DialogFooter>
            <DialogClose className="inline-flex min-h-11 items-center justify-center rounded-[var(--radius-md)] px-4 font-semibold text-hp-foreground hover:bg-hp-surface-subtle">
              Cancelar
            </DialogClose>
            <Button loading={saving} disabled={!dirty} onClick={() => void save()}>
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={statusTarget !== null} onOpenChange={(open) => !open && setStatusTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{statusTarget?.is_active ? "Desativar paciente" : "Reativar paciente"}</DialogTitle>
            <DialogDescription>
              {statusTarget?.is_active
                ? "O paciente ficará inativo, mas seus dados e vínculos serão preservados."
                : "O paciente voltará a ficar ativo na operação."}
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

      <Dialog open={deleteTarget !== null} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Remover paciente</DialogTitle>
            <DialogDescription>
              O paciente será removido da operação e deixará de aparecer nas listagens normais. O histórico será preservado.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <DialogClose className="inline-flex min-h-11 items-center justify-center rounded-[var(--radius-md)] px-4 font-semibold text-hp-foreground hover:bg-hp-surface-subtle">
              Cancelar
            </DialogClose>
            <Button loading={saving} variant="danger" onClick={() => void confirmDelete()}>
              Remover paciente
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

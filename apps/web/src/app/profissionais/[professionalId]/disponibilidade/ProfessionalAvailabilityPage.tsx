"use client";

import { useEffect, useMemo, useState } from "react";

import { hasPermission, type CurrentUser } from "@/auth/types";
import Alert from "@/components/ui/Alert";
import Badge from "@/components/ui/Badge";
import Breadcrumb from "@/components/ui/Breadcrumb";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import Checkbox from "@/components/ui/Checkbox";
import type { CalendarRange } from "@/components/ui/Calendar";
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
import Input from "@/components/ui/Input";
import PageHeader from "@/components/ui/PageHeader";
import Pagination from "@/components/ui/Pagination";
import Select from "@/components/ui/Select";
import Skeleton from "@/components/ui/Skeleton";
import Table, {
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/Table";
import Tabs, { TabsContent, TabsList, TabsTrigger } from "@/components/ui/Tabs";
import useToast from "@/hooks/useToast";
import {
  exceptionPayload,
  isPastCivilDate,
  normalizeCivilTime,
  normalizeWeeklyIntervals,
  validateExceptionDraft,
  validateWeeklyIntervals,
  weeklyIntervalsEqual,
  type AvailabilityExceptionDraft,
  type AvailabilityIntervalDraft,
} from "@/lib/professional-availability";
import {
  createAvailabilityException,
  deleteAvailabilityException,
  getProfessional,
  getWeeklyAvailability,
  listAvailabilityExceptions,
  ProfessionalApiError,
  replaceWeeklyAvailability,
  updateAvailabilityException,
  type AvailabilityExceptionData,
  type ProfessionalData,
} from "@/services/professional-service";

const PAGE_SIZE = 20;
const weekdays = [
  "Segunda-feira",
  "Terça-feira",
  "Quarta-feira",
  "Quinta-feira",
  "Sexta-feira",
  "Sábado",
  "Domingo",
];
const kindOptions = [
  { value: "AVAILABLE", label: "Disponibilidade excepcional" },
  { value: "UNAVAILABLE", label: "Indisponibilidade" },
];
const emptyExceptionDraft: AvailabilityExceptionDraft = {
  local_date: "",
  kind: "UNAVAILABLE",
  full_day: true,
  start_time: "",
  end_time: "",
};

function messageForError(error: unknown): string {
  if (!(error instanceof ProfessionalApiError)) return "Ocorreu um erro inesperado.";
  if (error.status === 401) return "Sua sessão expirou. Entre novamente.";
  if (error.status === 403) return "Você não possui permissão para esta operação.";
  if (error.status === 404) return "O profissional ou a exceção não foi encontrado nesta empresa.";
  if (error.status === 409) return "Não foi possível persistir a disponibilidade. Tente novamente.";
  if (error.status === 422) return error.message || "Revise os dados informados.";
  if (error.status >= 500) return "O serviço está temporariamente indisponível.";
  return error.message;
}

function exceptionDraftFrom(item: AvailabilityExceptionData): AvailabilityExceptionDraft {
  return {
    local_date: item.local_date,
    kind: item.kind,
    full_day: item.start_time === null,
    start_time: item.start_time ? normalizeCivilTime(item.start_time) : "",
    end_time: item.end_time ? normalizeCivilTime(item.end_time) : "",
  };
}

function formatDate(value: string): string {
  const [year, month, day] = value.split("-");
  return year && month && day ? `${day}/${month}/${year}` : value;
}

function exceptionScope(item: AvailabilityExceptionData): string {
  return item.start_time && item.end_time
    ? `${normalizeCivilTime(item.start_time)} até ${normalizeCivilTime(item.end_time)}`
    : "Dia inteiro";
}

export default function ProfessionalAvailabilityPage({
  currentUser,
  professionalId,
  today,
}: {
  currentUser: CurrentUser;
  professionalId: string;
  today: string;
}) {
  const { toast } = useToast();
  const canUpdate = hasPermission(currentUser, "PROFESSIONALS", "UPDATE");
  const [professional, setProfessional] = useState<ProfessionalData | null>(null);
  const [weekly, setWeekly] = useState<AvailabilityIntervalDraft[]>([]);
  const [weeklySnapshot, setWeeklySnapshot] = useState<AvailabilityIntervalDraft[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [reload, setReload] = useState(0);
  const [weeklySaving, setWeeklySaving] = useState(false);
  const [cancelWeeklyOpen, setCancelWeeklyOpen] = useState(false);

  const [exceptions, setExceptions] = useState<AvailabilityExceptionData[]>([]);
  const [exceptionTotal, setExceptionTotal] = useState(0);
  const [exceptionPage, setExceptionPage] = useState(1);
  const [exceptionLoading, setExceptionLoading] = useState(true);
  const [exceptionError, setExceptionError] = useState<string | null>(null);
  const [exceptionReload, setExceptionReload] = useState(0);
  const [dateRange, setDateRange] = useState<CalendarRange | null>(null);
  const [editorOpen, setEditorOpen] = useState(false);
  const [editingException, setEditingException] = useState<AvailabilityExceptionData | null>(null);
  const [exceptionDraft, setExceptionDraft] = useState(emptyExceptionDraft);
  const [exceptionFormError, setExceptionFormError] = useState<string | null>(null);
  const [exceptionSaving, setExceptionSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<AvailabilityExceptionData | null>(null);

  const weeklyDirty = !weeklyIntervalsEqual(weekly, weeklySnapshot);
  const weeklyValidation = validateWeeklyIntervals(weekly);
  const exceptionValidation = validateExceptionDraft(exceptionDraft);
  const totalPages = Math.max(1, Math.ceil(exceptionTotal / PAGE_SIZE));

  useEffect(() => {
    if (!weeklyDirty) return;
    const warn = (event: BeforeUnloadEvent) => event.preventDefault();
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [weeklyDirty]);

  useEffect(() => {
    let active = true;
    const load = async () => {
      setLoading(true);
      setLoadError(null);
      try {
        const [professionalResult, weeklyResult] = await Promise.all([
          getProfessional(professionalId),
          getWeeklyAvailability(professionalId),
        ]);
        if (!active) return;
        const normalized = normalizeWeeklyIntervals(weeklyResult.intervals);
        setProfessional(professionalResult);
        setWeekly(normalized);
        setWeeklySnapshot(normalized);
      } catch (reason) {
        if (active) setLoadError(messageForError(reason));
      } finally {
        if (active) setLoading(false);
      }
    };
    void load();
    return () => { active = false; };
  }, [professionalId, reload]);

  useEffect(() => {
    let active = true;
    const params = new URLSearchParams({
      page: String(exceptionPage),
      page_size: String(PAGE_SIZE),
    });
    if (dateRange?.from) params.set("date_from", dateRange.from);
    if (dateRange?.to) params.set("date_to", dateRange.to);
    const load = async () => {
      setExceptionLoading(true);
      setExceptionError(null);
      try {
        const result = await listAvailabilityExceptions(professionalId, params);
        if (!active) return;
        setExceptions(result.items);
        setExceptionTotal(result.total);
      } catch (reason) {
        if (active) setExceptionError(messageForError(reason));
      } finally {
        if (active) setExceptionLoading(false);
      }
    };
    void load();
    return () => { active = false; };
  }, [dateRange, exceptionPage, exceptionReload, professionalId]);

  const groupedWeekly = useMemo(
    () => weekdays.map((_, weekday) => weekly.filter((item) => item.weekday === weekday)),
    [weekly],
  );

  function addInterval(weekday: number) {
    setWeekly((current) => [...current, { weekday, start_time: "", end_time: "" }]);
  }

  function updateInterval(weekday: number, index: number, field: "start_time" | "end_time", value: string) {
    setWeekly((current) => {
      const dayItems = current.filter((item) => item.weekday === weekday);
      const target = dayItems[index];
      return current.map((item) => item === target ? { ...item, [field]: value } : item);
    });
  }

  function removeInterval(weekday: number, index: number) {
    setWeekly((current) => {
      const target = current.filter((item) => item.weekday === weekday)[index];
      return current.filter((item) => item !== target);
    });
  }

  async function saveWeekly() {
    if (!canUpdate || !weeklyDirty || weeklyValidation) return;
    setWeeklySaving(true);
    try {
      const result = await replaceWeeklyAvailability(
        professionalId,
        normalizeWeeklyIntervals(weekly),
      );
      const normalized = normalizeWeeklyIntervals(result.intervals);
      setWeekly(normalized);
      setWeeklySnapshot(normalized);
      toast({ variant: "success", description: "Grade semanal atualizada." });
    } catch (reason) {
      toast({ variant: "danger", description: messageForError(reason) });
    } finally {
      setWeeklySaving(false);
    }
  }

  function openCreateException() {
    setEditingException(null);
    setExceptionDraft({ ...emptyExceptionDraft, local_date: today });
    setExceptionFormError(null);
    setEditorOpen(true);
  }

  function openEditException(item: AvailabilityExceptionData) {
    setEditingException(item);
    setExceptionDraft(exceptionDraftFrom(item));
    setExceptionFormError(null);
    setEditorOpen(true);
  }

  async function saveException() {
    if (!canUpdate || exceptionValidation) return;
    setExceptionSaving(true);
    setExceptionFormError(null);
    try {
      const payload = exceptionPayload(exceptionDraft);
      if (editingException) {
        await updateAvailabilityException(professionalId, editingException.id, payload);
      } else {
        await createAvailabilityException(professionalId, payload);
      }
      toast({
        variant: "success",
        description: editingException ? "Exceção atualizada." : "Exceção criada.",
      });
      setEditorOpen(false);
      setExceptionReload((value) => value + 1);
    } catch (reason) {
      setExceptionFormError(messageForError(reason));
    } finally {
      setExceptionSaving(false);
    }
  }

  async function confirmDeleteException() {
    if (!deleteTarget) return;
    setExceptionSaving(true);
    try {
      await deleteAvailabilityException(professionalId, deleteTarget.id);
      toast({ variant: "success", description: "Exceção removida." });
      setDeleteTarget(null);
      setExceptionReload((value) => value + 1);
    } catch (reason) {
      toast({ variant: "danger", description: messageForError(reason) });
    } finally {
      setExceptionSaving(false);
    }
  }

  function exceptionActions(item: AvailabilityExceptionData) {
    if (!canUpdate || isPastCivilDate(item.local_date, today)) return null;
    return (
      <div className="flex flex-wrap gap-2">
        <Button size="sm" variant="ghost" onClick={() => openEditException(item)}>Editar</Button>
        <Button size="sm" variant="danger" onClick={() => setDeleteTarget(item)}>Remover</Button>
      </div>
    );
  }

  if (loading) {
    return <div className="space-y-4" aria-label="Carregando disponibilidade"><Skeleton height="5rem" /><Skeleton height="18rem" /></div>;
  }

  if (loadError || !professional) {
    return (
      <Alert
        variant="danger"
        title="Não foi possível carregar a disponibilidade"
        description={loadError ?? "Profissional não encontrado."}
        action={<Button size="sm" variant="outline" onClick={() => setReload((value) => value + 1)}>Tentar novamente</Button>}
      />
    );
  }

  return (
    <div className="min-w-0 space-y-8">
      <PageHeader
        title={`Disponibilidade de ${professional.display_name}`}
        description={`Horários no fuso ${currentUser.company.timezone}. Datas e horários são civis da empresa.`}
        breadcrumb={<Breadcrumb items={[{ label: "Profissionais", href: "/profissionais" }]} currentLabel="Disponibilidade" />}
        metadata={<><Badge variant={professional.is_active ? "success" : "neutral"}>{professional.is_active ? "Ativo" : "Inativo"}</Badge><span>{canUpdate ? "Gerenciamento habilitado" : "Somente leitura"}</span></>}
      />

      {!professional.is_active ? (
        <Alert variant="warning" title="Profissional inativo" description="A configuração permanece preservada e pode ser editada, mas não produzirá disponibilidade efetiva enquanto o profissional estiver inativo." />
      ) : null}

      <Tabs defaultValue="weekly">
        <TabsList aria-label="Seções de disponibilidade">
          <TabsTrigger value="weekly">Grade semanal</TabsTrigger>
          <TabsTrigger value="exceptions">Exceções</TabsTrigger>
        </TabsList>

        <TabsContent value="weekly" className="space-y-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h2 className="text-xl font-semibold text-hp-foreground">Grade semanal</h2>
              <p className="text-sm text-hp-muted">A ausência de intervalos indica que o dia não possui disponibilidade.</p>
            </div>
            {canUpdate ? (
              <div className="flex flex-wrap gap-2">
                <Button variant="outline" disabled={!weeklyDirty} onClick={() => setCancelWeeklyOpen(true)}>Cancelar</Button>
                <Button loading={weeklySaving} disabled={!weeklyDirty || Boolean(weeklyValidation)} onClick={() => void saveWeekly()}>Salvar alterações</Button>
              </div>
            ) : null}
          </div>

          {weeklyValidation ? <Alert variant="danger" description={weeklyValidation} /> : null}

          <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-3">
            {weekdays.map((day, weekday) => (
              <Card key={day} variant="outlined" padding="sm">
                <div className="space-y-4">
                  <div className="flex items-center justify-between gap-3">
                    <h3 className="font-semibold text-hp-foreground">{day}</h3>
                    <Badge variant={groupedWeekly[weekday].length ? "success" : "neutral"}>{groupedWeekly[weekday].length ? "Disponível" : "Sem horários"}</Badge>
                  </div>
                  {groupedWeekly[weekday].length ? groupedWeekly[weekday].map((interval, index) => (
                    <div key={`${weekday}-${index}`} className="rounded-[var(--radius-md)] border border-hp-border p-3">
                      {canUpdate ? (
                        <div className="space-y-3">
                          <div className="grid gap-3 sm:grid-cols-2">
                            <Input label="Início" type="time" value={interval.start_time} onChange={(event) => updateInterval(weekday, index, "start_time", event.target.value)} />
                            <Input label="Fim" type="time" value={interval.end_time} onChange={(event) => updateInterval(weekday, index, "end_time", event.target.value)} />
                          </div>
                          <Button size="sm" variant="ghost" onClick={() => removeInterval(weekday, index)}>Remover intervalo</Button>
                        </div>
                      ) : <p className="font-medium text-hp-foreground">{interval.start_time} até {interval.end_time}</p>}
                    </div>
                  )) : <p className="text-sm text-hp-muted">Nenhum intervalo configurado.</p>}
                  {canUpdate ? <Button size="sm" variant="outline" onClick={() => addInterval(weekday)}>Adicionar horário</Button> : null}
                </div>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="exceptions" className="space-y-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h2 className="text-xl font-semibold text-hp-foreground">Exceções</h2>
              <p className="text-sm text-hp-muted">Disponibilidades e indisponibilidades específicas, incluindo o histórico.</p>
            </div>
            {canUpdate ? <Button onClick={openCreateException}>Nova exceção</Button> : null}
          </div>

          <div className="grid gap-3 md:grid-cols-[minmax(18rem,28rem)_auto] md:items-end">
            <DatePicker mode="range" label="Filtrar período" value={dateRange} onValueChange={(value) => { setDateRange(value); setExceptionPage(1); }} />
            {dateRange ? <Button variant="ghost" onClick={() => { setDateRange(null); setExceptionPage(1); }}>Limpar período</Button> : null}
          </div>

          {exceptionError ? <Alert variant="danger" title="Não foi possível carregar as exceções" description={exceptionError} action={<Button size="sm" variant="outline" onClick={() => setExceptionReload((value) => value + 1)}>Tentar novamente</Button>} /> : null}
          {exceptionLoading ? <div className="space-y-3"><Skeleton height="3rem" /><Skeleton height="3rem" /><Skeleton height="3rem" /></div> : null}
          {!exceptionLoading && !exceptionError && exceptions.length === 0 ? <EmptyState title="Nenhuma exceção encontrada" description="Não há exceções para o período selecionado." action={canUpdate ? <Button onClick={openCreateException}>Criar exceção</Button> : undefined} /> : null}
          {!exceptionLoading && !exceptionError && exceptions.length ? (
            <>
              <p className="text-sm text-hp-muted" aria-live="polite">{exceptionTotal} {exceptionTotal === 1 ? "exceção encontrada" : "exceções encontradas"}</p>
              <div className="hidden md:block">
                <Table>
                  <TableHeader><TableRow><TableHead>Data</TableHead><TableHead>Tipo</TableHead><TableHead>Período</TableHead><TableHead>Estado</TableHead>{canUpdate ? <TableHead>Ações</TableHead> : null}</TableRow></TableHeader>
                  <TableBody>{exceptions.map((item) => { const historical = isPastCivilDate(item.local_date, today); return <TableRow key={item.id}><TableCell>{formatDate(item.local_date)}</TableCell><TableCell><Badge variant={item.kind === "AVAILABLE" ? "success" : "warning"}>{item.kind === "AVAILABLE" ? "Disponível" : "Indisponível"}</Badge></TableCell><TableCell>{exceptionScope(item)}</TableCell><TableCell>{historical ? <Badge variant="neutral">Histórico</Badge> : <Badge variant="info">Futuro</Badge>}</TableCell>{canUpdate ? <TableCell>{exceptionActions(item)}</TableCell> : null}</TableRow>; })}</TableBody>
                </Table>
              </div>
              <div className="grid gap-4 md:hidden">{exceptions.map((item) => { const historical = isPastCivilDate(item.local_date, today); return <Card key={item.id} variant="outlined" padding="sm"><div className="space-y-3"><div className="flex flex-wrap items-center justify-between gap-2"><h3 className="font-semibold text-hp-foreground">{formatDate(item.local_date)}</h3><Badge variant={historical ? "neutral" : "info"}>{historical ? "Histórico" : "Futuro"}</Badge></div><div className="flex flex-wrap gap-2"><Badge variant={item.kind === "AVAILABLE" ? "success" : "warning"}>{item.kind === "AVAILABLE" ? "Disponível" : "Indisponível"}</Badge><span className="text-sm text-hp-muted">{exceptionScope(item)}</span></div>{exceptionActions(item)}</div></Card>; })}</div>
              {totalPages > 1 ? <Pagination page={exceptionPage} totalPages={totalPages} onPageChange={setExceptionPage} disabled={exceptionLoading} /> : null}
            </>
          ) : null}
        </TabsContent>
      </Tabs>

      <Dialog open={cancelWeeklyOpen} onOpenChange={setCancelWeeklyOpen}>
        <DialogContent><DialogHeader><DialogTitle>Descartar alterações?</DialogTitle><DialogDescription>A grade semanal voltará ao último estado salvo.</DialogDescription></DialogHeader><DialogFooter><DialogClose className="inline-flex min-h-11 items-center justify-center rounded-[var(--radius-md)] px-4 font-semibold text-hp-foreground hover:bg-hp-surface-subtle">Continuar editando</DialogClose><Button variant="danger" onClick={() => { setWeekly(weeklySnapshot); setCancelWeeklyOpen(false); }}>Descartar alterações</Button></DialogFooter></DialogContent>
      </Dialog>

      <Dialog open={editorOpen} onOpenChange={(open) => { setEditorOpen(open); if (!open) setExceptionFormError(null); }}>
        <DialogContent><DialogHeader><DialogTitle>{editingException ? "Editar exceção" : "Nova exceção"}</DialogTitle><DialogDescription>Configure uma alteração pontual usando a data e os horários civis da empresa.</DialogDescription></DialogHeader>
          <div className="space-y-4">
            <Select label="Tipo" options={kindOptions} value={exceptionDraft.kind} onChange={(event) => { const kind = event.target.value as AvailabilityExceptionDraft["kind"]; setExceptionDraft((current) => ({ ...current, kind, full_day: kind === "AVAILABLE" ? false : current.full_day })); }} />
            <DatePicker mode="single" label="Data" required minDate={today} value={exceptionDraft.local_date || null} onValueChange={(value) => setExceptionDraft((current) => ({ ...current, local_date: value ?? "" }))} />
            {exceptionDraft.kind === "UNAVAILABLE" ? <Checkbox label="Dia inteiro" description="Preserva os horários vazios e bloqueia a data inteira." checked={exceptionDraft.full_day} onChange={(event) => setExceptionDraft((current) => ({ ...current, full_day: event.target.checked }))} /> : null}
            {!exceptionDraft.full_day ? <div className="grid gap-3 sm:grid-cols-2"><Input label="Início" type="time" required value={exceptionDraft.start_time} onChange={(event) => setExceptionDraft((current) => ({ ...current, start_time: event.target.value }))} /><Input label="Fim" type="time" required value={exceptionDraft.end_time} onChange={(event) => setExceptionDraft((current) => ({ ...current, end_time: event.target.value }))} /></div> : null}
            {exceptionValidation ? <Alert variant="warning" description={exceptionValidation} /> : null}
            {exceptionFormError ? <Alert variant="danger" description={exceptionFormError} /> : null}
          </div>
          <DialogFooter><DialogClose className="inline-flex min-h-11 items-center justify-center rounded-[var(--radius-md)] px-4 font-semibold text-hp-foreground hover:bg-hp-surface-subtle">Cancelar</DialogClose><Button loading={exceptionSaving} disabled={Boolean(exceptionValidation)} onClick={() => void saveException()}>Salvar exceção</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={deleteTarget !== null} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <DialogContent><DialogHeader><DialogTitle>Remover exceção</DialogTitle><DialogDescription>A exceção futura de {deleteTarget ? formatDate(deleteTarget.local_date) : ""} será removida. O histórico passado permanece preservado.</DialogDescription></DialogHeader><DialogFooter><DialogClose className="inline-flex min-h-11 items-center justify-center rounded-[var(--radius-md)] px-4 font-semibold text-hp-foreground hover:bg-hp-surface-subtle">Cancelar</DialogClose><Button variant="danger" loading={exceptionSaving} onClick={() => void confirmDeleteException()}>Remover exceção</Button></DialogFooter></DialogContent>
      </Dialog>
    </div>
  );
}

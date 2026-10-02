"use client";

import { useEffect, useMemo, useState } from "react";

import { hasPermission, type CurrentUser } from "@/auth/types";
import Alert from "@/components/ui/Alert";
import Badge, { type BadgeProps } from "@/components/ui/Badge";
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
import DropdownMenu, {
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/DropdownMenu";
import EmptyState from "@/components/ui/EmptyState";
import PageHeader from "@/components/ui/PageHeader";
import Select from "@/components/ui/Select";
import Skeleton from "@/components/ui/Skeleton";
import useToast from "@/hooks/useToast";
import { buildAppointmentSharing } from "@/lib/appointment-sharing";
import { clinicUnitName, formatClinicAddress } from "@/lib/clinic-location";
import {
  deleteAppointment,
  listAppointments,
  transitionAppointment,
  type AppointmentAction,
  type AppointmentData,
  type AppointmentStatus,
} from "@/services/appointment-service";
import { listPatients, type PatientData } from "@/services/patient-service";
import {
  listProfessionals,
  type ProfessionalData,
} from "@/services/professional-service";
import { listServices, type ServiceData } from "@/services/service-service";

import AppointmentEditor, { type AppointmentEditorMode } from "./AppointmentEditor";

const DAY_IN_MS = 86_400_000;
const QUERY_PADDING_IN_MS = 14 * 60 * 60 * 1000;
const currencyFormatter = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

const statusPresentation: Record<
  AppointmentStatus,
  { label: string; variant: BadgeProps["variant"] }
> = {
  SCHEDULED: { label: "Agendado", variant: "info" },
  CONFIRMED: { label: "Confirmado", variant: "primary" },
  IN_PROGRESS: { label: "Em atendimento", variant: "warning" },
  COMPLETED: { label: "Concluído", variant: "success" },
  CANCELED: { label: "Cancelado", variant: "danger" },
  NO_SHOW: { label: "Não compareceu", variant: "neutral" },
};

type AgendaPageProps = {
  currentUser: CurrentUser;
  timezone: string;
  initialDate: string;
};

const availableActions: Partial<
  Record<AppointmentStatus, { action: AppointmentAction; label: string }[]>
> = {
  SCHEDULED: [
    { action: "confirm", label: "Confirmar" },
    { action: "start", label: "Iniciar" },
    { action: "no-show", label: "Não compareceu" },
    { action: "cancel", label: "Cancelar" },
  ],
  CONFIRMED: [
    { action: "start", label: "Iniciar" },
    { action: "no-show", label: "Não compareceu" },
    { action: "cancel", label: "Cancelar" },
  ],
  IN_PROGRESS: [{ action: "complete", label: "Concluir" }],
};

const deletionReasonOptions = [
  { value: "", label: "Selecione o motivo" },
  { value: "Cadastro duplicado", label: "Cadastro duplicado" },
  { value: "Erro de lançamento", label: "Erro de lançamento" },
  { value: "Solicitação do paciente", label: "Solicitação do paciente" },
  { value: "Cancelamento administrativo", label: "Cancelamento administrativo" },
];

function dateKeyInTimezone(value: Date, timezone: string): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(value);
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${values.year}-${values.month}-${values.day}`;
}

function civilDateFromKey(value: string): Date {
  return new Date(`${value}T12:00:00.000Z`);
}

function addCivilDays(value: string, days: number): string {
  return new Date(civilDateFromKey(value).getTime() + days * DAY_IN_MS)
    .toISOString()
    .slice(0, 10);
}

function startOfWeek(value: string): string {
  const date = civilDateFromKey(value);
  const weekday = date.getUTCDay();
  return addCivilDays(value, weekday === 0 ? -6 : 1 - weekday);
}

function formatCivilDate(
  value: string,
  options: Intl.DateTimeFormatOptions,
): string {
  return new Intl.DateTimeFormat("pt-BR", {
    ...options,
    timeZone: "UTC",
  }).format(civilDateFromKey(value));
}

function formatTime(value: string, timezone: string): string {
  return new Intl.DateTimeFormat("pt-BR", {
    timeZone: timezone,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(new Date(value));
}

function queryWindow(weekStart: string) {
  const start = Date.parse(`${weekStart}T00:00:00.000Z`) - QUERY_PADDING_IN_MS;
  const end =
    Date.parse(`${addCivilDays(weekStart, 7)}T00:00:00.000Z`) +
    QUERY_PADDING_IN_MS;
  return {
    start: new Date(start).toISOString(),
    end: new Date(end).toISOString(),
  };
}

function errorMessage(error: unknown): string {
  if (error instanceof Error && error.message) return error.message;
  return "Ocorreu um erro inesperado ao carregar a agenda.";
}

async function listActiveProfessionals(): Promise<ProfessionalData[]> {
  const pageSize = 100;
  const firstParams = new URLSearchParams({
    page: "1",
    page_size: String(pageSize),
    is_active: "true",
  });
  const first = await listProfessionals(firstParams);
  const totalPages = Math.ceil(first.total / pageSize);
  if (totalPages <= 1) return first.items;

  const remaining = await Promise.all(
    Array.from({ length: totalPages - 1 }, (_, index) => {
      const params = new URLSearchParams(firstParams);
      params.set("page", String(index + 2));
      return listProfessionals(params);
    }),
  );
  return [first, ...remaining].flatMap((result) => result.items);
}

async function listActivePatients(): Promise<PatientData[]> {
  const pageSize = 100;
  const params = new URLSearchParams({
    page: "1",
    page_size: String(pageSize),
    is_active: "true",
  });
  const first = await listPatients(params);
  const pages = Math.ceil(first.total / pageSize);
  const remaining = await Promise.all(
    Array.from({ length: Math.max(0, pages - 1) }, (_, index) => {
      const pageParams = new URLSearchParams(params);
      pageParams.set("page", String(index + 2));
      return listPatients(pageParams);
    }),
  );
  return [first, ...remaining].flatMap((result) => result.items);
}

async function listActiveServices(): Promise<ServiceData[]> {
  const pageSize = 100;
  const params = new URLSearchParams({
    page: "1",
    page_size: String(pageSize),
    is_active: "true",
  });
  const first = await listServices(params);
  const pages = Math.ceil(first.total / pageSize);
  const remaining = await Promise.all(
    Array.from({ length: Math.max(0, pages - 1) }, (_, index) => {
      const pageParams = new URLSearchParams(params);
      pageParams.set("page", String(index + 2));
      return listServices(pageParams);
    }),
  );
  return [first, ...remaining].flatMap((result) => result.items);
}

function AppointmentCard({
  appointment,
  patientName,
  professionalName,
  unitName,
  clinicAddress,
  timezone,
  onOpen,
}: {
  appointment: AppointmentData;
  patientName: string;
  professionalName: string;
  unitName: string;
  clinicAddress: string | null;
  timezone: string;
  onOpen: () => void;
}) {
  const status = statusPresentation[appointment.status];
  return (
    <button
      type="button"
      onClick={onOpen}
      className="block w-full rounded-[var(--radius-lg)] text-left focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-hp-focus"
      aria-label={`Abrir ${appointment.service_name_snapshot} às ${formatTime(appointment.starts_at, timezone)}`}
    >
      <Card variant="subtle" padding="sm" interactive className="space-y-2 border-l-4 border-l-hp-primary">
      <div className="flex min-w-0 items-start justify-between gap-2">
        <p className="font-semibold text-hp-foreground">
          <time dateTime={appointment.starts_at}>
            {formatTime(appointment.starts_at, timezone)}
          </time>
          {" – "}
          <time dateTime={appointment.ends_at}>
            {formatTime(appointment.ends_at, timezone)}
          </time>
        </p>
        <Badge variant={status.variant} size="sm">
          {status.label}
        </Badge>
      </div>
      <p className="break-words text-sm font-medium text-hp-foreground">
        {appointment.service_name_snapshot}
      </p>
      <p className="truncate text-sm text-hp-foreground" title={patientName}>{patientName}</p>
      <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-hp-muted">
        <span>{professionalName}</span>
        <span>{appointment.service_duration_minutes_snapshot} min · {currencyFormatter.format(Number(appointment.service_price_snapshot))}</span>
      </div>
      <div className="border-t border-hp-border pt-2 text-xs text-hp-muted">
        <p className="font-medium text-hp-foreground">{unitName}</p>
        <p className="mt-1 break-words">
          {clinicAddress ?? "Endereço da unidade ainda não cadastrado"}
        </p>
      </div>
      </Card>
    </button>
  );
}

export default function AgendaPage({
  currentUser,
  timezone,
  initialDate,
}: AgendaPageProps) {
  const { toast } = useToast();
  const [weekStart, setWeekStart] = useState(() => startOfWeek(initialDate));
  const [selectedDay, setSelectedDay] = useState(initialDate);
  const [professionals, setProfessionals] = useState<ProfessionalData[]>([]);
  const [appointments, setAppointments] = useState<AppointmentData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reload, setReload] = useState(0);
  const [patients, setPatients] = useState<PatientData[]>([]);
  const [services, setServices] = useState<ServiceData[]>([]);
  const [referencesLoading, setReferencesLoading] = useState(false);
  const [referencesError, setReferencesError] = useState<string | null>(null);
  const [selectedAppointment, setSelectedAppointment] =
    useState<AppointmentData | null>(null);
  const [editorAppointment, setEditorAppointment] =
    useState<AppointmentData | null>(null);
  const [editorMode, setEditorMode] = useState<AppointmentEditorMode | null>(null);
  const [editorKey, setEditorKey] = useState(0);
  const [actionBusy, setActionBusy] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<AppointmentData | null>(null);
  const [deleteReason, setDeleteReason] = useState("");

  const canCreate = hasPermission(currentUser, "APPOINTMENTS", "CREATE");
  const canUpdate = hasPermission(currentUser, "APPOINTMENTS", "UPDATE");
  const canDelete = hasPermission(currentUser, "APPOINTMENTS", "DELETE");
  const isMaster = currentUser.role === "OWNER" || currentUser.role === "ADMIN";
  const canReadReferences =
    hasPermission(currentUser, "PATIENTS", "VIEW") &&
    hasPermission(currentUser, "PROFESSIONALS", "VIEW") &&
    hasPermission(currentUser, "SERVICES", "VIEW");
  const canOpenCreate = canCreate && canReadReferences;
  const canEditAppointment = canUpdate && canReadReferences;
  const unitName = clinicUnitName(currentUser.company);
  const clinicAddress = formatClinicAddress(currentUser.company);

  const days = useMemo(
    () => Array.from({ length: 7 }, (_, index) => addCivilDays(weekStart, index)),
    [weekStart],
  );
  const window = useMemo(() => queryWindow(weekStart), [weekStart]);

  useEffect(() => {
    const controller = new AbortController();

    const loadAgenda = async () => {
      setLoading(true);
      setError(null);
      try {
        const [professionalResult, appointmentResult] = await Promise.all([
          listActiveProfessionals(),
          listAppointments(window.start, window.end),
        ]);
        if (controller.signal.aborted) return;
        setProfessionals(professionalResult);
        setAppointments(
          appointmentResult.filter((appointment) =>
            days.includes(
              dateKeyInTimezone(new Date(appointment.starts_at), timezone),
            ),
          ),
        );
      } catch (reason) {
        if (!controller.signal.aborted) setError(errorMessage(reason));
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    };

    void loadAgenda();
    return () => controller.abort();
  }, [days, reload, timezone, window.end, window.start]);

  useEffect(() => {
    if (!canReadReferences) return;
    let active = true;

    const loadReferences = async () => {
      setReferencesLoading(true);
      setReferencesError(null);
      try {
        const [patientResult, serviceResult] = await Promise.all([
          listActivePatients(),
          listActiveServices(),
        ]);
        if (!active) return;
        setPatients(patientResult);
        setServices(serviceResult);
      } catch (reason) {
        if (active) setReferencesError(errorMessage(reason));
      } finally {
        if (active) setReferencesLoading(false);
      }
    };

    void loadReferences();
    return () => {
      active = false;
    };
  }, [canReadReferences, reload]);

  const appointmentsByCell = useMemo(() => {
    const result = new Map<string, AppointmentData[]>();
    for (const appointment of appointments) {
      const day = dateKeyInTimezone(new Date(appointment.starts_at), timezone);
      const key = `${day}:${appointment.professional_id}`;
      const current = result.get(key) ?? [];
      current.push(appointment);
      result.set(key, current);
    }
    for (const entries of result.values()) {
      entries.sort((left, right) => left.starts_at.localeCompare(right.starts_at));
    }
    return result;
  }, [appointments, timezone]);
  const patientById = useMemo(
    () => new Map(patients.map((patient) => [patient.id, patient.name])),
    [patients],
  );

  function changeWeek(offset: number) {
    const nextWeek = addCivilDays(weekStart, offset * 7);
    setWeekStart(nextWeek);
    setSelectedDay(nextWeek);
  }

  function goToToday() {
    setWeekStart(startOfWeek(initialDate));
    setSelectedDay(initialDate);
  }

  function openEditor(mode: AppointmentEditorMode) {
    if (mode === "create") {
      setEditorAppointment(null);
      setEditorKey((value) => value + 1);
      setEditorMode(mode);
      return;
    }

    setEditorAppointment(selectedAppointment);
    setSelectedAppointment(null);
    globalThis.setTimeout(() => {
      setEditorKey((value) => value + 1);
      setEditorMode(mode);
    }, 0);
  }

  function handleSaved(appointment: AppointmentData) {
    setEditorMode(null);
    setEditorAppointment(null);
    setSelectedAppointment(appointment);
    setReload((value) => value + 1);
    toast({
      variant: "success",
      description:
        editorMode === "create"
          ? "Agendamento criado com sucesso."
          : editorMode === "reschedule"
            ? "Agendamento reagendado com sucesso."
            : "Agendamento atualizado com sucesso.",
    });
  }

  async function runAction(action: AppointmentAction) {
    if (!selectedAppointment) return;
    setActionBusy(true);
    setActionError(null);
    try {
      const updated = await transitionAppointment(selectedAppointment.id, action);
      setSelectedAppointment(updated);
      setAppointments((current) =>
        current.map((item) => (item.id === updated.id ? updated : item)),
      );
      toast({ variant: "success", description: "Status atualizado com sucesso." });
    } catch (reason) {
      setActionError(errorMessage(reason));
    } finally {
      setActionBusy(false);
    }
  }

  async function confirmDelete() {
    if (!deleteTarget || !deleteReason) return;
    setActionBusy(true);
    setActionError(null);
    try {
      await deleteAppointment(deleteTarget.id, deleteReason);
      setAppointments((current) => current.filter((item) => item.id !== deleteTarget.id));
      setDeleteTarget(null);
      setDeleteReason("");
      setSelectedAppointment(null);
      toast({ variant: "success", description: "Agendamento removido da agenda com registro de auditoria." });
    } catch (reason) {
      setActionError(errorMessage(reason));
    } finally {
      setActionBusy(false);
    }
  }

  function openExternal(url: string) {
    globalThis.open(url, "_blank", "noopener,noreferrer");
  }

  const weekLabel = `${formatCivilDate(days[0], { day: "2-digit", month: "short" })} – ${formatCivilDate(days[6], { day: "2-digit", month: "short", year: "numeric" })}`;
  const dayOptions = days.map((day) => ({
    value: day,
    label: formatCivilDate(day, { weekday: "long", day: "2-digit", month: "short" }),
  }));
  const resolvedSelectedDay = days.includes(selectedDay) ? selectedDay : days[0];
  const selectedPatient = selectedAppointment
    ? patients.find((patient) => patient.id === selectedAppointment.patient_id)
    : null;
  const selectedProfessional = selectedAppointment
    ? professionals.find(
        (professional) => professional.id === selectedAppointment.professional_id,
      )
    : null;
  const selectedPatientPhone = selectedPatient?.whatsapp ?? selectedPatient?.phone ?? "";
  const selectedSharing =
    selectedAppointment && selectedPatient && selectedProfessional && clinicAddress
      ? buildAppointmentSharing({
          clinicName: currentUser.company.name,
          unitName,
          address: clinicAddress,
          patientName: selectedPatient.name,
          patientPhone: selectedPatientPhone,
          professionalName: selectedProfessional.display_name,
          serviceName: selectedAppointment.service_name_snapshot,
          startsAt: selectedAppointment.starts_at,
          endsAt: selectedAppointment.ends_at,
          timezone,
        })
      : null;
  const selectedActions = selectedAppointment
    ? availableActions[selectedAppointment.status] ?? []
    : [];
  const selectedMutable =
    selectedAppointment?.status === "SCHEDULED" ||
    selectedAppointment?.status === "CONFIRMED";

  return (
    <div className="space-y-8">
      <PageHeader
        title="Agenda"
        description={`Visão operacional no fuso ${timezone}.`}
        metadata={<Badge variant="neutral">Semana de {weekLabel}</Badge>}
        actions={
          <div className="flex flex-wrap gap-2" aria-label="Navegação da agenda">
            {canOpenCreate ? (
              <Button onClick={() => openEditor("create")}>Novo agendamento</Button>
            ) : null}
            <Button variant="outline" onClick={() => changeWeek(-1)}>
              Semana anterior
            </Button>
            <Button variant="ghost" onClick={goToToday}>
              Hoje
            </Button>
            <Button variant="outline" onClick={() => changeWeek(1)}>
              Próxima semana
            </Button>
          </div>
        }
      />

      {error ? (
        <Alert
          variant="danger"
          title="Não foi possível carregar a agenda"
          description={error}
          action={
            <Button variant="outline" size="sm" onClick={() => setReload((value) => value + 1)}>
              Tentar novamente
            </Button>
          }
        />
      ) : null}

      {!clinicAddress ? (
        <Alert
          variant="warning"
          title="Endereço da unidade não cadastrado"
          description="Cadastre o endereço principal em Configurações > Dados da clínica para habilitar confirmações completas, Maps e calendário."
        />
      ) : null}

      {loading ? (
        <div className="space-y-3" aria-label="Carregando agenda">
          <Skeleton height="4rem" />
          <Skeleton height="10rem" />
          <Skeleton height="10rem" />
        </div>
      ) : !error && professionals.length === 0 ? (
        <EmptyState
          title="Nenhum profissional disponível"
          description="Cadastre e ative profissionais antes de organizar a agenda."
        />
      ) : !error ? (
        <section aria-labelledby="agenda-week-title" className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 id="agenda-week-title" className="text-xl font-semibold text-hp-foreground">
              Agenda por profissional
            </h2>
            <p className="text-sm text-hp-muted" aria-live="polite">
              {appointments.length} {appointments.length === 1 ? "agendamento" : "agendamentos"}
            </p>
          </div>

          <div className="md:hidden">
            <Select
              label="Dia exibido"
              value={resolvedSelectedDay}
              options={dayOptions}
              onChange={(event) => setSelectedDay(event.target.value)}
            />
            <div className="mt-4 space-y-4">
              {professionals.map((professional) => {
                const entries = appointmentsByCell.get(`${resolvedSelectedDay}:${professional.id}`) ?? [];
                return (
                  <Card key={professional.id} variant="outlined" padding="sm" className="space-y-3">
                    <h3 className="font-semibold text-hp-foreground">{professional.display_name}</h3>
                    {entries.length ? entries.map((appointment) => (
                      <AppointmentCard
                        key={appointment.id}
                        appointment={appointment}
                        patientName={patientById.get(appointment.patient_id) ?? "Paciente não disponível"}
                        professionalName={professional.display_name}
                        unitName={unitName}
                        clinicAddress={clinicAddress}
                        timezone={timezone}
                        onOpen={() => {
                          setActionError(null);
                          setSelectedAppointment(appointment);
                        }}
                      />
                    )) : <p className="text-sm text-hp-muted">Sem agendamentos.</p>}
                  </Card>
                );
              })}
            </div>
          </div>

          <div
            role="region"
            aria-label="Grade semanal da agenda"
            tabIndex={0}
            className="hidden overflow-x-auto rounded-[var(--radius-lg)] border border-hp-border focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-hp-focus md:block"
          >
            <table className="min-w-full border-collapse text-left">
              <caption className="sr-only">
                Agendamentos da semana organizados por dia e profissional.
              </caption>
              <thead className="bg-hp-surface-subtle">
                <tr>
                  <th scope="col" className="sticky left-0 z-10 min-w-36 border-b border-r border-hp-border bg-hp-surface-subtle p-4 text-sm font-semibold">
                    Dia
                  </th>
                  {professionals.map((professional) => (
                    <th key={professional.id} scope="col" className="min-w-64 border-b border-hp-border p-4 text-sm font-semibold">
                      {professional.display_name}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {days.map((day) => (
                  <tr key={day} className="align-top">
                    <th scope="row" className="sticky left-0 z-10 border-b border-r border-hp-border bg-hp-surface p-4 text-sm font-semibold">
                      <time dateTime={day}>{formatCivilDate(day, { weekday: "short", day: "2-digit", month: "short" })}</time>
                    </th>
                    {professionals.map((professional) => {
                      const entries = appointmentsByCell.get(`${day}:${professional.id}`) ?? [];
                      return (
                        <td key={professional.id} className="border-b border-hp-border p-3">
                          <div className="space-y-2">
                            {entries.length ? entries.map((appointment) => (
                              <AppointmentCard
                                key={appointment.id}
                                appointment={appointment}
                                patientName={patientById.get(appointment.patient_id) ?? "Paciente não disponível"}
                                professionalName={professional.display_name}
                                unitName={unitName}
                                clinicAddress={clinicAddress}
                                timezone={timezone}
                                onOpen={() => {
                                  setActionError(null);
                                  setSelectedAppointment(appointment);
                                }}
                              />
                            )) : <span className="text-sm text-hp-subtle">Livre</span>}
                          </div>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      ) : null}

      {editorMode === null ? (
        <Dialog
          open={selectedAppointment !== null}
          onOpenChange={(open) => {
            if (!open) {
              setSelectedAppointment(null);
              setActionError(null);
            }
          }}
        >
          <DialogContent>
          <DialogHeader>
            <DialogTitle>{selectedAppointment?.service_name_snapshot}</DialogTitle>
            <DialogDescription>
              Detalhes operacionais do agendamento no fuso {timezone}.
            </DialogDescription>
          </DialogHeader>

          {selectedAppointment ? (
            <div className="space-y-4">
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant={statusPresentation[selectedAppointment.status].variant}>
                  {statusPresentation[selectedAppointment.status].label}
                </Badge>
                <span className="text-sm text-hp-muted">
                  {selectedAppointment.service_duration_minutes_snapshot} min
                </span>
              </div>
              <dl className="grid gap-4 text-sm sm:grid-cols-2">
                <div>
                  <dt className="font-medium text-hp-muted">Data</dt>
                  <dd className="mt-1 text-hp-foreground">
                    {formatCivilDate(
                      dateKeyInTimezone(
                        new Date(selectedAppointment.starts_at),
                        timezone,
                      ),
                      { weekday: "long", day: "2-digit", month: "long", year: "numeric" },
                    )}
                  </dd>
                </div>
                <div>
                  <dt className="font-medium text-hp-muted">Horário</dt>
                  <dd className="mt-1 text-hp-foreground">
                    {formatTime(selectedAppointment.starts_at, timezone)} – {formatTime(selectedAppointment.ends_at, timezone)}
                  </dd>
                </div>
                <div>
                  <dt className="font-medium text-hp-muted">Paciente</dt>
                  <dd className="mt-1 text-hp-foreground">
                    {selectedPatient?.name ?? "Paciente não disponível"}
                  </dd>
                </div>
                <div>
                  <dt className="font-medium text-hp-muted">Profissional</dt>
                  <dd className="mt-1 text-hp-foreground">
                    {selectedProfessional?.display_name ?? "Profissional não disponível"}
                  </dd>
                </div>
                <div>
                  <dt className="font-medium text-hp-muted">Unidade</dt>
                  <dd className="mt-1 text-hp-foreground">{unitName}</dd>
                </div>
                <div>
                  <dt className="font-medium text-hp-muted">Endereço</dt>
                  <dd className="mt-1 text-hp-foreground">
                    {clinicAddress ?? "Não cadastrado"}
                  </dd>
                </div>
              </dl>
              {selectedAppointment.notes ? (
                <div>
                  <h3 className="text-sm font-medium text-hp-muted">Observações</h3>
                  <p className="mt-1 whitespace-pre-wrap break-words text-sm text-hp-foreground">
                    {selectedAppointment.notes}
                  </p>
                </div>
              ) : null}
              {actionError ? <Alert variant="danger" description={actionError} /> : null}
            </div>
          ) : null}

          <DialogFooter>
            <DialogClose className="inline-flex min-h-11 items-center justify-center rounded-[var(--radius-md)] px-4 font-semibold text-hp-foreground hover:bg-hp-surface-subtle">
              Fechar
            </DialogClose>
            {selectedAppointment ? (
              <DropdownMenu>
                <DropdownMenuTrigger
                  aria-label={`Ações de ${selectedAppointment.service_name_snapshot}`}
                  disabled={actionBusy}
                  className="inline-flex size-10 items-center justify-center rounded-[var(--radius-md)] text-xl font-bold text-hp-muted hover:bg-hp-surface-subtle hover:text-hp-foreground focus-visible:outline-2 focus-visible:outline-hp-focus disabled:pointer-events-none disabled:opacity-50"
                >
                  •••
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem
                    onSelect={() => {
                      if (!clinicAddress) {
                        setActionError("Cadastre o endereço da unidade antes de enviar a confirmação.");
                      } else if (!selectedPatientPhone) {
                        setActionError("Cadastre o WhatsApp ou telefone do paciente antes de enviar a confirmação.");
                      } else if (selectedSharing) {
                        openExternal(selectedSharing.whatsappUrl);
                      }
                    }}
                  >
                    Enviar confirmação pelo WhatsApp
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    disabled={!selectedSharing}
                    onSelect={() => selectedSharing && openExternal(selectedSharing.calendarUrl)}
                  >
                    Adicionar à agenda
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    disabled={!selectedSharing}
                    onSelect={() => selectedSharing && openExternal(selectedSharing.mapsUrl)}
                  >
                    Abrir endereço no Maps
                  </DropdownMenuItem>
                  {(canEditAppointment && selectedMutable) ||
                  (canUpdate && isMaster && !selectedMutable) ||
                  (canUpdate && selectedActions.length > 0) ||
                  canDelete ? <DropdownMenuSeparator /> : null}
                  {canEditAppointment && selectedMutable ? (
                    <DropdownMenuItem onSelect={() => openEditor("edit")}>Editar agendamento</DropdownMenuItem>
                  ) : null}
                  {canEditAppointment && selectedMutable ? (
                    <DropdownMenuItem onSelect={() => openEditor("reschedule")}>Reagendar</DropdownMenuItem>
                  ) : null}
                  {canUpdate && isMaster && !selectedMutable ? (
                    <DropdownMenuItem onSelect={() => openEditor("correct")}>Corrigir observações</DropdownMenuItem>
                  ) : null}
                  {canUpdate
                    ? selectedActions.map(({ action, label }) => (
                        <DropdownMenuItem
                          key={action}
                          variant={action === "cancel" ? "danger" : undefined}
                          onSelect={() => void runAction(action)}
                        >
                          {label}
                        </DropdownMenuItem>
                      ))
                    : null}
                  {canDelete ? <DropdownMenuSeparator /> : null}
                  {canDelete ? (
                    <DropdownMenuItem
                      variant="danger"
                      onSelect={() => {
                        setDeleteReason("");
                        setDeleteTarget(selectedAppointment);
                        setSelectedAppointment(null);
                      }}
                    >
                      Remover agendamento
                    </DropdownMenuItem>
                  ) : null}
                </DropdownMenuContent>
              </DropdownMenu>
            ) : null}
          </DialogFooter>
          </DialogContent>
        </Dialog>
      ) : null}

      <Dialog open={deleteTarget !== null} onOpenChange={(open) => {
        if (!open && !actionBusy) { setDeleteTarget(null); setDeleteReason(""); }
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Remover agendamento da agenda?</DialogTitle>
            <DialogDescription>Esta é uma remoção lógica exclusiva do usuário master. O histórico e os lançamentos financeiros vinculados serão preservados para auditoria.</DialogDescription>
          </DialogHeader>
          <Select label="Motivo da remoção" required value={deleteReason} options={deletionReasonOptions} onChange={(event) => setDeleteReason(event.target.value)} />
          {actionError ? <Alert variant="danger" description={actionError} /> : null}
          <DialogFooter>
            <DialogClose className="inline-flex min-h-11 items-center justify-center rounded-[var(--radius-md)] px-4 font-semibold text-hp-foreground hover:bg-hp-surface-subtle">Voltar</DialogClose>
            <Button variant="danger" loading={actionBusy} disabled={!deleteReason} onClick={() => void confirmDelete()}>Remover agendamento</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {editorMode ? (
        <AppointmentEditor
          key={`${editorMode}:${editorAppointment?.id ?? "new"}:${editorKey}`}
          mode={editorMode}
          appointment={editorAppointment}
          timezone={timezone}
          initialDate={resolvedSelectedDay}
          patients={patients}
          professionals={professionals}
          services={services}
          referencesLoading={referencesLoading}
          referencesError={referencesError}
          onClose={() => {
            setEditorMode(null);
            setEditorAppointment(null);
          }}
          onSaved={handleSaved}
        />
      ) : null}
    </div>
  );
}

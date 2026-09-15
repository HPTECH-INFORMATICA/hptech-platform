"use client";

import { useEffect, useMemo, useState } from "react";

import Alert from "@/components/ui/Alert";
import Badge, { type BadgeProps } from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import EmptyState from "@/components/ui/EmptyState";
import PageHeader from "@/components/ui/PageHeader";
import Select from "@/components/ui/Select";
import Skeleton from "@/components/ui/Skeleton";
import {
  listAppointments,
  type AppointmentData,
  type AppointmentStatus,
} from "@/services/appointment-service";
import {
  listProfessionals,
  type ProfessionalData,
} from "@/services/professional-service";

const DAY_IN_MS = 86_400_000;
const QUERY_PADDING_IN_MS = 14 * 60 * 60 * 1000;

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
  timezone: string;
  initialDate: string;
};

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

function AppointmentCard({
  appointment,
  timezone,
}: {
  appointment: AppointmentData;
  timezone: string;
}) {
  const status = statusPresentation[appointment.status];
  return (
    <Card variant="subtle" padding="sm" className="space-y-2">
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
      <p className="text-xs text-hp-muted">
        {appointment.service_duration_minutes_snapshot} min
      </p>
    </Card>
  );
}

export default function AgendaPage({ timezone, initialDate }: AgendaPageProps) {
  const [weekStart, setWeekStart] = useState(() => startOfWeek(initialDate));
  const [selectedDay, setSelectedDay] = useState(initialDate);
  const [professionals, setProfessionals] = useState<ProfessionalData[]>([]);
  const [appointments, setAppointments] = useState<AppointmentData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reload, setReload] = useState(0);

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

  function changeWeek(offset: number) {
    const nextWeek = addCivilDays(weekStart, offset * 7);
    setWeekStart(nextWeek);
    setSelectedDay(nextWeek);
  }

  function goToToday() {
    setWeekStart(startOfWeek(initialDate));
    setSelectedDay(initialDate);
  }

  const weekLabel = `${formatCivilDate(days[0], { day: "2-digit", month: "short" })} – ${formatCivilDate(days[6], { day: "2-digit", month: "short", year: "numeric" })}`;
  const dayOptions = days.map((day) => ({
    value: day,
    label: formatCivilDate(day, { weekday: "long", day: "2-digit", month: "short" }),
  }));
  const resolvedSelectedDay = days.includes(selectedDay) ? selectedDay : days[0];

  return (
    <div className="space-y-8">
      <PageHeader
        title="Agenda"
        description={`Visão operacional no fuso ${timezone}.`}
        metadata={<Badge variant="neutral">Semana de {weekLabel}</Badge>}
        actions={
          <div className="flex flex-wrap gap-2" aria-label="Navegação da agenda">
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
                      <AppointmentCard key={appointment.id} appointment={appointment} timezone={timezone} />
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
                              <AppointmentCard key={appointment.id} appointment={appointment} timezone={timezone} />
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
    </div>
  );
}

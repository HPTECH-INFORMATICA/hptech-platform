"use client";

import { useMemo, useRef, useState } from "react";

import Alert from "@/components/ui/Alert";
import Button from "@/components/ui/Button";
import Dialog, {
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/Dialog";
import Input from "@/components/ui/Input";
import Select from "@/components/ui/Select";
import Textarea from "@/components/ui/Textarea";
import {
  civilDateTimeInTimezone,
  formatUtcOffset,
  getValidUtcOffsets,
} from "@/lib/appointment-time";
import {
  createAppointment,
  rescheduleAppointment,
  updateAppointment,
  type AppointmentData,
} from "@/services/appointment-service";
import type { PatientData } from "@/services/patient-service";
import {
  listPatientPlanContracts,
  type PatientPlanContractData,
} from "@/services/patient-plan-contract-service";
import type { ProfessionalData } from "@/services/professional-service";
import type { ServiceData } from "@/services/service-service";

export type AppointmentEditorMode = "create" | "edit" | "reschedule" | "correct";

type AppointmentEditorProps = {
  mode: AppointmentEditorMode;
  appointment: AppointmentData | null;
  timezone: string;
  initialDate: string;
  patients: PatientData[];
  professionals: ProfessionalData[];
  services: ServiceData[];
  referencesLoading: boolean;
  referencesError: string | null;
  onClose: () => void;
  onSaved: (appointment: AppointmentData) => void;
};

function mutationError(error: unknown): string {
  if (error instanceof Error && error.message) return error.message;
  return "Não foi possível salvar o agendamento.";
}

export default function AppointmentEditor({
  mode,
  appointment,
  timezone,
  initialDate,
  patients,
  professionals,
  services,
  referencesLoading,
  referencesError,
  onClose,
  onSaved,
}: AppointmentEditorProps) {
  const [patientId, setPatientId] = useState(appointment?.patient_id ?? "");
  const [professionalId, setProfessionalId] = useState(
    appointment?.professional_id ?? "",
  );
  const [serviceId, setServiceId] = useState(appointment?.service_id ?? "");
  const [planItemId, setPlanItemId] = useState("STANDALONE");
  const [planContracts, setPlanContracts] = useState<PatientPlanContractData[]>([]);
  const [plansLoading, setPlansLoading] = useState(false);
  const [plansError, setPlansError] = useState<string | null>(null);
  const planRequest = useRef(0);
  const [localDateTime, setLocalDateTime] = useState(
    appointment
      ? civilDateTimeInTimezone(appointment.starts_at, timezone)
      : `${initialDate}T09:00`,
  );
  const [duration, setDuration] = useState(
    String(appointment?.service_duration_minutes_snapshot ?? 60),
  );
  const [notes, setNotes] = useState(appointment?.notes ?? "");
  const [selectedOffset, setSelectedOffset] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const usesCivilTime = mode === "create" || mode === "reschedule";
  const offsets = useMemo(
    () => (usesCivilTime ? getValidUtcOffsets(localDateTime, timezone) : []),
    [localDateTime, timezone, usesCivilTime],
  );
  const ambiguous = offsets.length > 1;
  const nonexistent = usesCivilTime && localDateTime.length > 0 && offsets.length === 0;
  const offset = ambiguous
    ? selectedOffset === ""
      ? null
      : Number(selectedOffset)
    : offsets[0] ?? null;
  const durationNumber = Number(duration);
  const eligiblePlanItems = useMemo(
    () =>
      planContracts.flatMap((contract) =>
        contract.status === "ACTIVE" &&
        contract.starts_on <= localDateTime.slice(0, 10) &&
        contract.expires_on >= localDateTime.slice(0, 10)
          ? contract.items
              .filter(
                (item) =>
                  item.service_id === serviceId &&
                  item.paid_available + item.complimentary_available > 0,
              )
              .map((item) => ({ contract, item }))
          : [],
      ),
    [localDateTime, planContracts, serviceId],
  );
  const referencesReady =
    !referencesLoading &&
    !referencesError &&
    patients.length > 0 &&
    professionals.length > 0 &&
    services.length > 0;
  const formValid =
    mode === "correct"
      ? Boolean(appointment)
      : mode === "reschedule"
      ? Boolean(localDateTime && offset !== null && durationNumber > 0)
      : mode === "create"
        ? Boolean(
            referencesReady &&
              patientId &&
              professionalId &&
              serviceId &&
              localDateTime &&
              offset !== null,
          )
        : Boolean(
            referencesReady &&
              patientId &&
              professionalId &&
              serviceId &&
              durationNumber > 0,
          );

  async function loadPatientPlans(nextPatientId: string) {
    const request = ++planRequest.current;
    setPlanContracts([]);
    setPlansError(null);
    if (!nextPatientId) {
      setPlansLoading(false);
      return;
    }
    setPlansLoading(true);
    try {
      const result = await listPatientPlanContracts(nextPatientId);
      if (request === planRequest.current) setPlanContracts(result.items);
    } catch (reason) {
      if (request === planRequest.current) {
        setPlansError(
          reason instanceof Error && reason.message
            ? reason.message
            : "Não foi possível consultar os planos.",
        );
      }
    } finally {
      if (request === planRequest.current) setPlansLoading(false);
    }
  }

  async function save() {
    if (!formValid) return;
    setSaving(true);
    setError(null);
    try {
      let saved: AppointmentData;
      if (mode === "create") {
        saved = await createAppointment({
          patient_id: patientId,
          professional_id: professionalId,
          service_id: serviceId,
          ...(planItemId === "STANDALONE"
            ? {}
            : { patient_plan_contract_item_id: planItemId }),
          lead_id: null,
          starts_at: {
            local_datetime: `${localDateTime}:00`,
            utc_offset_minutes: offset,
          },
          notes: notes.trim() || null,
        });
      } else if (mode === "reschedule" && appointment) {
        saved = await rescheduleAppointment(appointment.id, {
          starts_at: {
            local_datetime: `${localDateTime}:00`,
            utc_offset_minutes: offset,
          },
          duration_minutes: durationNumber,
        });
      } else if (mode === "correct" && appointment) {
        saved = await updateAppointment(appointment.id, {
          notes: notes.trim() || null,
        });
      } else if (appointment) {
        saved = await updateAppointment(appointment.id, {
          patient_id: patientId,
          professional_id: professionalId,
          service_id: serviceId,
          duration_minutes: durationNumber,
          notes: notes.trim() || null,
        });
      } else {
        return;
      }
      onSaved(saved);
    } catch (reason) {
      setError(mutationError(reason));
    } finally {
      setSaving(false);
    }
  }

  const title =
    mode === "create"
      ? "Novo agendamento"
      : mode === "reschedule"
        ? "Reagendar atendimento"
        : mode === "correct"
          ? "Corrigir observações"
          : "Editar agendamento";

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>
            Horários são interpretados no fuso {timezone} e validados pelo servidor.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {referencesError && mode !== "reschedule" && mode !== "correct" ? (
            <Alert variant="danger" description={referencesError} />
          ) : null}

          {mode !== "reschedule" && mode !== "correct" ? (
            <>
              <Select
                label="Paciente"
                required
                disabled={referencesLoading}
                placeholder="Selecione o paciente"
                value={patientId}
                options={patients.map((patient) => ({
                  value: patient.id,
                  label: patient.name,
                }))}
                onChange={(event) => {
                  const nextPatientId = event.target.value;
                  setPatientId(nextPatientId);
                  setPlanItemId("STANDALONE");
                  void loadPatientPlans(nextPatientId);
                }}
              />
              <Select
                label="Profissional"
                required
                disabled={referencesLoading}
                placeholder="Selecione o profissional"
                value={professionalId}
                options={professionals.map((professional) => ({
                  value: professional.id,
                  label: professional.display_name,
                }))}
                onChange={(event) => setProfessionalId(event.target.value)}
              />
              <Select
                label="Serviço"
                required
                disabled={referencesLoading}
                placeholder="Selecione o serviço"
                value={serviceId}
                options={services.map((service) => ({
                  value: service.id,
                  label: `${service.name} — ${service.duration_minutes} min`,
                }))}
                onChange={(event) => {
                  const nextServiceId = event.target.value;
                  setServiceId(nextServiceId);
                  setPlanItemId("STANDALONE");
                  const service = services.find((item) => item.id === nextServiceId);
                  if (service) setDuration(String(service.duration_minutes));
                }}
              />
              {mode === "create" && patientId && serviceId ? (
                <Select
                  label="Forma do atendimento"
                  value={planItemId}
                  disabled={plansLoading}
                  options={[
                    { value: "STANDALONE", label: "Serviço avulso" },
                    ...eligiblePlanItems.map(({ contract, item }) => ({
                      value: item.id,
                      label: `${contract.plan_name_snapshot} — ${
                        item.paid_available + item.complimentary_available
                      } sessões disponíveis (${item.paid_available} pagas + ${
                        item.complimentary_available
                      } cortesias)`,
                    })),
                  ]}
                  description={
                    plansLoading
                      ? "Consultando planos ativos do paciente..."
                      : eligiblePlanItems.length > 0
                        ? "Ao usar um plano, a sessão é reservada agora e consumida somente ao concluir."
                        : "Nenhum plano ativo com saldo para este serviço. O atendimento será avulso."
                  }
                  onChange={(event) => setPlanItemId(event.target.value)}
                />
              ) : null}
              {plansError ? (
                <Alert
                  variant="warning"
                  description={`Não foi possível consultar os planos. O atendimento ainda pode ser criado como avulso. ${plansError}`}
                />
              ) : null}
            </>
          ) : null}

          {usesCivilTime ? (
            <Input
              label="Data e hora"
              type="datetime-local"
              required
              value={localDateTime}
              error={
                nonexistent
                  ? "Este horário não existe no fuso da empresa."
                  : undefined
              }
              onChange={(event) => {
                setLocalDateTime(event.target.value);
                setSelectedOffset("");
                setPlanItemId("STANDALONE");
              }}
            />
          ) : null}

          {ambiguous ? (
            <Select
              label="Ocorrência do horário"
              required
              placeholder="Selecione o offset correto"
              value={selectedOffset}
              options={offsets.map((value) => ({
                value: String(value),
                label: formatUtcOffset(value),
              }))}
              description="O horário ocorre duas vezes devido à mudança de fuso."
              onChange={(event) => setSelectedOffset(event.target.value)}
            />
          ) : null}

          {mode !== "create" && mode !== "correct" ? (
            <Input
              label="Duração"
              type="number"
              min={1}
              max={1440}
              required
              value={duration}
              suffix="min"
              onChange={(event) => setDuration(event.target.value)}
            />
          ) : null}

          {mode !== "reschedule" ? (
            <Textarea
              label="Observações"
              maxLength={4000}
              showCount
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
            />
          ) : null}

          {error ? <Alert variant="danger" description={error} /> : null}
        </div>

        <DialogFooter>
          <DialogClose className="inline-flex min-h-11 items-center justify-center rounded-[var(--radius-md)] px-4 font-semibold text-hp-foreground hover:bg-hp-surface-subtle">
            Cancelar
          </DialogClose>
          <Button loading={saving} disabled={!formValid} onClick={() => void save()}>
            {mode === "create" ? "Criar agendamento" : "Salvar alterações"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

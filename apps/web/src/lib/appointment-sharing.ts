type AppointmentSharingInput = {
  clinicName: string;
  unitName: string;
  address: string;
  patientName: string;
  patientPhone: string;
  professionalName: string;
  serviceName: string;
  planName?: string | null;
  planSessionSequence?: number | null;
  planSessionsTotal?: number | null;
  startsAt: string;
  endsAt: string;
  timezone: string;
};

export type AppointmentSharing = {
  calendarUrl: string;
  mapsUrl: string;
  whatsappUrl: string;
  message: string;
};

function compactUtc(value: string): string {
  return new Date(value).toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
}

function phoneDigits(value: string): string {
  const digits = value.replace(/\D/g, "");
  if (!digits) return "";
  return digits.startsWith("55") ? digits : `55${digits}`;
}

export function buildAppointmentSharing(
  input: AppointmentSharingInput,
): AppointmentSharing {
  const date = new Intl.DateTimeFormat("pt-BR", {
    timeZone: input.timezone,
    weekday: "long",
    day: "2-digit",
    month: "long",
    year: "numeric",
  }).format(new Date(input.startsAt));
  const time = new Intl.DateTimeFormat("pt-BR", {
    timeZone: input.timezone,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(new Date(input.startsAt));
  const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(input.address)}`;
  const calendarParameters = new URLSearchParams({
    action: "TEMPLATE",
    text: `${input.serviceName} — ${input.clinicName}`,
    dates: `${compactUtc(input.startsAt)}/${compactUtc(input.endsAt)}`,
    details: `Atendimento com ${input.professionalName}.`,
    location: input.address,
  });
  const calendarUrl = `https://calendar.google.com/calendar/render?${calendarParameters.toString()}`;
  const message = [
    `Olá, ${input.patientName}.`,
    "",
    `Seu agendamento na ${input.clinicName} está marcado:`,
    `Unidade: ${input.unitName}`,
    `Endereço: ${input.address}`,
    `Data: ${date}`,
    `Horário: ${time}`,
    `Serviço: ${input.serviceName}`,
    ...(input.planName
      ? [
          `Plano: ${input.planName}`,
          input.planSessionSequence && input.planSessionsTotal
            ? `Sessão: ${input.planSessionSequence} de ${input.planSessionsTotal}`
            : "",
        ].filter(Boolean)
      : []),
    `Profissional: ${input.professionalName}`,
    "",
    `Adicionar à agenda: ${calendarUrl}`,
    `Como chegar: ${mapsUrl}`,
  ].join("\n");
  const whatsappParameters = new URLSearchParams({ text: message });

  return {
    calendarUrl,
    mapsUrl,
    whatsappUrl: `https://wa.me/${phoneDigits(input.patientPhone)}?${whatsappParameters.toString()}`,
    message,
  };
}

import assert from "node:assert/strict";
import test from "node:test";

import { buildAppointmentSharing } from "../src/lib/appointment-sharing.ts";
import { clinicUnitName, formatClinicAddress } from "../src/lib/clinic-location.ts";

const clinic = {
  name: "Clínica Exemplo",
  primary_unit_name: "Unidade Centro",
  address_line: "Rua das Flores, 100",
  address_complement: "Sala 12",
  address_district: "Centro",
  address_city: "Curitiba",
  address_state: "PR",
  address_postal_code: "80000-000",
};

test("formats the primary clinic location", () => {
  assert.equal(clinicUnitName(clinic), "Unidade Centro");
  assert.equal(
    formatClinicAddress(clinic),
    "Rua das Flores, 100, Sala 12, Centro, Curitiba - PR, CEP 80000-000",
  );
});

test("builds WhatsApp, calendar and Maps links with the appointment context", () => {
  const sharing = buildAppointmentSharing({
    clinicName: clinic.name,
    unitName: clinicUnitName(clinic),
    address: formatClinicAddress(clinic),
    patientName: "Maria Silva",
    patientPhone: "(41) 99999-0000",
    professionalName: "Dra. Ana",
    serviceName: "Avaliação capilar",
    startsAt: "2026-10-05T13:00:00.000Z",
    endsAt: "2026-10-05T14:00:00.000Z",
    timezone: "America/Sao_Paulo",
  });

  assert.match(sharing.whatsappUrl, /^https:\/\/wa\.me\/5541999990000\?/);
  assert.match(sharing.calendarUrl, /^https:\/\/calendar\.google\.com\/calendar\/render\?/);
  assert.match(sharing.mapsUrl, /^https:\/\/www\.google\.com\/maps\/search\//);
  assert.match(sharing.message, /Unidade: Unidade Centro/);
  assert.match(sharing.message, /Endereço: Rua das Flores, 100/);
  assert.match(sharing.message, /Adicionar à agenda: https:\/\/calendar\.google\.com/);
  assert.match(sharing.message, /Como chegar: https:\/\/www\.google\.com\/maps/);
});

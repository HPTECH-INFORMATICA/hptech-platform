import assert from "node:assert/strict";
import test from "node:test";

import {
  AppointmentApiError,
  listAppointments,
} from "../src/services/appointment-service.ts";

function appointment(id) {
  return {
    id,
    patient_id: "10000000-0000-4000-8000-000000000001",
    professional_id: "20000000-0000-4000-8000-000000000001",
    service_id: "30000000-0000-4000-8000-000000000001",
    lead_id: null,
    service_name_snapshot: "Consulta",
    service_duration_minutes_snapshot: 60,
    service_price_snapshot: "150.00",
    starts_at: "2026-09-14T12:00:00Z",
    ends_at: "2026-09-14T13:00:00Z",
    status: "SCHEDULED",
    notes: null,
    created_at: "2026-09-01T12:00:00Z",
    updated_at: "2026-09-01T12:00:00Z",
  };
}

test("agenda consumes every paginated Appointment result", async (context) => {
  const originalFetch = globalThis.fetch;
  const requestedPages = [];
  context.after(() => {
    globalThis.fetch = originalFetch;
  });
  globalThis.fetch = async (input, init) => {
    const url = new URL(String(input), "http://localhost");
    requestedPages.push(url.searchParams.get("page"));
    assert.equal(init?.cache, "no-store");
    assert.equal(url.searchParams.get("from"), "2026-09-14T00:00:00.000Z");
    assert.equal(url.searchParams.get("to"), "2026-09-21T00:00:00.000Z");
    const page = Number(url.searchParams.get("page"));
    return Response.json({
      items: [appointment(`00000000-0000-4000-8000-00000000000${page}`)],
      total: 201,
      page,
      page_size: 100,
    });
  };

  const result = await listAppointments(
    "2026-09-14T00:00:00.000Z",
    "2026-09-21T00:00:00.000Z",
  );

  assert.deepEqual(requestedPages.sort(), ["1", "2", "3"]);
  assert.equal(result.length, 3);
});

test("agenda exposes the sanitized BFF error", async (context) => {
  const originalFetch = globalThis.fetch;
  context.after(() => {
    globalThis.fetch = originalFetch;
  });
  globalThis.fetch = async () =>
    Response.json({ error: "Sessão inválida." }, { status: 401 });

  await assert.rejects(
    () =>
      listAppointments(
        "2026-09-14T00:00:00.000Z",
        "2026-09-21T00:00:00.000Z",
      ),
    (error) =>
      error instanceof AppointmentApiError &&
      error.status === 401 &&
      error.message === "Sessão inválida.",
  );
});

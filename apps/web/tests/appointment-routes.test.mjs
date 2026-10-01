import assert from "node:assert/strict";
import test from "node:test";

import {
  appointmentListQueryKeys,
  resolveAppointmentBackendTarget,
  validateAppointmentQuery,
} from "../src/lib/appointment-routes.ts";

const id = "123e4567-e89b-42d3-a456-426614174000";

test("BFF exposes only the official Appointment routes", () => {
  assert.deepEqual(resolveAppointmentBackendTarget(undefined, "GET"), {
    path: "/appointments",
    queryKeys: appointmentListQueryKeys,
  });
  assert.equal(
    resolveAppointmentBackendTarget([id], "PATCH")?.path,
    `/appointments/${id}`,
  );
  for (const action of [
    "reschedule",
    "confirm",
    "start",
    "complete",
    "cancel",
    "no-show",
  ]) {
    assert.equal(
      resolveAppointmentBackendTarget([id, action], "POST")?.path,
      `/appointments/${id}/${action}`,
    );
  }
  assert.equal(
    resolveAppointmentBackendTarget([id], "DELETE")?.path,
    `/appointments/${id}`,
  );
  assert.equal(resolveAppointmentBackendTarget([id, "unknown"], "POST"), null);
});

test("BFF list query is allowlisted and validates identifiers", () => {
  assert.equal(
    validateAppointmentQuery(
      new URLSearchParams(
        `from=2026-09-15T00%3A00%3A00Z&to=2026-09-16T00%3A00%3A00Z&professional_id=${id}`,
      ),
      appointmentListQueryKeys,
    ),
    null,
  );
  assert.match(
    validateAppointmentQuery(
      new URLSearchParams("company_id=forbidden"),
      appointmentListQueryKeys,
    ),
    /não permitido/i,
  );
  assert.match(
    validateAppointmentQuery(
      new URLSearchParams("patient_id=invalid"),
      appointmentListQueryKeys,
    ),
    /inválido/i,
  );
});

test("detail and mutations reject query parameters", () => {
  assert.equal(validateAppointmentQuery(new URLSearchParams(), null), null);
  assert.match(
    validateAppointmentQuery(new URLSearchParams("status=SCHEDULED"), null),
    /não permitidos/i,
  );
});

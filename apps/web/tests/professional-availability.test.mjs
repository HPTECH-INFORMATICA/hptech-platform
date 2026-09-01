import assert from "node:assert/strict";
import test from "node:test";

import {
  exceptionPayload,
  isPastCivilDate,
  normalizeCivilTime,
  normalizeWeeklyIntervals,
  todayInTimezone,
  validateExceptionDraft,
  validateWeeklyIntervals,
  weeklyIntervalsEqual,
  weeklyPayload,
} from "../src/lib/professional-availability.ts";

test("normaliza horários e ordena a grade semanal", () => {
  const normalized = normalizeWeeklyIntervals([
    { weekday: 2, start_time: "13:00:00", end_time: "17:00:00" },
    { weekday: 0, start_time: "09:00:00", end_time: "12:00:00" },
  ]);
  assert.deepEqual(normalized, [
    { weekday: 0, start_time: "09:00", end_time: "12:00" },
    { weekday: 2, start_time: "13:00", end_time: "17:00" },
  ]);
  assert.equal(normalizeCivilTime("08:30:45"), "08:30");
});

test("aceita grade vazia, múltiplos intervalos adjacentes e payload normalizado", () => {
  assert.equal(validateWeeklyIntervals([]), null);
  const intervals = [
    { weekday: 0, start_time: "12:00", end_time: "18:00" },
    { weekday: 0, start_time: "08:00", end_time: "12:00" },
  ];
  assert.equal(validateWeeklyIntervals(intervals), null);
  assert.deepEqual(weeklyPayload(intervals).intervals[0], {
    weekday: 0,
    start_time: "08:00",
    end_time: "12:00",
  });
});

test("rejeita overnight, horários incompletos e overlap", () => {
  assert.match(
    validateWeeklyIntervals([{ weekday: 0, start_time: "18:00", end_time: "08:00" }]),
    /anterior/i,
  );
  assert.match(
    validateWeeklyIntervals([{ weekday: 0, start_time: "", end_time: "08:00" }]),
    /preencha/i,
  );
  assert.match(
    validateWeeklyIntervals([
      { weekday: 0, start_time: "08:00", end_time: "12:00" },
      { weekday: 0, start_time: "11:00", end_time: "13:00" },
    ]),
    /sobrepor/i,
  );
});

test("dirty state semanal é semântico", () => {
  assert.equal(
    weeklyIntervalsEqual(
      [{ weekday: 1, start_time: "09:00:00", end_time: "10:00:00" }],
      [{ weekday: 1, start_time: "09:00", end_time: "10:00" }],
    ),
    true,
  );
});

test("valida e gera payloads AVAILABLE e UNAVAILABLE", () => {
  assert.match(
    validateExceptionDraft({
      local_date: "2026-09-01",
      kind: "AVAILABLE",
      full_day: true,
      start_time: "",
      end_time: "",
    }),
    /exige horários/i,
  );
  const unavailable = {
    local_date: "2026-09-01",
    kind: "UNAVAILABLE",
    full_day: true,
    start_time: "",
    end_time: "",
  };
  assert.equal(validateExceptionDraft(unavailable), null);
  assert.deepEqual(exceptionPayload(unavailable), {
    local_date: "2026-09-01",
    kind: "UNAVAILABLE",
    start_time: null,
    end_time: null,
  });
});

test("compara datas civis e calcula hoje no timezone da empresa", () => {
  assert.equal(isPastCivilDate("2026-08-29", "2026-08-30"), true);
  assert.equal(isPastCivilDate("2026-08-30", "2026-08-30"), false);
  assert.equal(
    todayInTimezone("America/Sao_Paulo", new Date("2026-08-30T01:00:00Z")),
    "2026-08-29",
  );
});

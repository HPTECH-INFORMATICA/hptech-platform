import assert from "node:assert/strict";
import test from "node:test";

import {
  civilDateTimeInTimezone,
  formatUtcOffset,
  getValidUtcOffsets,
} from "../src/lib/appointment-time.ts";

test("civil datetime is rendered in the company timezone", () => {
  assert.equal(
    civilDateTimeInTimezone("2026-09-15T12:30:00Z", "America/Sao_Paulo"),
    "2026-09-15T09:30",
  );
  assert.deepEqual(
    getValidUtcOffsets("2026-09-15T09:30", "America/Sao_Paulo"),
    [-180],
  );
});

test("DST gaps are rejected and repeated times require an explicit offset", () => {
  assert.deepEqual(
    getValidUtcOffsets("2026-03-08T02:30", "America/New_York"),
    [],
  );
  assert.deepEqual(
    getValidUtcOffsets("2026-11-01T01:30", "America/New_York"),
    [-300, -240],
  );
});

test("offset labels are human-readable without changing the value", () => {
  assert.equal(formatUtcOffset(-180), "UTC−03:00");
  assert.equal(formatUtcOffset(330), "UTC+05:30");
});

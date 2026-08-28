import assert from "node:assert/strict";
import test from "node:test";

import {
  filterTimezoneIdentifiers,
  getCompanyTimezoneOptions,
  getTimezoneIdentifiers,
} from "../src/lib/timezones.ts";

const requiredTimezones = [
  "America/Sao_Paulo",
  "America/Manaus",
  "Europe/Lisbon",
];

test("fallback contains required IANA identifiers without runtime support", () => {
  const values = getTimezoneIdentifiers("America/Sao_Paulo", () => []);
  for (const timezone of requiredTimezones) {
    assert.ok(values.includes(timezone));
  }
});

test("fallback survives an incompatible runtime source", () => {
  const values = getTimezoneIdentifiers("America/Sao_Paulo", () => {
    throw new RangeError("unsupported");
  });
  assert.ok(values.includes("America/Manaus"));
});

test("partial search is case-insensitive and preserves current value", () => {
  const values = getTimezoneIdentifiers("America/Sao_Paulo", () => []);
  assert.deepEqual(
    filterTimezoneIdentifiers(values, "Manaus", "America/Sao_Paulo"),
    ["America/Manaus", "America/Sao_Paulo"],
  );
  assert.deepEqual(
    filterTimezoneIdentifiers(values, "lisbon", "America/Sao_Paulo"),
    ["America/Sao_Paulo", "Europe/Lisbon"],
  );
  assert.ok(
    filterTimezoneIdentifiers(values, "SAO", "America/Sao_Paulo").includes(
      "America/Sao_Paulo",
    ),
  );
});

test("an existing current value is preserved even outside both sources", () => {
  const current = "Custom/Existing";
  assert.ok(getTimezoneIdentifiers(current, () => []).includes(current));
});

test("CompanyPanel transformation searches canonical IANA identifiers", () => {
  const source = () => [];
  assert.deepEqual(
    getCompanyTimezoneOptions("America/Sao_Paulo", "Manaus", source),
    [
      { value: "America/Manaus", label: "America/Manaus" },
      { value: "America/Sao_Paulo", label: "America/Sao_Paulo" },
    ],
  );
  assert.ok(
    getCompanyTimezoneOptions("America/Sao_Paulo", "Lisbon", source).some(
      (option) => option.value === "Europe/Lisbon",
    ),
  );
  assert.ok(
    getCompanyTimezoneOptions("America/Sao_Paulo", "Sao", source).some(
      (option) => option.value === "America/Sao_Paulo",
    ),
  );
});

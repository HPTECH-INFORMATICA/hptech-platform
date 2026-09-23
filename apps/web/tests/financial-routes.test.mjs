import assert from "node:assert/strict";
import test from "node:test";

import {
  financialListQueryKeys,
  financialSummaryQueryKeys,
  resolveFinancialBackendTarget,
  validateFinancialQuery,
} from "../src/lib/financial-routes.ts";

const id = "123e4567-e89b-42d3-a456-426614174000";

test("BFF exposes only the official Financial routes", () => {
  assert.deepEqual(resolveFinancialBackendTarget(undefined, "GET"), {
    path: "/financial/transactions",
    queryKeys: financialListQueryKeys,
  });
  assert.equal(
    resolveFinancialBackendTarget([id], "DELETE")?.path,
    `/financial/transactions/${id}`,
  );
  assert.equal(
    resolveFinancialBackendTarget([id, "pay"], "POST")?.path,
    `/financial/transactions/${id}/pay`,
  );
  assert.equal(
    resolveFinancialBackendTarget([id, "cancel"], "POST")?.path,
    `/financial/transactions/${id}/cancel`,
  );
  assert.equal(resolveFinancialBackendTarget([id, "unknown"], "POST"), null);
  assert.equal(resolveFinancialBackendTarget(["invalid"], "GET"), null);
});

test("BFF list query is allowlisted and validates enums and pages", () => {
  assert.equal(
    validateFinancialQuery(
      new URLSearchParams(
        "due_from=2026-09-01&due_to=2026-09-30&type=INCOME&status=PENDING&page=1&page_size=20",
      ),
      financialListQueryKeys,
    ),
    null,
  );
  assert.match(
    validateFinancialQuery(
      new URLSearchParams("company_id=forbidden"),
      financialListQueryKeys,
    ),
    /não permitido/i,
  );
  assert.match(
    validateFinancialQuery(
      new URLSearchParams("status=UNKNOWN"),
      financialListQueryKeys,
    ),
    /inválido/i,
  );
  assert.match(
    validateFinancialQuery(
      new URLSearchParams("page=0"),
      financialListQueryKeys,
    ),
    /inválido/i,
  );
});

test("detail and mutations reject query parameters", () => {
  assert.equal(validateFinancialQuery(new URLSearchParams(), null), null);
  assert.match(
    validateFinancialQuery(new URLSearchParams("status=PENDING"), null),
    /não permitidos/i,
  );
});

test("summary accepts only the financial period", () => {
  assert.equal(
    validateFinancialQuery(
      new URLSearchParams("due_from=2026-09-01&due_to=2026-09-30"),
      financialSummaryQueryKeys,
    ),
    null,
  );
  assert.match(
    validateFinancialQuery(
      new URLSearchParams("status=PAID"),
      financialSummaryQueryKeys,
    ),
    /não permitido/i,
  );
});

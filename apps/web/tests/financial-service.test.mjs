import assert from "node:assert/strict";
import test from "node:test";

import {
  cancelFinancialTransaction,
  createFinancialTransaction,
  deleteFinancialTransaction,
  FinancialApiError,
  listFinancialTransactions,
  payFinancialTransaction,
  updateFinancialTransaction,
} from "../src/services/financial-service.ts";

function transaction(id) {
  return {
    id,
    lead_id: null,
    appointment_id: null,
    description: "Consulta",
    transaction_type: "INCOME",
    category: "Atendimento",
    amount: "150.00",
    due_date: "2026-09-23",
    paid_date: null,
    status: "PENDING",
    payment_method: null,
    notes: null,
    created_at: "2026-09-23T12:00:00Z",
    updated_at: "2026-09-23T12:00:00Z",
  };
}

test("financial list preserves the allowlisted query through the BFF", async (context) => {
  const originalFetch = globalThis.fetch;
  context.after(() => { globalThis.fetch = originalFetch; });
  globalThis.fetch = async (input, init) => {
    const url = new URL(String(input), "http://localhost");
    assert.equal(url.pathname, "/api/financial/transactions");
    assert.equal(url.searchParams.get("type"), "INCOME");
    assert.equal(url.searchParams.get("status"), "PENDING");
    assert.equal(init?.cache, "no-store");
    return Response.json({ items: [transaction("id")], total: 1, page: 1, page_size: 20 });
  };

  const result = await listFinancialTransactions(
    new URLSearchParams({ type: "INCOME", status: "PENDING", page: "1", page_size: "20" }),
  );
  assert.equal(result.total, 1);
  assert.equal(result.items[0].description, "Consulta");
});

test("financial service exposes sanitized BFF errors", async (context) => {
  const originalFetch = globalThis.fetch;
  context.after(() => { globalThis.fetch = originalFetch; });
  globalThis.fetch = async () => Response.json({ error: "Sessão inválida." }, { status: 401 });

  await assert.rejects(
    () => listFinancialTransactions(new URLSearchParams({ page: "1" })),
    (error) =>
      error instanceof FinancialApiError &&
      error.status === 401 &&
      error.message === "Sessão inválida.",
  );
});

test("financial mutations use only official BFF paths and methods", async (context) => {
  const originalFetch = globalThis.fetch;
  const requests = [];
  context.after(() => { globalThis.fetch = originalFetch; });
  globalThis.fetch = async (input, init) => {
    requests.push({ path: String(input), method: init?.method });
    if (init?.method === "DELETE") return new Response(null, { status: 204 });
    return Response.json(transaction("00000000-0000-4000-8000-000000000001"));
  };
  const id = "00000000-0000-4000-8000-000000000001";

  await createFinancialTransaction({
    transaction_type: "INCOME",
    description: "Consulta",
    amount: "150.00",
    due_date: "2026-09-23",
    category: null,
    lead_id: null,
    appointment_id: null,
    notes: null,
  });
  await updateFinancialTransaction(id, {
    description: "Consulta atualizada",
    amount: "160.00",
    due_date: "2026-09-24",
    category: null,
    notes: null,
  });
  await payFinancialTransaction(id, { paid_date: "2026-09-23", payment_method: "PIX" });
  await cancelFinancialTransaction(id);
  await deleteFinancialTransaction(id);

  assert.deepEqual(requests, [
    { path: "/api/financial/transactions", method: "POST" },
    { path: `/api/financial/transactions/${id}`, method: "PATCH" },
    { path: `/api/financial/transactions/${id}/pay`, method: "POST" },
    { path: `/api/financial/transactions/${id}/cancel`, method: "POST" },
    { path: `/api/financial/transactions/${id}`, method: "DELETE" },
  ]);
});

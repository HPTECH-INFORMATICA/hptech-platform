import assert from "node:assert/strict";
import test from "node:test";

import {
  archiveLandingPage,
  createLandingPage,
  deleteLandingPage,
  LandingPageApiError,
  listLandingPages,
  publishLandingPage,
  submitPublicLandingPage,
  unpublishLandingPage,
  updateLandingPage,
} from "../src/services/landing-page-service.ts";

function landingPage(id) {
  return {
    id,
    name: "Campanha",
    slug: "campanha",
    status: "DRAFT",
    template: "BLANK",
    content: { version: 1, blocks: [] },
    seo: { title: null, description: null, canonical_url: null, no_index: false },
    published_at: null,
    created_at: "2026-09-24T12:00:00Z",
    updated_at: "2026-09-24T12:00:00Z",
  };
}

test("list preserves allowlisted query through BFF", async (context) => {
  const originalFetch = globalThis.fetch;
  context.after(() => { globalThis.fetch = originalFetch; });
  globalThis.fetch = async (input, init) => {
    const url = new URL(String(input), "http://localhost");
    assert.equal(url.pathname, "/api/landing-pages");
    assert.equal(url.searchParams.get("status"), "DRAFT");
    assert.equal(init?.cache, "no-store");
    return Response.json({ items: [landingPage("id")], total: 1, page: 1, page_size: 20 });
  };

  const result = await listLandingPages(
    new URLSearchParams({ status: "DRAFT", page: "1", page_size: "20" }),
  );
  assert.equal(result.total, 1);
});

test("public submission uses only the same-origin BFF", async (context) => {
  const originalFetch = globalThis.fetch;
  context.after(() => { globalThis.fetch = originalFetch; });
  globalThis.fetch = async (input, init) => {
    assert.equal(
      String(input),
      "/api/public/landing-pages/empresa/campanha/submissions",
    );
    assert.equal(init?.method, "POST");
    assert.equal(init?.cache, "no-store");
    assert.deepEqual(JSON.parse(String(init?.body)), {
      name: "Pessoa Exemplo",
      email: "pessoa@example.com",
      privacy_consent: true,
    });
    return Response.json({ accepted: true, message: "Recebemos seus dados." });
  };

  const result = await submitPublicLandingPage("empresa", "campanha", {
    name: "Pessoa Exemplo",
    email: "pessoa@example.com",
    privacy_consent: true,
  });
  assert.equal(result.accepted, true);
});

test("service exposes sanitized BFF errors", async (context) => {
  const originalFetch = globalThis.fetch;
  context.after(() => { globalThis.fetch = originalFetch; });
  globalThis.fetch = async () => Response.json({ error: "Sessão inválida." }, { status: 401 });

  await assert.rejects(
    () => listLandingPages(new URLSearchParams()),
    (error) =>
      error instanceof LandingPageApiError &&
      error.status === 401 &&
      error.message === "Sessão inválida.",
  );
});

test("mutations use only official BFF paths and methods", async (context) => {
  const originalFetch = globalThis.fetch;
  const requests = [];
  context.after(() => { globalThis.fetch = originalFetch; });
  globalThis.fetch = async (input, init) => {
    requests.push({ path: String(input), method: init?.method });
    if (init?.method === "DELETE") return new Response(null, { status: 204 });
    return Response.json(landingPage("00000000-0000-4000-8000-000000000001"));
  };
  const id = "00000000-0000-4000-8000-000000000001";
  const content = { version: 1, blocks: [] };
  const seo = { title: null, description: null, canonical_url: null, no_index: false };

  await createLandingPage({ name: "Campanha", slug: "campanha", template: "BLANK", content, seo });
  await updateLandingPage(id, { name: "Campanha atualizada" });
  await publishLandingPage(id);
  await unpublishLandingPage(id);
  await archiveLandingPage(id);
  await deleteLandingPage(id);

  assert.deepEqual(requests, [
    { path: "/api/landing-pages", method: "POST" },
    { path: `/api/landing-pages/${id}`, method: "PATCH" },
    { path: `/api/landing-pages/${id}/publish`, method: "POST" },
    { path: `/api/landing-pages/${id}/unpublish`, method: "POST" },
    { path: `/api/landing-pages/${id}/archive`, method: "POST" },
    { path: `/api/landing-pages/${id}`, method: "DELETE" },
  ]);
});

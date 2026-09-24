import assert from "node:assert/strict";
import test from "node:test";

import {
  landingPageListQueryKeys,
  resolveLandingPageBackendTarget,
  validateLandingPageQuery,
} from "../src/lib/landing-page-routes.ts";

const id = "123e4567-e89b-42d3-a456-426614174000";

test("BFF exposes only official Landing Pages routes", () => {
  assert.deepEqual(resolveLandingPageBackendTarget(undefined, "GET"), {
    path: "/landing-pages",
    queryKeys: landingPageListQueryKeys,
  });
  assert.equal(
    resolveLandingPageBackendTarget([id], "PATCH")?.path,
    `/landing-pages/${id}`,
  );
  for (const action of ["publish", "unpublish", "archive"]) {
    assert.equal(
      resolveLandingPageBackendTarget([id, action], "POST")?.path,
      `/landing-pages/${id}/${action}`,
    );
  }
  assert.equal(resolveLandingPageBackendTarget([id, "unknown"], "POST"), null);
  assert.equal(resolveLandingPageBackendTarget(["invalid"], "GET"), null);
});

test("BFF query allowlists status and pagination", () => {
  assert.equal(
    validateLandingPageQuery(
      new URLSearchParams("status=PUBLISHED&page=1&page_size=20"),
      landingPageListQueryKeys,
    ),
    null,
  );
  assert.match(
    validateLandingPageQuery(
      new URLSearchParams("company_id=forbidden"),
      landingPageListQueryKeys,
    ),
    /não permitido/i,
  );
  assert.match(
    validateLandingPageQuery(
      new URLSearchParams("status=UNKNOWN"),
      landingPageListQueryKeys,
    ),
    /inválido/i,
  );
  assert.match(
    validateLandingPageQuery(
      new URLSearchParams("page=0"),
      landingPageListQueryKeys,
    ),
    /inválido/i,
  );
});

test("detail and mutations reject query parameters", () => {
  assert.equal(validateLandingPageQuery(new URLSearchParams(), null), null);
  assert.match(
    validateLandingPageQuery(new URLSearchParams("status=DRAFT"), null),
    /não permitidos/i,
  );
});

import assert from "node:assert/strict";
import test from "node:test";

import {
  isPublicLandingPageSlug,
  publicLandingPageBackendPath,
  publicLandingPageSubmissionBackendPath,
} from "../src/lib/public-landing-page-routes.ts";

test("public landing page paths accept only canonical slugs", () => {
  assert.equal(isPublicLandingPageSlug("empresa-exemplo"), true);
  assert.equal(isPublicLandingPageSlug("Empresa"), false);
  assert.equal(isPublicLandingPageSlug("../empresa"), false);
  assert.equal(isPublicLandingPageSlug("empresa%2Fadmin"), false);
  assert.equal(
    publicLandingPageBackendPath("empresa-exemplo", "campanha-2026"),
    "/public/landing-pages/empresa-exemplo/campanha-2026",
  );
  assert.equal(publicLandingPageBackendPath("empresa", "../admin"), null);
});

test("submission path is derived only from a valid public page path", () => {
  assert.equal(
    publicLandingPageSubmissionBackendPath("empresa", "campanha"),
    "/public/landing-pages/empresa/campanha/submissions",
  );
  assert.equal(
    publicLandingPageSubmissionBackendPath("empresa", "//invalid"),
    null,
  );
});

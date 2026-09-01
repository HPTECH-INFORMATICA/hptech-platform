import assert from "node:assert/strict";
import test from "node:test";

import {
  professionalCandidateQueryKeys,
  professionalExceptionQueryKeys,
  professionalListQueryKeys,
  resolveProfessionalBackendTarget,
  validateProfessionalQuery,
} from "../src/lib/professional-routes.ts";

const id = "123e4567-e89b-42d3-a456-426614174000";

test("BFF allowlist resolves only the official Professional routes", () => {
  assert.deepEqual(resolveProfessionalBackendTarget(undefined, "GET"), {
    path: "/professionals",
    queryKeys: professionalListQueryKeys,
  });
  assert.deepEqual(resolveProfessionalBackendTarget(["link-candidates"], "GET"), {
    path: "/professionals/link-candidates",
    queryKeys: professionalCandidateQueryKeys,
  });
  assert.equal(
    resolveProfessionalBackendTarget([id, "status"], "PATCH")?.path,
    `/professionals/${id}/status`,
  );
  assert.equal(resolveProfessionalBackendTarget(["invalid"], "GET"), null);
  assert.equal(resolveProfessionalBackendTarget([id, "unknown"], "GET"), null);
  assert.equal(resolveProfessionalBackendTarget(undefined, "DELETE"), null);
});

test("BFF allowlist resolves the official availability routes", () => {
  assert.deepEqual(resolveProfessionalBackendTarget([id, "availability", "weekly"], "GET"), {
    path: `/professionals/${id}/availability/weekly`,
    queryKeys: null,
  });
  assert.equal(
    resolveProfessionalBackendTarget([id, "availability", "weekly"], "PUT")?.path,
    `/professionals/${id}/availability/weekly`,
  );
  assert.deepEqual(resolveProfessionalBackendTarget([id, "availability", "exceptions"], "GET"), {
    path: `/professionals/${id}/availability/exceptions`,
    queryKeys: professionalExceptionQueryKeys,
  });
  assert.equal(
    resolveProfessionalBackendTarget([id, "availability", "exceptions"], "POST")?.path,
    `/professionals/${id}/availability/exceptions`,
  );
  assert.equal(
    resolveProfessionalBackendTarget([id, "availability", "exceptions", id], "PATCH")?.path,
    `/professionals/${id}/availability/exceptions/${id}`,
  );
  assert.equal(
    resolveProfessionalBackendTarget([id, "availability", "exceptions", id], "DELETE")?.path,
    `/professionals/${id}/availability/exceptions/${id}`,
  );
  assert.equal(resolveProfessionalBackendTarget([id, "availability", "weekly"], "POST"), null);
  assert.equal(resolveProfessionalBackendTarget([id, "availability", "exceptions"], "PUT"), null);
  assert.equal(resolveProfessionalBackendTarget([id, "availability", "exceptions", "invalid"], "PATCH"), null);
});

test("list and candidate queries reject unknown parameters", () => {
  assert.equal(
    validateProfessionalQuery(
      new URLSearchParams("page=1&page_size=10&search=A&is_active=true"),
      professionalListQueryKeys,
    ),
    null,
  );
  assert.equal(
    validateProfessionalQuery(
      new URLSearchParams(`page=1&professional_id=${id}`),
      professionalCandidateQueryKeys,
    ),
    null,
  );
  assert.match(
    validateProfessionalQuery(
      new URLSearchParams("role=OWNER"),
      professionalCandidateQueryKeys,
    ),
    /nÃ£o permitido/i,
  );
  assert.match(
    validateProfessionalQuery(
      new URLSearchParams("professional_id=invalid"),
      professionalCandidateQueryKeys,
    ),
    /invÃ¡lido/i,
  );
});

test("detail and mutation targets reject every query parameter", () => {
  assert.equal(validateProfessionalQuery(new URLSearchParams(), null), null);
  assert.match(
    validateProfessionalQuery(new URLSearchParams("search=A"), null),
    /nÃ£o permitidos/i,
  );
});

test("exception list accepts only its documented filters", () => {
  assert.equal(
    validateProfessionalQuery(
      new URLSearchParams("date_from=2026-01-01&date_to=2026-12-31&page=1&page_size=20"),
      professionalExceptionQueryKeys,
    ),
    null,
  );
  assert.match(
    validateProfessionalQuery(new URLSearchParams("search=A"), professionalExceptionQueryKeys),
    /permitido/i,
  );
});

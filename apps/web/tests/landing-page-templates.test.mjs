import assert from "node:assert/strict";
import test from "node:test";

import { createLandingPageTemplateContent } from "../src/lib/landing-page-templates.ts";

function idFactory() {
  let value = 0;
  return () => `00000000-0000-4000-8000-${String(++value).padStart(12, "0")}`;
}

test("blank template starts without blocks", () => {
  const content = createLandingPageTemplateContent("BLANK", idFactory());

  assert.deepEqual(content, { version: 1, blocks: [] });
});

test("lead capture template creates a valid conversion structure", () => {
  const content = createLandingPageTemplateContent("LEAD_CAPTURE", idFactory());

  assert.equal(content.version, 1);
  assert.deepEqual(
    content.blocks.map((block) => block.type),
    ["HERO", "FEATURES", "CONTACT"],
  );
  assert.equal(new Set(content.blocks.map((block) => block.id)).size, content.blocks.length);
});

test("service promotion template creates the full service narrative", () => {
  const content = createLandingPageTemplateContent("SERVICE_PROMOTION", idFactory());

  assert.deepEqual(
    content.blocks.map((block) => block.type),
    ["HERO", "TEXT", "FEATURES", "FAQ", "CALL_TO_ACTION"],
  );
  assert.equal(new Set(content.blocks.map((block) => block.id)).size, content.blocks.length);
});

test("each application receives fresh block ids", () => {
  let value = 0;
  const createId = () => `00000000-0000-4000-8000-${String(++value).padStart(12, "0")}`;

  const first = createLandingPageTemplateContent("LEAD_CAPTURE", createId);
  const second = createLandingPageTemplateContent("LEAD_CAPTURE", createId);

  assert.notDeepEqual(
    first.blocks.map((block) => block.id),
    second.blocks.map((block) => block.id),
  );
});

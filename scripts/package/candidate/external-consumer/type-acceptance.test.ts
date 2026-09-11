import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";

import { cleanupExternalConsumerMaterial, resolveExternalConsumerMaterial } from "./material.ts";
import {
  assertExternalConsumerTypes,
  writeExternalConsumerTypesFixture
} from "./type-acceptance.ts";

test("external consumer type fixture uses only its public strictness profile", () => {
  const consumerDirectory = mkdtempSync(join(tmpdir(), "vibe-check-external-consumer-types-"));
  try {
    writeExternalConsumerTypesFixture(consumerDirectory);
    const config: unknown = JSON.parse(
      readFileSync(join(consumerDirectory, "tsconfig.json"), "utf8")
    );
    assert.deepEqual(config, {
      compilerOptions: {
        exactOptionalPropertyTypes: true,
        module: "nodenext",
        moduleResolution: "nodenext",
        noUncheckedIndexedAccess: true,
        noEmit: true,
        strict: true,
        target: "esnext",
        verbatimModuleSyntax: true
      },
      include: [
        "public-imports.ts",
        "docs/examples/package-api/*.ts",
        "node_modules/@zxyycom/vibe-check/docs/examples/artifacts/mixed-outcomes/definition.ts"
      ]
    });
  } finally {
    rmSync(consumerDirectory, { force: true, recursive: true });
  }
});

test("external consumer type acceptance", { concurrency: false, timeout: 20_000 }, async () => {
  const fixture = await resolveExternalConsumerMaterial();
  try {
    assertExternalConsumerTypes(fixture.material.consumerDirectory);
  } finally {
    if (fixture.cleanup) cleanupExternalConsumerMaterial(fixture.material);
  }
});

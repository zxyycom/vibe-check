import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, readdirSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { test } from "node:test";

import { cleanupExternalConsumerMaterial, resolveExternalConsumerMaterial } from "./material.ts";
import {
  assertExternalConsumerDocumentation,
  writeExternalConsumerDocumentationFixture
} from "./documentation.ts";
import { PACKAGE_API_EXAMPLE_SUPPORT_SOURCE_PATHS } from "../../../docs/package-api/example-projections.ts";

test("external consumer documentation fixture carries its registered acceptance support", () => {
  const consumerDirectory = mkdtempSync(join(tmpdir(), "vibe-check-documentation-support-"));
  const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), "../../../..");
  try {
    writeExternalConsumerDocumentationFixture(consumerDirectory, repositoryRoot);
    assert.deepEqual(readdirSync(join(consumerDirectory, "docs/examples/package-api-support")), [
      "gate-example-acceptance.ts"
    ]);
    for (const sourcePath of PACKAGE_API_EXAMPLE_SUPPORT_SOURCE_PATHS) {
      assert.equal(
        readFileSync(join(consumerDirectory, sourcePath), "utf8"),
        readFileSync(join(repositoryRoot, sourcePath), "utf8")
      );
    }
    assert.match(
      readFileSync(
        join(consumerDirectory, "docs/examples/package-api/gate-text-diagnostics.ts"),
        "utf8"
      ),
      /\.\.\/package-api-support\/gate-example-acceptance\.ts/
    );
  } finally {
    rmSync(consumerDirectory, { recursive: true, force: true });
  }
});

test("external consumer docs acceptance", { concurrency: false, timeout: 20_000 }, async () => {
  const fixture = await resolveExternalConsumerMaterial();
  try {
    assertExternalConsumerDocumentation(fixture.material);
  } finally {
    if (fixture.cleanup) cleanupExternalConsumerMaterial(fixture.material);
  }
});

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, it } from "node:test";

import { CURRENT_PUBLIC_CONTRACT } from "./current-public-contract.ts";
import { defineConfig } from "./project-definition.ts";
import { run } from "./run.ts";

describe("current public contract", () => {
  it("owns exactly the definition-facing names, defaults, and operational identifiers", () => {
    assert.deepEqual(CURRENT_PUBLIC_CONTRACT, {
      packageImport: "vibe-check",
      operations: {
        configDefinition: "defineConfig",
        packageRun: "run"
      },
      types: {
        projectDefinition: "ProjectDefinition",
        runControls: "RunControls",
        runResult: "RunResult"
      },
      effectDefaults: {
        cache: { directory: ".cache/vibe-check", enabled: true },
        logs: { enabled: true },
        output: { directory: "artifacts/vibe-check", enabled: true },
        progress: { enabled: true }
      },
      operationalDependencies: {
        duplication: { environment: "VIBE_CHECK_JSCPD_CMD" },
        file: { environment: "VIBE_CHECK_SCC_CMD" },
        function: { environment: "VIBE_CHECK_LIZARD_CMD" }
      }
    });
    assert.equal(defineConfig.name, CURRENT_PUBLIC_CONTRACT.operations.configDefinition);
    assert.equal(run.name, CURRENT_PUBLIC_CONTRACT.operations.packageRun);
    assert.deepEqual(defineConfig({}).effects, CURRENT_PUBLIC_CONTRACT.effectDefaults);

    const packageManifest = JSON.parse(readFileSync(
      fileURLToPath(new URL("../../package.json", import.meta.url)),
      "utf8"
    )) as { name?: unknown };
    assert.equal(packageManifest.name, CURRENT_PUBLIC_CONTRACT.packageImport);

    const ownerSource = readFileSync(fileURLToPath(new URL(
      "./current-public-contract.ts",
      import.meta.url
    )), "utf8");
    assert.doesNotMatch(ownerSource, /scripts\/quality|project-definition\.ts|project-run\.ts/);
    assert.doesNotMatch(ownerSource, /\b(?:host|legal|license|manifest|version)\b/i);
  });
});

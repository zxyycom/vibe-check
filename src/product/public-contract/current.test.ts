import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, it } from "node:test";

import { CURRENT_PUBLIC_CONTRACT } from "./current.ts";
import { isNonArrayRecord } from "../foundation/type-guards.ts";
import {
  append,
  defineConfig,
  duplicateDetection,
  fileMetrics,
  functionMetrics,
  replace
} from "../definition/project.ts";
import { run } from "../run/index.ts";

describe("current public contract", () => {
  it("owns four function exports, three non-callable built-in values, types, defaults, and operational identifiers", () => {
    assert.deepEqual(CURRENT_PUBLIC_CONTRACT, {
      packageImport: "vibe-check",
      operations: {
        configDefinition: "defineConfig",
        packageRun: "run",
        builtInCheckReplacement: "replace",
        builtInCheckAppend: "append"
      },
      values: {
        duplicateDetection: "duplicateDetection",
        fileMetrics: "fileMetrics",
        functionMetrics: "functionMetrics"
      },
      types: {
        builtInCheck: "BuiltInCheck",
        checkDefinition: "CheckDefinition",
        checkGroup: "CheckGroup",
        checkNode: "CheckNode",
        checkPlanningContext: "CheckPlanningContext",
        checkResult: "CheckResult",
        customCheck: "CustomCheck",
        projectDefinition: "ProjectDefinition",
        qualityRecordCandidate: "QualityRecordCandidate",
        runControls: "RunControls",
        runResult: "RunResult",
        taskPlan: "TaskPlan"
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
    assert.equal(replace.name, CURRENT_PUBLIC_CONTRACT.operations.builtInCheckReplacement);
    assert.equal(append.name, CURRENT_PUBLIC_CONTRACT.operations.builtInCheckAppend);
    assert.equal(typeof duplicateDetection, "object");
    assert.equal(typeof fileMetrics, "object");
    assert.equal(typeof functionMetrics, "object");
    for (const builtInCheck of [duplicateDetection, fileMetrics, functionMetrics]) {
      assert.equal(Object.hasOwn(builtInCheck, "replace"), false);
      assert.equal(Object.hasOwn(builtInCheck, "append"), false);
    }
    assert.deepEqual(defineConfig({}).effects, CURRENT_PUBLIC_CONTRACT.effectDefaults);

    const packageManifest = packageManifestName(readFileSync(
      fileURLToPath(new URL("../../../package.json", import.meta.url)),
      "utf8"
    ));
    assert.equal(packageManifest, CURRENT_PUBLIC_CONTRACT.packageImport);

    const ownerSource = readFileSync(fileURLToPath(new URL(
      "./current.ts",
      import.meta.url
    )), "utf8");
    assert.doesNotMatch(ownerSource, /scripts\/quality|project-definition\.ts|project-run\.ts/);
    assert.doesNotMatch(ownerSource, /\b(?:host|legal|license|manifest|version)\b/i);
  });
});

function packageManifestName(source: string): string {
  const parsed: unknown = JSON.parse(source);
  if (!isNonArrayRecord(parsed) || typeof parsed.name !== "string") {
    throw new TypeError("Package manifest must declare a string name");
  }
  return parsed.name;
}

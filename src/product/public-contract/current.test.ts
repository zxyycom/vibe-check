import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, it } from "node:test";

import { CURRENT_PUBLIC_CONTRACT } from "./current.ts";
import { isNonArrayRecord } from "../foundation/type-guards.ts";
import {
  defineCheck,
  defineConfig,
  duplicateDetection,
  fileMetrics,
  functionMetrics,
  inherit
} from "../definition/project.ts";
import { run } from "../run/index.ts";

describe("current public contract", () => {
  it("owns four runtime functions, three ordinary built-in values, minimal type roots, and effect defaults", () => {
    assert.deepEqual(CURRENT_PUBLIC_CONTRACT, {
      packageImport: "vibe-check",
      operations: {
        defineCheck: "defineCheck",
        defineConfig: "defineConfig",
        inherit: "inherit",
        run: "run"
      },
      values: {
        duplicateDetection: "duplicateDetection",
        fileMetrics: "fileMetrics",
        functionMetrics: "functionMetrics"
      },
      types: {
        check: "Check",
        checkAggregate: "CheckAggregate",
        checkAggregation: "CheckAggregation",
        checkExecution: "CheckExecution",
        checkExecutionContext: "CheckExecutionContext",
        checkOutcome: "CheckOutcome",
        checkResult: "CheckResult",
        checkUnavailableReason: "CheckUnavailableReason",
        duplicateDetectionOptions: "DuplicateDetectionOptions",
        fileMetricsOptions: "FileMetricsOptions",
        functionMetricsOptions: "FunctionMetricsOptions",
        inheritableCheckCollection: "InheritableCheckCollection",
        projectEffects: "ProjectEffects",
        projectDefinition: "ProjectDefinition",
        projectQualityConfiguration: "ProjectQualityConfiguration",
        runControls: "RunControls",
        runResult: "RunResult",
        schedulerPolicy: "SchedulerPolicy"
      },
      effectDefaults: {
        cache: { directory: ".cache/vibe-check", enabled: true },
        output: { directory: "artifacts/vibe-check", enabled: true },
        progress: { enabled: true }
      }
    });
    assert.equal(defineCheck.name, CURRENT_PUBLIC_CONTRACT.operations.defineCheck);
    assert.equal(defineConfig.name, CURRENT_PUBLIC_CONTRACT.operations.defineConfig);
    assert.equal(inherit.name, CURRENT_PUBLIC_CONTRACT.operations.inherit);
    assert.equal(run.name, CURRENT_PUBLIC_CONTRACT.operations.run);
    assert.equal(typeof duplicateDetection, "object");
    assert.equal(typeof fileMetrics, "object");
    assert.equal(typeof functionMetrics, "object");
    for (const builtInCheck of [duplicateDetection, fileMetrics, functionMetrics]) {
      assert.equal(Object.hasOwn(builtInCheck, "replace"), false);
      assert.equal(Object.hasOwn(builtInCheck, "append"), false);
    }
    assert.deepEqual(defineConfig({}).effects, CURRENT_PUBLIC_CONTRACT.effectDefaults);

    const packageManifest = packageManifestName(
      readFileSync(fileURLToPath(new URL("../../../package.json", import.meta.url)), "utf8")
    );
    assert.equal(packageManifest, CURRENT_PUBLIC_CONTRACT.packageImport);

    const candidateEntrySource = readFileSync(
      fileURLToPath(new URL("../../../scripts/package-candidate/entry.ts", import.meta.url)),
      "utf8"
    );
    assert.deepEqual(
      packageTypeExportNames(candidateEntrySource),
      Object.values(CURRENT_PUBLIC_CONTRACT.types).sort((left, right) => left.localeCompare(right))
    );
    assert.deepEqual(
      packageValueExportNames(candidateEntrySource),
      [
        ...Object.values(CURRENT_PUBLIC_CONTRACT.operations),
        ...Object.values(CURRENT_PUBLIC_CONTRACT.values)
      ].sort((left, right) => left.localeCompare(right))
    );

    const ownerSource = readFileSync(
      fileURLToPath(new URL("./current.ts", import.meta.url)),
      "utf8"
    );
    assert.doesNotMatch(ownerSource, /scripts\/quality|project-definition\.ts|project-run\.ts/);
    assert.doesNotMatch(ownerSource, /\b(?:host|legal|license|manifest|version)\b/i);
  });
});

function packageTypeExportNames(source: string): string[] {
  return packageExportNames(source, /export type\s*\{([\s\S]*?)\}\s*from\s*"[^"]+";/g);
}

function packageValueExportNames(source: string): string[] {
  return packageExportNames(source, /export\s*\{([\s\S]*?)\}\s*from\s*"[^"]+";/g);
}

function packageExportNames(source: string, pattern: RegExp): string[] {
  const exportBlocks = source.matchAll(pattern);
  const names = [...exportBlocks].flatMap((match) =>
    match[1]
      .split(",")
      .map((name) => name.trim())
      .filter((name) => name.length > 0)
  );
  return names.sort((left, right) => left.localeCompare(right));
}

function packageManifestName(source: string): string {
  const parsed: unknown = JSON.parse(source);
  if (!isNonArrayRecord(parsed) || typeof parsed.name !== "string") {
    throw new TypeError("Package manifest must declare a string name");
  }
  return parsed.name;
}

// Supporting implementation types must not become future package-entry roots.
// @ts-expect-error CheckReason is not a named public type root.
type _UnsupportedCheckReason = import("../definition/project.ts").CheckReason;
// @ts-expect-error CheckNotApplicableReason is not a named public type root.
type _UnsupportedNotApplicableReason = import("../definition/project.ts").CheckNotApplicableReason;
// oxfmt-ignore
// @ts-expect-error CheckDeclaredUnavailableReason is not a named public type root.
type _UnsupportedDeclaredUnavailableReason = import("../definition/project.ts").CheckDeclaredUnavailableReason;
// oxfmt-ignore
// @ts-expect-error ProductCheckUnavailableReason is not a named public type root.
type _UnsupportedProductUnavailableReason = import("../definition/project.ts").ProductCheckUnavailableReason;
// @ts-expect-error DeepReadonly is not a named public type root.
type _UnsupportedDeepReadonly = import("../definition/project.ts").DeepReadonly<object>;
// @ts-expect-error CheckDefinition is not a named public type root.
type _UnsupportedCheckDefinition = import("../definition/project.ts").CheckDefinition;
// @ts-expect-error CheckDataParser is supporting syntax, not a named public type root.
type _UnsupportedCheckDataParser = import("../definition/project.ts").CheckDataParser;
// @ts-expect-error CheckDependencies is carried by CheckExecutionContext, not a named public type root.
type _UnsupportedCheckDependencies = import("../definition/project.ts").CheckDependencies;
// @ts-expect-error DependencyReadResult is supporting syntax, not a named public type root.
type _UnsupportedDependencyReadResult = import("../definition/project.ts").DependencyReadResult;

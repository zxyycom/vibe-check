import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, it } from "node:test";

import { CURRENT_PUBLIC_CONTRACT } from "./public-api-inventory.ts";
import { isNonArrayRecord } from "../../src/data-boundary/value-shapes.ts";
import {
  defineCheck,
  defineConfig,
  duplicateDetection,
  fileMetrics,
  functionMetrics,
  markdownLinkValidation,
  inherit,
  maintenanceReminders,
  jsonSchemaValidation,
  jsonValidation
} from "../../src/index.ts";
import { run } from "../../src/project-run/run.ts";

describe("public API inventory", () => {
  it("owns five runtime functions, six package-provided ordinary Check values, and minimal type roots", () => {
    assert.deepEqual(CURRENT_PUBLIC_CONTRACT, {
      packageImport: "vibe-check",
      operations: {
        defineCheck: "defineCheck",
        defineConfig: "defineConfig",
        inherit: "inherit",
        maintenanceReminders: "maintenanceReminders",
        run: "run"
      },
      values: {
        duplicateDetection: "duplicateDetection",
        fileMetrics: "fileMetrics",
        functionMetrics: "functionMetrics",
        jsonSchemaValidation: "jsonSchemaValidation",
        jsonValidation: "jsonValidation",
        markdownLinkValidation: "markdownLinkValidation"
      },
      types: {
        check: "Check",
        checkAggregate: "CheckAggregate",
        checkAggregation: "CheckAggregation",
        checkExecution: "CheckExecution",
        checkExecutionContext: "CheckExecutionContext",
        checkPreflight: "CheckPreflight",
        checkPreflightResult: "CheckPreflightResult",
        checkOutcome: "CheckOutcome",
        checkResult: "CheckResult",
        checkUnavailableReason: "CheckUnavailableReason",
        duplicateDetectionOptions: "DuplicateDetectionOptions",
        fileMetricsOptions: "FileMetricsOptions",
        functionMetricsOptions: "FunctionMetricsOptions",
        maintenanceReminder: "MaintenanceReminder",
        maintenanceReminderOptions: "MaintenanceReminderOptions",
        markdownLinkValidationOptions: "MarkdownLinkValidationOptions",
        inheritableCheckCollection: "InheritableCheckCollection",
        jsonSchemaValidationOptions: "JsonSchemaValidationOptions",
        jsonValidationOptions: "JsonValidationOptions",
        projectOutputs: "ProjectOutputs",
        projectDefinition: "ProjectDefinition",
        runControls: "RunControls",
        runResult: "RunResult",
        schedulerPolicy: "SchedulerPolicy"
      }
    });
    assert.equal(defineCheck.name, CURRENT_PUBLIC_CONTRACT.operations.defineCheck);
    assert.equal(defineConfig.name, CURRENT_PUBLIC_CONTRACT.operations.defineConfig);
    assert.equal(inherit.name, CURRENT_PUBLIC_CONTRACT.operations.inherit);
    assert.equal(
      maintenanceReminders.name,
      CURRENT_PUBLIC_CONTRACT.operations.maintenanceReminders
    );
    assert.equal(run.name, CURRENT_PUBLIC_CONTRACT.operations.run);
    assert.equal(typeof duplicateDetection, "object");
    assert.equal(typeof fileMetrics, "object");
    assert.equal(typeof functionMetrics, "object");
    assert.equal(typeof jsonSchemaValidation, "object");
    assert.equal(typeof jsonValidation, "object");
    assert.equal(typeof markdownLinkValidation, "object");
    for (const builtInCheck of [
      duplicateDetection,
      fileMetrics,
      functionMetrics,
      jsonSchemaValidation,
      jsonValidation,
      markdownLinkValidation
    ]) {
      assert.equal(Object.hasOwn(builtInCheck, "replace"), false);
      assert.equal(Object.hasOwn(builtInCheck, "append"), false);
    }

    const packageManifest = packageManifestName(
      readFileSync(fileURLToPath(new URL("../../package.json", import.meta.url)), "utf8")
    );
    assert.equal(packageManifest, CURRENT_PUBLIC_CONTRACT.packageImport);
    const packageEntrySource = readFileSync(
      fileURLToPath(new URL("../../src/index.ts", import.meta.url)),
      "utf8"
    );
    assert.match(packageEntrySource, /^\/\*[\s\S]*?@packageDocumentation[\s\S]*?\*\//);
    assert.deepEqual(
      packageTypeExportNames(packageEntrySource),
      Object.values(CURRENT_PUBLIC_CONTRACT.types).sort((left, right) => left.localeCompare(right))
    );
    assert.deepEqual(
      packageValueExportNames(packageEntrySource),
      [
        ...Object.values(CURRENT_PUBLIC_CONTRACT.operations),
        ...Object.values(CURRENT_PUBLIC_CONTRACT.values)
      ].sort((left, right) => left.localeCompare(right))
    );
    const ownerSource = readFileSync(
      fileURLToPath(new URL("./public-api-inventory.ts", import.meta.url)),
      "utf8"
    );
    assert.doesNotMatch(ownerSource, /scripts\/quality|project-definition\.ts|project-run\.ts/);
    assert.doesNotMatch(ownerSource, /\b(?:host|legal|license|manifest|version)\b/i);
    assertPublicRootsHaveChineseJSDoc(CURRENT_PUBLIC_CONTRACT);
  });
});
function assertPublicRootsHaveChineseJSDoc(contract: typeof CURRENT_PUBLIC_CONTRACT): void {
  const publicRootNames = [
    ...Object.values(contract.operations),
    ...Object.values(contract.values),
    ...Object.values(contract.types)
  ];
  const productSources = productTypeScriptSources();
  for (const name of publicRootNames) assertChineseJSDocForDeclaration(productSources, name);
  assert.throws(
    () =>
      assertChineseJSDocForDeclaration(
        [
          {
            path: "fixture.ts",
            source:
              "/** 前一声明的中文说明。 */\nconst unrelated = true;\n/** English direct comment. */\nexport const target = true;"
          }
        ],
        "target"
      ),
    /target must retain a Chinese JSDoc summary/
  );
}
type ProductTypeScriptSource = Readonly<{ readonly path: string; readonly source: string }>;
function assertChineseJSDocForDeclaration(
  sources: readonly ProductTypeScriptSource[],
  name: string
): void {
  const documentedDeclaration = new RegExp(
    String.raw`\/\*\*(?:(?!\*\/)[\s\S])*\*\/\s*export\s+(?:async\s+)?(?:interface|type|function|const)\s+${name}\b`,
    "g"
  );
  const matches = sources.flatMap(({ path, source }) =>
    [...source.matchAll(documentedDeclaration)].map((match) =>
      Object.freeze({ documentation: match[0], path })
    )
  );
  assert.equal(
    matches.length,
    1,
    `${name} must have exactly one adjacent JSDoc declaration owner; found ${matches.map((match) => match.path).join(", ") || "none"}`
  );
  assert.match(
    matches[0].documentation,
    /[\p{Script=Han}]/u,
    `${name} must retain a Chinese JSDoc summary`
  );
}
function productTypeScriptSources(): readonly ProductTypeScriptSource[] {
  const productDirectory = fileURLToPath(new URL("../../src/", import.meta.url));
  return readdirSync(productDirectory, { encoding: "utf8", recursive: true })
    .filter(
      (path) =>
        path.endsWith(".ts") && !path.endsWith(".test.ts") && !path.endsWith(".test-support.ts")
    )
    .map((path) =>
      Object.freeze({ path, source: readFileSync(join(productDirectory, path), "utf8") })
    );
}
function packageTypeExportNames(source: string): string[] {
  return packageExportNames(source, /export type\s*\{([\s\S]*?)\}\s*from\s*"[^"]+";/g);
}
function packageValueExportNames(source: string): string[] {
  return packageExportNames(source, /export\s*\{([\s\S]*?)\}\s*from\s*"[^"]+";/g);
}
function packageExportNames(source: string, pattern: RegExp): string[] {
  return [...source.matchAll(pattern)]
    .flatMap((match) =>
      match[1]
        .split(",")
        .map((name) => name.trim())
        .filter((name) => name.length > 0)
    )
    .sort((left, right) => left.localeCompare(right));
}
function packageManifestName(source: string): string {
  const parsed: unknown = JSON.parse(source);
  if (!isNonArrayRecord(parsed) || typeof parsed.name !== "string")
    throw new TypeError("Package manifest must declare a string name");
  return parsed.name;
}
// Supporting implementation types must not become future package-entry roots.
type ProjectModule = typeof import("../../src/project-definition/project-definition.ts");
// @ts-expect-error CheckReason is not a named public type root.
type _UnsupportedCheckReason = ProjectModule["CheckReason"];
// @ts-expect-error CheckNotApplicableReason is not a named public type root.
type _UnsupportedNotApplicableReason = ProjectModule["CheckNotApplicableReason"];
// @ts-expect-error CheckDeclaredUnavailableReason is not a named public type root.
type _UnsupportedDeclaredUnavailableReason = ProjectModule["CheckDeclaredUnavailableReason"];
// @ts-expect-error ProductCheckUnavailableReason is not a named public type root.
type _UnsupportedProductUnavailableReason = ProjectModule["ProductCheckUnavailableReason"];
// @ts-expect-error DeepReadonly is not a named public type root.
type _UnsupportedDeepReadonly = ProjectModule["DeepReadonly"];
// @ts-expect-error CheckDescriptor is not a named public type root.
type _UnsupportedCheckDescriptor = ProjectModule["CheckDescriptor"];
// @ts-expect-error CheckDataParser is supporting syntax, not a named public type root.
type _UnsupportedCheckDataParser = ProjectModule["CheckDataParser"];
// @ts-expect-error CheckDependencies is carried by CheckExecutionContext, not a named public type root.
type _UnsupportedCheckDependencies = ProjectModule["CheckDependencies"];
// @ts-expect-error DependencyReadResult is supporting syntax, not a named public type root.
type _UnsupportedDependencyReadResult = ProjectModule["DependencyReadResult"];

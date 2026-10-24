import { assertJsonValueEqual } from "../../src/data-boundary/json-value-equality.test-support.ts";
import assert from "node:assert/strict";
import { readFileSync, readdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, it } from "node:test";

import { CURRENT_PUBLIC_CONTRACT } from "./public-api-inventory.ts";
import { publicRootExportNames } from "./public-exports.test-support.ts";
import {
  all,
  any,
  cacheJsonByKey,
  canonicalizeJsonObject,
  canonicalizeJsonValue,
  canonicalJsonBytes,
  canonicalJsonText,
  changeFlag,
  commandCheck,
  collectProjectFiles,
  createAdmissionGraph,
  createProjectFileRegionIndex,
  defineAdmissionPolicy,
  defineContextCallback,
  defineCheck,
  defineConfig,
  exactlyOne,
  defaultProjectFileSelection,
  duplicateDetection,
  fileMetrics,
  functionMetrics,
  markdownLint,
  markdownLinkValidation,
  inherit,
  maintenanceReminders,
  none,
  not,
  notAll,
  jsonSchemaValidation,
  jsonValidation,
  parseDuplicateDetectionData,
  parseFileMetricsData,
  parseFunctionMetricsData,
  parseJsonSchemaValidationData,
  parseJsonValidationData,
  parseMaintenanceRemindersData,
  parseMarkdownLintData,
  parseMarkdownLinkValidationData,
  presentCheckFindings,
  reconcileFindingWaivers,
  snapshotClosedArray,
  snapshotExactClosedRecord
} from "../../src/index.ts";
import { run } from "../../src/project-run/run.ts";

describe("public API inventory", () => {
  it("exposes approved authoring values and adjacent source JSDoc", () => {
    assert.equal(CURRENT_PUBLIC_CONTRACT.packageImport, "@zxyycom/vibe-check");
    assert.equal(
      CURRENT_PUBLIC_CONTRACT.defaults.defaultProjectFileSelection,
      "defaultProjectFileSelection"
    );
    assert.equal(defaultProjectFileSelection.useDefaultExcludes, true);
    assert.equal(Object.isFrozen(defaultProjectFileSelection), true);
    assert.equal(Object.isFrozen(defaultProjectFileSelection.patterns), true);
    for (const callable of [
      defineCheck,
      defineConfig,
      inherit,
      maintenanceReminders,
      run,
      parseDuplicateDetectionData,
      parseFileMetricsData,
      parseFunctionMetricsData,
      parseJsonSchemaValidationData,
      parseJsonValidationData,
      parseMaintenanceRemindersData,
      parseMarkdownLintData,
      parseMarkdownLinkValidationData
    ]) {
      assert.equal(typeof callable, "function");
    }
    assert.equal(typeof all, "function");
    assert.equal(typeof any, "function");
    assert.equal(typeof cacheJsonByKey, "function");
    assert.equal(typeof canonicalizeJsonObject, "function");
    assert.equal(typeof canonicalizeJsonValue, "function");
    assert.equal(typeof canonicalJsonBytes, "function");
    assert.equal(typeof canonicalJsonText, "function");
    assert.equal(typeof changeFlag, "function");
    assert.equal(typeof commandCheck, "function");
    assert.equal(typeof collectProjectFiles, "function");
    assert.equal(typeof createProjectFileRegionIndex, "function");
    assert.equal(typeof createAdmissionGraph, "function");
    assert.equal(typeof defineAdmissionPolicy, "function");
    assert.equal(typeof defineContextCallback, "function");
    assert.equal(typeof exactlyOne, "function");
    assert.equal(typeof duplicateDetection, "function");
    assert.equal(typeof fileMetrics, "function");
    assert.equal(typeof functionMetrics, "function");
    assert.equal(typeof jsonSchemaValidation, "function");
    assert.equal(typeof jsonValidation, "function");
    assert.equal(typeof markdownLint, "function");
    assert.equal(typeof markdownLinkValidation, "function");
    assert.equal(typeof none, "function");
    assert.equal(typeof not, "function");
    assert.equal(typeof notAll, "function");
    assert.equal(typeof presentCheckFindings, "function");
    assert.equal(typeof reconcileFindingWaivers, "function");
    assert.equal(typeof snapshotClosedArray, "function");
    assert.equal(typeof snapshotExactClosedRecord, "function");
    for (const packageCheck of [
      duplicateDetection(),
      fileMetrics(),
      functionMetrics(),
      jsonSchemaValidation(),
      jsonValidation(),
      markdownLint(),
      markdownLinkValidation()
    ]) {
      assert.equal(Object.hasOwn(packageCheck, "replace"), false);
      assert.equal(Object.hasOwn(packageCheck, "append"), false);
    }
    assertJsonValueEqual(
      markdownLinkValidation({
        cache: { enabled: true, directory: "/tmp/vibe-check-markdown-link-cache" }
      }).options.cache,
      { enabled: true, directory: "/tmp/vibe-check-markdown-link-cache" }
    );

    const entryPath = fileURLToPath(new URL("../../src/index.ts", import.meta.url));
    const packageEntrySource = readFileSync(entryPath, "utf8");
    assert.match(packageEntrySource, /^\/\*[\s\S]*?@packageDocumentation[\s\S]*?\*\//);
    assertExportObserverRecognizesDeclarationsAndReexports();
    assertPublicRootsHaveChineseJSDoc(CURRENT_PUBLIC_CONTRACT);
  });
});
function assertPublicRootsHaveChineseJSDoc(contract: typeof CURRENT_PUBLIC_CONTRACT): void {
  const publicRootNames = [
    ...Object.values(contract.defaults),
    ...Object.values(contract.operations),
    ...Object.values(contract.checks),
    ...Object.values(contract.parsers),
    ...Object.values(contract.types)
  ];
  const productSources = productTypeScriptSources();
  for (const name of publicRootNames) assertChineseJSDocForDeclaration(productSources, name);
  assert.throws(() => {
    assertChineseJSDocForDeclaration(
      [
        {
          path: "fixture.ts",
          source:
            "/** 前一声明的中文说明。 */\nconst unrelated = true;\n/** English direct comment. */\nexport const target = true;"
        }
      ],
      "target"
    );
  }, /target must retain a Chinese JSDoc summary/);
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
  const documentedMatch = matches[0];
  if (documentedMatch === undefined) throw new Error(`${name} has no documented declaration`);
  assert.match(
    documentedMatch.documentation,
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
function assertExportObserverRecognizesDeclarationsAndReexports(): void {
  const root = mkdtempSync(join(tmpdir(), "vibe-check-root-export-observer-"));
  try {
    const entry = join(root, "index.ts");
    writeFileSync(join(root, "package.json"), '{"type":"module"}');
    writeFileSync(
      join(root, "provider.ts"),
      "export const StarValue = 1; export type StarType = string;"
    );
    writeFileSync(
      join(root, "type-only.ts"),
      "export const TypeOnlyValue = 1; export type TypeOnlyType = boolean;"
    );
    writeFileSync(
      entry,
      `
export const DirectValue = 1;
export type DirectType = number;
export interface DirectInterface {}
type InternalType = boolean;
const internalValue = 2;
export { InternalType as AliasType, internalValue as AliasValue };
export * from "./provider.ts";
export type * from "./type-only.ts";
`
    );
    assert.deepEqual(publicRootExportNames(entry), {
      runtime: ["AliasValue", "DirectValue", "StarValue"],
      types: [
        "AliasType",
        "DirectInterface",
        "DirectType",
        "StarType",
        "TypeOnlyType",
        "TypeOnlyValue"
      ]
    });
  } finally {
    rmSync(root, { force: true, recursive: true });
  }
}

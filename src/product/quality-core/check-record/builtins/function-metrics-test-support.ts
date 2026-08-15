import { strict as assert } from "node:assert";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import type { FunctionScannerDependency } from "../../../scanner-dependencies/index.ts";
import { resolveCheckCatalog, type ResolvedCheckCatalog } from "../catalog.ts";
import { createRecordId } from "../identity.ts";
import type { FinalCoreSnapshot } from "../model.ts";
import type { ReferenceFacts } from "../policy-model.ts";
import {
  FUNCTION_METRICS_CHECK_DEFINITION,
  createFunctionMetricsBinding,
  resolveFunctionMetricsApplicability
} from "./function-metrics.ts";

export const functionMetricsSemantics = {
  codeAreas: {
    source: {
      description: "Source",
      excludeGlobs: [],
      globs: ["src/**/*.ts"],
      warningPolicy: "moderate"
    }
  },
  generatedFiles: [],
  functions: {
    codeLines: {
      absoluteFloor: 10,
      changedDelta: 3,
      lowComplexityAllowance: {
        codeLineFloor: 20,
        maxCyclomaticComplexityExclusive: 3
      }
    },
    cyclomaticComplexity: { absoluteFloor: 5, changedDelta: 2 },
    parameterCount: { absoluteFloor: 4, changedDelta: 2 }
  }
} as const;

export function resolveFunctionMetricsTestCatalog(
  binding: ReturnType<typeof createFunctionMetricsBinding>["binding"],
  approvedExactPaths: readonly string[]
): ResolvedCheckCatalog {
  const catalog = resolveCheckCatalog({
    invocationKey: "function-metrics-test",
    definitions: [FUNCTION_METRICS_CHECK_DEFINITION],
    bindings: [{ checkId: "function-metrics", execute: binding }],
    schedules: [{ checkId: "function-metrics", requiresChecks: [] }],
    selectedCheckIds: ["function-metrics"],
    resolveApplicability: () => resolveFunctionMetricsApplicability(approvedExactPaths)
  });
  if (!catalog.ok) throw new Error("Expected function-metrics catalog to resolve");
  return catalog.value;
}

export function assertFunctionRecordsAndStableIdentity(snapshot: FinalCoreSnapshot): void {
  assert.deepEqual(
    FUNCTION_METRICS_CHECK_DEFINITION.recordTypes.map(({ recordTypeId }) => recordTypeId),
    [
      "function-code-lines",
      "function-cyclomatic-complexity",
      "function-parameter-count"
    ]
  );
  assert.equal(
    JSON.stringify(FUNCTION_METRICS_CHECK_DEFINITION).includes("controlled-lizard"),
    false
  );
  assert.equal(snapshot.runs[0]?.status, "completed");
  assert.deepEqual(snapshot.runs[0]?.result, { verdict: "failed" });
  assert.deepEqual(
    snapshot.records.map(({ recordTypeId }) => recordTypeId).sort(),
    [
      "function-code-lines",
      "function-cyclomatic-complexity",
      "function-parameter-count"
    ]
  );
  const record = snapshot.records[0]!;
  const descriptor = FUNCTION_METRICS_CHECK_DEFINITION.recordTypes.find(
    ({ recordTypeId }) => recordTypeId === record.recordTypeId
  )!;
  assert.equal(createRecordId({
    ...record,
    message: "Location changed",
    location: { path: "src/a.ts", line: 400, column: 7 }
  }, descriptor).recordId, record.recordId);
}

export function assertAmbiguousFunctionRelations(
  snapshot: FinalCoreSnapshot,
  facts: ReferenceFacts,
  expectedFunctionCount: number
): void {
  assert.equal(snapshot.runs[0]?.status, "completed");
  assert.equal(snapshot.records.length, expectedFunctionCount * 3);
  assert.equal(new Set(snapshot.records.map((record) => record.recordId)).size, snapshot.records.length);
  assert.equal(facts.relations.length, snapshot.records.length);
  assert.equal(
    facts.relations.filter((relation) => relation.relationId === "changed").length,
    18
  );
  assert.equal(
    facts.relations.filter((relation) => relation.relationId === "regression").length,
    3
  );
}

export interface LizardFixture {
  readonly cleanup: () => void;
  readonly currentRoot: string;
  readonly dependency: FunctionScannerDependency;
  readonly referenceRoot: string;
}

export function createLizardFixture(input: Readonly<{
  currentExitCode?: number;
  currentOutput: string;
  referenceExitCode?: number;
  referenceOutput: string;
}>): LizardFixture {
  const root = mkdtempSync(join(tmpdir(), "vibe-check-function-metrics-"));
  const currentRoot = join(root, "current");
  const referenceRoot = join(root, "reference");
  const scannerPath = join(root, "controlled-lizard.ts");
  mkdirSync(currentRoot, { recursive: true });
  mkdirSync(referenceRoot, { recursive: true });
  writeFileSync(scannerPath, [
    `const current = ${JSON.stringify(input.currentOutput)};`,
    `const reference = ${JSON.stringify(input.referenceOutput)};`,
    `const currentExitCode = ${input.currentExitCode ?? 0};`,
    `const referenceExitCode = ${input.referenceExitCode ?? 0};`,
    "if (process.argv.includes('--version')) process.stdout.write('lizard 1.23.0\\n');",
    "else {",
    "  const isReference = process.cwd().endsWith('/reference');",
    "  process.stdout.write(isReference ? reference : current);",
    "  process.exitCode = isReference ? referenceExitCode : currentExitCode;",
    "}"
  ].join("\n"), "utf8");
  return {
    currentRoot,
    referenceRoot,
    dependency: {
      executable: process.execPath,
      args: [scannerPath],
      availabilityArgs: [scannerPath, "--version"]
    },
    cleanup: () => rmSync(root, { recursive: true, force: true })
  };
}

export interface FunctionFailureFixture {
  readonly cleanup: () => void;
  readonly dependency: FunctionScannerDependency;
  readonly expected: string;
  readonly rootDir: string;
}

export function createFunctionFailureFixtures(): readonly FunctionFailureFixture[] {
  const unavailableRoot = mkdtempSync(join(tmpdir(), "vibe-check-function-unavailable-"));
  return [
    {
      rootDir: unavailableRoot,
      dependency: {
        executable: join(unavailableRoot, "missing-lizard"),
        args: [],
        availabilityArgs: ["--version"]
      },
      expected: "unavailable",
      cleanup: () => rmSync(unavailableRoot, { recursive: true, force: true })
    },
    functionFailureFixture(createLizardFixture({
      currentExitCode: 9,
      currentOutput: "",
      referenceOutput: ""
    }), "execution-failed"),
    functionFailureFixture(createLizardFixture({
      currentOutput: "not,lizard,csv\n",
      referenceOutput: ""
    }), "invalid-result"),
    functionFailureFixture(createLizardFixture({
      currentOutput: lizardCsv([
        lizardRow({
          path: "src/a.ts", name: "hot", lines: 20, complexity: 12,
          parameters: 7, startLine: 1, endLine: 20
        }),
        lizardRow({
          path: "../outside.ts", name: "outside", lines: 20, complexity: 12,
          parameters: 7, startLine: 1, endLine: 20
        })
      ]),
      referenceOutput: ""
    }), "invalid-result")
  ];
}

function functionFailureFixture(
  fixture: LizardFixture,
  expected: string
): FunctionFailureFixture {
  return {
    cleanup: fixture.cleanup,
    dependency: fixture.dependency,
    expected,
    rootDir: fixture.currentRoot
  };
}

export function createAmbiguousFunctionFixtures() {
  const currentRows = ambiguousCurrentRows();
  const fixture = createLizardFixture({
    currentOutput: lizardCsv(currentRows),
    referenceOutput: lizardCsv(ambiguousReferenceRows())
  });
  const movedFixture = createLizardFixture({
    currentOutput: lizardCsv(relocateLizardRows(currentRows)),
    referenceOutput: lizardCsv([])
  });
  return { currentRows, fixture, movedFixture };
}

function ambiguousCurrentRows(): readonly string[] {
  return [
    lizardRow({ path: "src/a.ts", name: "repeat", lines: 30, complexity: 8, parameters: 7, startLine: 10, endLine: 39 }),
    lizardRow({ path: "src/a.ts", name: "repeat", lines: 30, complexity: 8, parameters: 7, startLine: 100, endLine: 129 }),
    lizardRow({ path: "src/a.ts", name: "(anonymous)", lines: 30, complexity: 8, parameters: 7, startLine: 200, endLine: 229 }),
    lizardRow({ path: "src/a.ts", name: "unknown", lines: 30, complexity: 8, parameters: 7, startLine: 300, endLine: 329 }),
    lizardRow({ path: "src/a.ts", name: "   ", lines: 30, complexity: 8, parameters: 7, startLine: 400, endLine: 429 }),
    lizardRow({ path: "src/a.ts", name: "same", lines: 30, complexity: 8, parameters: 7, startLine: 500, endLine: 529 }),
    lizardRow({ path: "src/a.ts", name: "newFunction", lines: 30, complexity: 8, parameters: 7, startLine: 600, endLine: 629 })
  ];
}

function ambiguousReferenceRows(): readonly string[] {
  return [
    lizardRow({ path: "src/a.ts", name: "repeat", lines: 5, complexity: 1, parameters: 1, startLine: 1, endLine: 5 }),
    lizardRow({ path: "src/a.ts", name: "(anonymous)", lines: 5, complexity: 1, parameters: 1, startLine: 1, endLine: 5 }),
    lizardRow({ path: "src/a.ts", name: "unknown", lines: 5, complexity: 1, parameters: 1, startLine: 1, endLine: 5 }),
    lizardRow({ path: "src/a.ts", name: "   ", lines: 5, complexity: 1, parameters: 1, startLine: 1, endLine: 5 }),
    lizardRow({ path: "src/a.ts", name: "same", lines: 30, complexity: 8, parameters: 7, startLine: 1, endLine: 30 })
  ];
}

function relocateLizardRows(rows: readonly string[]): readonly string[] {
  return rows.map((rowValue, index) => {
    const fields = rowValue.split(",");
    const startLine = 1_000 + index * 100;
    const endLine = startLine + 29;
    fields[5] = `${fields[7]}@${startLine}-${endLine}@src/a.ts`;
    fields[9] = String(startLine);
    fields[10] = String(endLine);
    return fields.join(",");
  });
}

const LIZARD_HEADER = "NLOC,CCN,token count,parameter count,length,location,file path,function name,long name,start line,end line";

export function lizardCsv(rows: readonly string[]): string {
  return [LIZARD_HEADER, ...rows].join("\n") + "\n";
}

export interface LizardRowOptions {
  readonly complexity: number;
  readonly endLine: number;
  readonly lines: number;
  readonly name: string;
  readonly parameters: number;
  readonly path: string;
  readonly startLine: number;
}

export function lizardRow(options: LizardRowOptions): string {
  const { complexity, endLine, lines, name, parameters, path, startLine } = options;
  return [
    lines,
    complexity,
    100,
    parameters,
    endLine - startLine + 1,
    `${name}@${startLine}-${endLine}@${path}`,
    path,
    name,
    `${name} ()`,
    startLine,
    endLine
  ].join(",");
}

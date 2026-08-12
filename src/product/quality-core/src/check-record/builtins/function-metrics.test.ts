import { strict as assert } from "node:assert";
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, it } from "node:test";

import type { FunctionScannerDependency } from "../../../../scanner-dependencies.ts";
import { resolveCheckCatalog, type ResolvedCheckCatalog } from "../catalog.ts";
import { coordinateCheckRecords } from "../coordinator.ts";
import { createRecordId } from "../identity.ts";
import {
  FUNCTION_METRICS_CHECK_DEFINITION,
  createFunctionMetricsBinding,
  resolveFunctionMetricsApplicability
} from "./function-metrics.ts";

const semantics = {
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

describe("function-metrics built-in Check", () => {
  it("produces three typed records and location-independent IDs from current and reference inputs", async () => {
    const fixture = createLizardFixture({
      currentOutput: lizardCsv([lizardRow("src/a.ts", "hot", 20, 12, 7, 40, 59)]),
      referenceOutput: lizardCsv([lizardRow("src/a.ts", "hot", 8, 3, 2, 1, 8)])
    });
    try {
      const runtime = createFunctionMetricsBinding({
        changedFiles: ["src/a.ts"],
        current: { rootDir: fixture.currentRoot, approvedExactPaths: ["src/a.ts"] },
        dependency: fixture.dependency,
        reference: {
          referenceName: "baseline",
          rootDir: fixture.referenceRoot,
          approvedExactPaths: ["src/a.ts"]
        },
        semantics
      });
      const snapshot = await coordinateCheckRecords(
        resolveRuntimeCatalog(runtime.binding, ["src/a.ts"])
      );

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
      const facts = runtime.referenceFacts(snapshot);
      assert.deepEqual(facts.evidence, [{
        checkId: "function-metrics",
        referenceName: "baseline",
        status: "complete"
      }]);
      assert.equal(facts.relations.length, 3);
      assert.ok(facts.relations.every(({ relationId }) => relationId === "regression"));

      const record = snapshot.records[0]!;
      const descriptor = FUNCTION_METRICS_CHECK_DEFINITION.recordTypes.find(
        ({ recordTypeId }) => recordTypeId === record.recordTypeId
      )!;
      assert.equal(createRecordId({
        ...record,
        message: "Location changed",
        location: { path: "src/a.ts", line: 400, column: 7 }
      }, descriptor).recordId, record.recordId);
    } finally {
      fixture.cleanup();
    }
  });

  it("retains ambiguous function instances as changed without inventing regressions", async () => {
    const currentRows = [
      lizardRow("src/a.ts", "repeat", 30, 8, 7, 10, 39),
      lizardRow("src/a.ts", "repeat", 30, 8, 7, 100, 129),
      lizardRow("src/a.ts", "(anonymous)", 30, 8, 7, 200, 229),
      lizardRow("src/a.ts", "unknown", 30, 8, 7, 300, 329),
      lizardRow("src/a.ts", "   ", 30, 8, 7, 400, 429),
      lizardRow("src/a.ts", "same", 30, 8, 7, 500, 529),
      lizardRow("src/a.ts", "newFunction", 30, 8, 7, 600, 629)
    ];
    const fixture = createLizardFixture({
      currentOutput: lizardCsv(currentRows),
      referenceOutput: lizardCsv([
        lizardRow("src/a.ts", "repeat", 5, 1, 1, 1, 5),
        lizardRow("src/a.ts", "(anonymous)", 5, 1, 1, 1, 5),
        lizardRow("src/a.ts", "unknown", 5, 1, 1, 1, 5),
        lizardRow("src/a.ts", "   ", 5, 1, 1, 1, 5),
        lizardRow("src/a.ts", "same", 30, 8, 7, 1, 30)
      ])
    });
    const movedFixture = createLizardFixture({
      currentOutput: lizardCsv(currentRows.map((row, index) => {
        const fields = row.split(",");
        const startLine = 1_000 + index * 100;
        const endLine = startLine + 29;
        fields[5] = `${fields[7]}@${startLine}-${endLine}@src/a.ts`;
        fields[9] = String(startLine);
        fields[10] = String(endLine);
        return fields.join(",");
      })),
      referenceOutput: lizardCsv([])
    });
    const changedFiles = ["a.ts"];

    try {
      const runtime = createFunctionMetricsBinding({
        changedFiles,
        current: { rootDir: fixture.currentRoot, approvedExactPaths: ["src/a.ts"] },
        dependency: fixture.dependency,
        reference: {
          referenceName: "baseline",
          rootDir: fixture.referenceRoot,
          approvedExactPaths: ["src/a.ts"]
        },
        semantics
      });
      changedFiles.splice(0, changedFiles.length, "src/not-current.ts");

      const snapshot = await coordinateCheckRecords(
        resolveRuntimeCatalog(runtime.binding, ["src/a.ts"])
      );
      const facts = runtime.referenceFacts(snapshot);

      assert.equal(snapshot.runs[0]?.status, "completed");
      assert.equal(snapshot.records.length, currentRows.length * 3);
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

      const movedRuntime = createFunctionMetricsBinding({
        changedFiles: [],
        current: { rootDir: movedFixture.currentRoot, approvedExactPaths: ["src/a.ts"] },
        dependency: movedFixture.dependency,
        reference: null,
        semantics
      });
      const movedSnapshot = await coordinateCheckRecords(
        resolveRuntimeCatalog(movedRuntime.binding, ["src/a.ts"])
      );
      assert.deepEqual(
        movedSnapshot.records.map((record) => record.recordId),
        snapshot.records.map((record) => record.recordId)
      );
    } finally {
      fixture.cleanup();
      movedFixture.cleanup();
    }
  });

  it("distinguishes successful zero-function work from no input", async () => {
    const fixture = createLizardFixture({
      currentOutput: lizardCsv([]),
      referenceOutput: lizardCsv([])
    });
    try {
      const runtime = createFunctionMetricsBinding({
        changedFiles: [],
        current: { rootDir: fixture.currentRoot, approvedExactPaths: ["src/a.ts"] },
        dependency: fixture.dependency,
        reference: null,
        semantics
      });
      const zeroSnapshot = await coordinateCheckRecords(
        resolveRuntimeCatalog(runtime.binding, ["src/a.ts"])
      );
      const noInputSnapshot = await coordinateCheckRecords(
        resolveRuntimeCatalog(runtime.binding, [])
      );

      assert.deepEqual(zeroSnapshot.runs[0]?.result, { verdict: "passed" });
      assert.deepEqual(zeroSnapshot.records, []);
      assert.equal(noInputSnapshot.runs[0]?.applicability, "not-applicable");
      assert.deepEqual(noInputSnapshot.runs[0]?.result, { verdict: "not-applicable" });
    } finally {
      fixture.cleanup();
    }
  });

  it("fails unavailable execution invalid and out-of-scope current batches without records", async () => {
    const unavailableRoot = mkdtempSync(join(tmpdir(), "vibe-check-function-unavailable-"));
    const unavailableDependency: FunctionScannerDependency = {
      executable: join(unavailableRoot, "missing-lizard"),
      args: [],
      availabilityArgs: ["--version"]
    };
    const fixtures = [
      {
        rootDir: unavailableRoot,
        dependency: unavailableDependency,
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
          lizardRow("src/a.ts", "hot", 20, 12, 7, 1, 20),
          lizardRow("../outside.ts", "outside", 20, 12, 7, 1, 20)
        ]),
        referenceOutput: ""
      }), "invalid-result")
    ] as const;

    try {
      for (const fixture of fixtures) {
        const runtime = createFunctionMetricsBinding({
          changedFiles: [],
          current: { rootDir: fixture.rootDir, approvedExactPaths: ["src/a.ts"] },
          dependency: fixture.dependency,
          reference: null,
          semantics
        });
        const snapshot = await coordinateCheckRecords(
          resolveRuntimeCatalog(runtime.binding, ["src/a.ts"])
        );
        assert.equal(snapshot.runs[0]?.status, "failed");
        assert.equal(snapshot.runs[0]?.diagnostic?.category, fixture.expected);
        assert.deepEqual(snapshot.records, []);
      }
    } finally {
      for (const fixture of fixtures) fixture.cleanup();
    }
  });

  it("keeps complete current records when reference scope is incomplete", async () => {
    const fixture = createLizardFixture({
      currentOutput: lizardCsv([lizardRow("src/a.ts", "hot", 20, 12, 7, 1, 20)]),
      referenceOutput: lizardCsv([lizardRow("../outside.ts", "hot", 8, 3, 2, 1, 8)])
    });
    try {
      const runtime = createFunctionMetricsBinding({
        changedFiles: [],
        current: { rootDir: fixture.currentRoot, approvedExactPaths: ["src/a.ts"] },
        dependency: fixture.dependency,
        reference: {
          referenceName: "baseline",
          rootDir: fixture.referenceRoot,
          approvedExactPaths: ["src/a.ts"]
        },
        semantics
      });
      const snapshot = await coordinateCheckRecords(
        resolveRuntimeCatalog(runtime.binding, ["src/a.ts"])
      );

      assert.equal(snapshot.runs[0]?.status, "completed");
      assert.equal(snapshot.records.length, 3);
      assert.deepEqual(runtime.referenceFacts(snapshot), {
        evidence: [{
          checkId: "function-metrics",
          referenceName: "baseline",
          status: "incomplete"
        }],
        relations: []
      });
    } finally {
      fixture.cleanup();
    }
  });
});

function resolveRuntimeCatalog(
  binding: ReturnType<typeof createFunctionMetricsBinding>["binding"],
  approvedExactPaths: readonly string[]
): ResolvedCheckCatalog {
  const catalog = resolveCheckCatalog({
    invocationKey: "function-metrics-test",
    definitions: [FUNCTION_METRICS_CHECK_DEFINITION],
    bindings: [{ checkId: "function-metrics", execute: binding }],
    selectedCheckIds: ["function-metrics"],
    resolveApplicability: () => resolveFunctionMetricsApplicability(approvedExactPaths)
  });
  if (!catalog.ok) throw new Error("Expected function-metrics catalog to resolve");
  return catalog.value;
}

function createLizardFixture(input: Readonly<{
  currentExitCode?: number;
  currentOutput: string;
  referenceExitCode?: number;
  referenceOutput: string;
}>): Readonly<{
  cleanup: () => void;
  currentRoot: string;
  dependency: FunctionScannerDependency;
  referenceRoot: string;
}> {
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

function functionFailureFixture(
  fixture: ReturnType<typeof createLizardFixture>,
  expected: string
) {
  return {
    cleanup: fixture.cleanup,
    dependency: fixture.dependency,
    expected,
    rootDir: fixture.currentRoot
  };
}

const LIZARD_HEADER = "NLOC,CCN,token count,parameter count,length,location,file path,function name,long name,start line,end line";

function lizardCsv(rows: readonly string[]): string {
  return [LIZARD_HEADER, ...rows].join("\n") + "\n";
}

function lizardRow(
  path: string,
  name: string,
  lines: number,
  complexity: number,
  parameters: number,
  startLine: number,
  endLine: number
): string {
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

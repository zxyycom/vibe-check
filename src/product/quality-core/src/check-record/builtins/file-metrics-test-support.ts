import { strict as assert } from "node:assert";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import type { FileScannerDependency } from "../../../../scanner-dependencies.ts";
import { resolveCheckCatalog, type ResolvedCheckCatalog } from "../catalog.ts";
import type { FinalCoreSnapshot } from "../model.ts";
import {
  FILE_METRICS_CHECK_DEFINITION,
  createFileMetricsBinding,
  resolveFileMetricsApplicability
} from "./file-metrics.ts";

export const fileMetricsSemantics = {
  codeAreas: {
    source: {
      description: "Source",
      excludeGlobs: [],
      globs: ["src/**/*.ts"],
      warningPolicy: "moderate"
    }
  },
  generatedFiles: [],
  codeLines: {
    absoluteFloor: 300,
    changedDelta: 100,
    lowDecisionTokenAllowance: {
      codeLineFloor: 500,
      maxDecisionTokens: 10
    }
  }
} as const;

const referenceId = "reference/v1/sha256:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa";

export function resolveFileMetricsTestCatalog(
  binding: ReturnType<typeof createFileMetricsBinding>["binding"],
  approvedExactPaths: readonly string[]
): ResolvedCheckCatalog {
  const catalog = resolveCheckCatalog({
    invocationKey: "file-metrics-test",
    definitions: [FILE_METRICS_CHECK_DEFINITION],
    bindings: [{ checkId: "file-metrics", execute: binding }],
    schedules: [{ checkId: "file-metrics", requiresChecks: [] }],
    selectedCheckIds: ["file-metrics"],
    resolveApplicability: () => resolveFileMetricsApplicability(approvedExactPaths)
  });
  if (!catalog.ok) throw new Error("Expected file-metrics catalog to resolve");
  return catalog.value;
}

export function fileRegressionPolicy() {
  return {
    references: [{ referenceName: "baseline", referenceId }],
    policy: {
      policyId: "file-regressions",
      references: [{ referenceName: "baseline", checkIds: ["file-metrics"] }],
      acceptance: [],
      views: [{
        viewId: "file-regressions",
        selectors: [{ checkId: "file-metrics", recordTypeId: "file-code-lines" }],
        acceptance: "all",
        predicates: [{
          kind: "relation-is",
          referenceName: "baseline",
          relationId: "regression"
        }]
      }],
      readiness: [{
        readinessId: "current-complete",
        predicate: { kind: "run-status", checkId: "file-metrics", status: "completed" },
        reason: "scan-incomplete"
      }, {
        readinessId: "comparison-complete",
        predicate: {
          kind: "reference-status",
          checkId: "file-metrics",
          referenceName: "baseline",
          status: "complete"
        },
        reason: "comparison-unavailable"
      }],
      blockWhen: { kind: "view-not-empty", viewId: "file-regressions" }
    }
  } as const;
}

export function assertExpectedFileWarning(snapshot: FinalCoreSnapshot): void {
  assert.equal(snapshot.runs.length, 1);
  assert.deepEqual(snapshot.runs[0]?.result, { verdict: "failed" });
  assert.equal(snapshot.records.length, 1);
  assert.deepEqual(snapshot.records[0], {
    recordId: snapshot.records[0]?.recordId,
    checkId: "file-metrics",
    checkRunId: snapshot.runs[0]?.checkRunId,
    recordTypeId: "file-code-lines",
    level: "warning",
    semanticSubject: "src/a.ts",
    message: "File src/a.ts has 400 code lines (threshold: 300)",
    fields: {
      codeArea: "source",
      limit: 300,
      metric: "code-lines",
      value: 400
    },
    location: { path: "src/a.ts", line: 1, column: 1 }
  });
}

export interface SccFixture {
  readonly cleanup: () => void;
  readonly currentRoot: string;
  readonly dependency: FileScannerDependency;
  readonly referenceRoot: string;
}

export function createSccFixture(input: Readonly<{
  currentExitCode?: number;
  currentOutput?: string;
  currentRows: readonly string[];
  referenceExitCode?: number;
  referenceOutput?: string;
  referenceRows: readonly string[];
}>): SccFixture {
  const root = mkdtempSync(join(tmpdir(), "vibe-check-file-metrics-"));
  const currentRoot = join(root, "current");
  const referenceRoot = join(root, "reference");
  const scannerPath = join(root, "controlled-scc.ts");
  mkdirSync(currentRoot, { recursive: true });
  mkdirSync(referenceRoot, { recursive: true });
  const header = "Language,Provider,Filename,Lines,Code,Comments,Blanks,Complexity,Bytes,ULOC";
  const currentOutput = input.currentOutput
    ?? [header, ...input.currentRows].join("\n") + "\n";
  const referenceOutput = input.referenceOutput
    ?? [header, ...input.referenceRows].join("\n") + "\n";
  writeFileSync(scannerPath, [
    `const current = ${JSON.stringify(currentOutput)};`,
    `const reference = ${JSON.stringify(referenceOutput)};`,
    `const currentExitCode = ${input.currentExitCode ?? 0};`,
    `const referenceExitCode = ${input.referenceExitCode ?? 0};`,
    "if (process.argv.includes('--version')) process.stdout.write('scc version 3.7.0\\n');",
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

export interface SccFailureFixture {
  readonly cleanup: () => void;
  readonly dependency: FileScannerDependency;
  readonly expectedCategory: string;
  readonly rootDir: string;
}

export function createSccFailureFixtures(): readonly SccFailureFixture[] {
  const unavailableRoot = mkdtempSync(join(tmpdir(), "vibe-check-file-metrics-unavailable-"));
  return [
    {
      expectedCategory: "unavailable",
      rootDir: unavailableRoot,
      dependency: {
        executable: join(unavailableRoot, "missing-scc"),
        args: [],
        availabilityArgs: ["--version"]
      },
      cleanup: () => rmSync(unavailableRoot, { recursive: true, force: true })
    },
    fixtureCase(createSccFixture({
      currentRows: [],
      referenceRows: [],
      currentExitCode: 7
    }), "execution-failed"),
    fixtureCase(createSccFixture({
      currentOutput: "not,scc,csv\n",
      currentRows: [],
      referenceRows: []
    }), "invalid-result"),
    fixtureCase(createSccFixture({
      currentRows: [
        sccRow("src/a.ts", 450, 400, 20),
        sccRow("../outside.ts", 450, 400, 20)
      ],
      referenceRows: []
    }), "invalid-result")
  ];
}

function fixtureCase(fixture: SccFixture, expectedCategory: string): SccFailureFixture {
  return {
    cleanup: fixture.cleanup,
    dependency: fixture.dependency,
    expectedCategory,
    rootDir: fixture.currentRoot
  };
}

export function sccRow(
  path: string,
  lines: number,
  codeLines: number,
  decisionTokens: number
): string {
  return `TypeScript,,${path},${lines},${codeLines},20,30,${decisionTokens},1000,${codeLines}`;
}

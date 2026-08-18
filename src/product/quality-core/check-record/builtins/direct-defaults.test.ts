import assert from "node:assert/strict";
import { existsSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, it } from "node:test";

import type {
  DuplicateDetectionOptions,
  FileMetricsOptions,
  FunctionMetricsOptions
} from "../../../definition/built-ins.ts";
import type {
  CheckExecution,
  CheckExecutionContext,
  CheckProjectContext,
  CheckReferenceCandidate,
  CheckResult,
  DeepReadonly,
  QualityRecordCandidate
} from "../../../definition/custom-check.ts";
import { executeDuplicateDetection } from "./duplicate-detection.ts";
import { executeFileMetrics } from "./file-metrics.ts";
import { executeFunctionMetrics } from "./function-metrics.ts";

const FILES = Object.freeze({
  codeAreas: Object.freeze({
    source: Object.freeze({
      description: "Source",
      excludeGlobs: Object.freeze([]),
      globs: Object.freeze(["src/**/*.ts"]),
      warningPolicy: "moderate" as const
    })
  }),
  excludeDirs: Object.freeze([]),
  generatedFiles: Object.freeze([]),
  include: Object.freeze(["**/*.ts"])
});

function project(root: string): CheckProjectContext {
  return Object.freeze({
    cache: Object.freeze({ directory: "cache", enabled: true, reportActivity: () => undefined }),
    changedFiles: Object.freeze(["src/a.ts"]),
    comparison: null,
    files: FILES,
    root
  });
}

async function execute<Options extends object>(
  callback: CheckExecution<Options>,
  options: DeepReadonly<Options>,
  root: string
): Promise<
  Readonly<{
    readonly records: readonly QualityRecordCandidate[];
    readonly references: readonly CheckReferenceCandidate[];
    readonly result: CheckResult;
  }>
> {
  const records: QualityRecordCandidate[] = [];
  const references: CheckReferenceCandidate[] = [];
  const context: CheckExecutionContext<Options> = Object.freeze({
    options,
    project: project(root),
    records: Object.freeze({
      report: (candidate: QualityRecordCandidate): void => {
        records.push(candidate);
      },
      reportReference: (candidate: CheckReferenceCandidate): void => {
        references.push(candidate);
      }
    }),
    signal: new AbortController().signal
  });
  const result = await callback(context);
  return Object.freeze({
    records: Object.freeze(records),
    references: Object.freeze(references),
    result
  });
}

function createRoot(prefix: string): string {
  const root = mkdtempSync(join(tmpdir(), prefix));
  mkdirSync(join(root, "src"), { recursive: true });
  writeFileSync(join(root, "src", "a.ts"), "export const a = 1;\n", "utf8");
  writeFileSync(join(root, "src", "b.ts"), "export const b = 2;\n", "utf8");
  return root;
}

function scanner(root: string, source: string): readonly string[] {
  const path = join(root, "scanner.mjs");
  writeFileSync(path, source, "utf8");
  return Object.freeze([path]);
}

describe("default Check direct callbacks", () => {
  it("executes file metrics from Check-owned scanner options and reports Check-owned candidates", async () => {
    const root = createRoot("vibe-check-direct-file-");
    try {
      const args = scanner(
        root,
        [
          "if (process.argv.includes('--version')) process.stdout.write('scc version 3.7.0\\n');",
          "else process.stdout.write('Language,Provider,Filename,Lines,Code,Comments,Blanks,Complexity,Bytes,ULOC\\nTypeScript,,src/a.ts,450,400,20,30,20,1000,400\\n');"
        ].join("\n")
      );
      const options: FileMetricsOptions = {
        scanner: { executable: process.execPath, args, availabilityArgs: [...args, "--version"] },
        codeLines: {
          absoluteFloor: 300,
          changedDelta: 100,
          lowDecisionTokenAllowance: { codeLineFloor: 500, maxDecisionTokens: 10 }
        }
      };
      const result = await execute(executeFileMetrics, options, root);
      assert.deepEqual(result.result, { status: "completed", verdict: "failed" });
      assert.equal(result.records.length, 1);
      assert.equal(result.records[0]?.recordTypeId, "file-code-lines");
      assert.deepEqual(result.references, []);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  it("executes function metrics from Check-owned scanner options and reports all metric Records", async () => {
    const root = createRoot("vibe-check-direct-function-");
    try {
      const args = scanner(
        root,
        [
          "if (process.argv.includes('--version')) process.stdout.write('lizard 1.23\\n');",
          "else process.stdout.write('NLOC,CCN,token count,parameter count,length,location,file path,function name,long name,start line,end line\\n20,12,100,7,20,hot@1-20@src/a.ts,src/a.ts,hot,hot (),1,20\\n');"
        ].join("\n")
      );
      const options: FunctionMetricsOptions = {
        scanner: { executable: process.execPath, args, availabilityArgs: [...args, "--version"] },
        codeLines: {
          absoluteFloor: 10,
          changedDelta: 3,
          lowComplexityAllowance: { codeLineFloor: 20, maxCyclomaticComplexityExclusive: 3 }
        },
        cyclomaticComplexity: { absoluteFloor: 5, changedDelta: 2 },
        parameterCount: { absoluteFloor: 4, changedDelta: 2 }
      };
      const result = await execute(executeFunctionMetrics, options, root);
      assert.deepEqual(result.result, { status: "completed", verdict: "failed" });
      assert.deepEqual(result.records.map((record) => record.recordTypeId).sort(), [
        "function-code-lines",
        "function-cyclomatic-complexity",
        "function-parameter-count"
      ]);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  it("executes duplicate detection from Check-owned scanner options and uses the invocation cache context", async () => {
    const root = createRoot("vibe-check-direct-duplicate-");
    try {
      const report = JSON.stringify({
        duplicates: [
          {
            firstFile: { name: "src/a.ts", startLoc: { line: 10 }, endLoc: { line: 21 } },
            secondFile: { name: "src/b.ts", startLoc: { line: 20 }, endLoc: { line: 31 } },
            lines: 12,
            tokens: 80
          }
        ]
      });
      const args = scanner(
        root,
        [
          "import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';",
          "import { join } from 'node:path';",
          "if (process.argv.includes('--version')) process.stdout.write('jscpd 5.0.11\\n');",
          "else {",
          "  const output = process.argv[process.argv.indexOf('--output') + 1];",
          "  mkdirSync(output, { recursive: true });",
          `  writeFileSync(join(output, 'jscpd-report.json'), ${JSON.stringify(report)});`,
          "}"
        ].join("\n")
      );
      const options: DuplicateDetectionOptions = {
        scanner: {
          executable: process.execPath,
          args,
          availabilityArgs: [...args, "--version"],
          maxConcurrency: 1
        },
        defaultMinimumTokens: 50,
        fragments: { changedDelta: 1 },
        minimumTokensByCodeArea: {}
      };
      const result = await execute(executeDuplicateDetection, options, root);
      assert.deepEqual(result.result, { status: "completed", verdict: "failed" });
      assert.equal(result.records[0]?.recordTypeId, "duplicate-code");
      assert.equal(result.references.length, 0);
      assert.equal(existsSync(join(root, "cache", "quality-scan-cache-v1")), true);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });
});

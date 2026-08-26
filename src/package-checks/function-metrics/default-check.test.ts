import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, it } from "node:test";

import type { FunctionMetricsOptions } from "./options.ts";
import { executeFunctionMetrics } from "./execution.ts";
import { functionMetrics } from "./default-check.ts";
import type {
  CheckDependencies,
  CheckExecution,
  CheckExecutionContext,
  CheckProjectContext,
  CheckResult,
  DeepReadonly
} from "../../check/check.ts";

const CODE_AREAS = Object.freeze({
  source: Object.freeze({
    description: "Source",
    excludeGlobs: Object.freeze([]),
    globs: Object.freeze(["src/**/*.ts"]),
    warningPolicy: "moderate" as const
  })
});

const FILES = Object.freeze({
  excludeDirs: Object.freeze([]),
  generatedFiles: Object.freeze([]),
  include: Object.freeze(["**/*.ts"])
});

const NO_DEPENDENCIES: CheckDependencies = Object.freeze({
  get: (checkId: string) =>
    Object.freeze({
      ok: false,
      error: Object.freeze({ code: "dependency-not-declared", checkId })
    })
});

function project(root: string): CheckProjectContext {
  return Object.freeze({
    changedFiles: Object.freeze(["src/a.ts"]),
    flags: Object.freeze([]),
    root
  });
}

async function execute<Options extends object>(
  callback: CheckExecution<Options>,
  options: DeepReadonly<Options>,
  root: string,
  signal: AbortSignal = new AbortController().signal
): Promise<
  Readonly<{
    readonly records: readonly ReportedRecord[];
    readonly result: CheckResult;
  }>
> {
  const records: ReportedRecord[] = [];
  const context: CheckExecutionContext<Options> = Object.freeze({
    dependencies: NO_DEPENDENCIES,
    options,
    project: project(root),
    records: Object.freeze({
      report: (identity: Readonly<{ readonly id: string }>, data: object): void => {
        records.push(Object.freeze({ data, identity }));
      }
    }),
    signal
  });
  const result = await callback(context);
  return Object.freeze({
    records: Object.freeze(records),
    result
  });
}

interface ReportedRecord {
  readonly data: object;
  readonly identity: Readonly<{ readonly id: string }>;
}

function reportedMetric(data: object): unknown {
  return "metric" in data ? data.metric : undefined;
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
  it("executes function metrics from Check-owned scanner options with final data and local Record IDs", async () => {
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
        codeAreas: CODE_AREAS,
        files: FILES,
        scanner: { executable: process.execPath, args, availabilityArgs: [...args, "--version"] },
        codeLines: {
          absoluteFloor: 10,
          lowComplexityAllowance: { codeLineFloor: 20, maxCyclomaticComplexityExclusive: 3 }
        },
        cyclomaticComplexity: { absoluteFloor: 5 },
        parameterCount: { absoluteFloor: 4 }
      };
      const invalidPreflight = await functionMetrics.preflight!(
        {
          ...options,
          scanner: { ...options.scanner, executable: "" }
        },
        new AbortController().signal
      );
      assert.equal(invalidPreflight.status, "failure");
      assert.deepEqual(
        (
          await execute(
            executeFunctionMetrics,
            { ...options, scanner: { ...options.scanner, executable: "" } },
            root
          )
        ).result,
        { status: "unavailable", reason: { code: "invalid-options" } }
      );
      const result = await execute(executeFunctionMetrics, options, root);
      assert.deepEqual(result.result, { status: "failed", data: { findingCount: 3 } });
      assert.deepEqual(
        result.records.map((record) => ({
          id: record.identity.id,
          metric: reportedMetric(record.data)
        })),
        [
          {
            id: 'function:{"file":"src/a.ts","name":"hot"}:cyclomatic-complexity',
            metric: "cyclomatic-complexity"
          },
          {
            id: 'function:{"file":"src/a.ts","name":"hot"}:function-code-density',
            metric: "function-code-density"
          },
          {
            id: 'function:{"file":"src/a.ts","name":"hot"}:parameter-count',
            metric: "parameter-count"
          }
        ]
      );
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });
});

import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, it } from "node:test";

import type { FileMetricsOptions } from "../file-metrics/options.ts";
import { executeFileMetrics } from "../file-metrics/execution.ts";
import { fileMetrics } from "../file-metrics/default-check.ts";
import type {
  CheckDependencies,
  CheckExecution,
  CheckExecutionContext,
  CheckProjectContext,
  CheckResult,
  DeepReadonly
} from "../../definition/custom-check.ts";

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
    cache: Object.freeze({ directory: "cache", enabled: true, reportActivity: () => undefined }),
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
  it("executes file metrics from Check-owned scanner options with final data and supplemental Records", async () => {
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
        codeAreas: CODE_AREAS,
        files: FILES,
        scanner: { executable: process.execPath, args, availabilityArgs: [...args, "--version"] },
        codeLines: {
          absoluteFloor: 300,
          lowDecisionTokenAllowance: { codeLineFloor: 500, maxDecisionTokens: 10 }
        }
      };
      const invalidPreflight = await fileMetrics.preflight!(
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
            executeFileMetrics,
            { ...options, scanner: { ...options.scanner, executable: "" } },
            root
          )
        ).result,
        { status: "unavailable", reason: { code: "invalid-options" } }
      );
      const result = await execute(executeFileMetrics, options, root);
      assert.deepEqual(result.result, { status: "failed", data: { findingCount: 1 } });
      assert.deepEqual(result.records, [
        {
          data: {
            codeArea: "source",
            codeLines: 400,
            limit: 300,
            metric: "code-lines",
            path: "src/a.ts"
          },
          identity: { id: "src/a.ts" }
        }
      ]);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });
});

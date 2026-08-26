import assert from "node:assert/strict";
import { existsSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, it } from "node:test";

import type { DuplicateDetectionOptions } from "../duplicate-detection/options.ts";
import { executeDuplicateDetection } from "../duplicate-detection/execution.ts";
import { duplicateDetection } from "../duplicate-detection/default-check.ts";
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
  it("executes duplicate detection from Check-owned scanner options with final data and cache context", async () => {
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
        codeAreas: CODE_AREAS,
        files: FILES,
        scanner: {
          executable: process.execPath,
          args,
          availabilityArgs: [...args, "--version"],
          maxConcurrency: 1
        },
        defaultMinimumTokens: 50,
        minimumTokensByCodeArea: {}
      };
      const invalidPreflight = await duplicateDetection.preflight!(
        {
          ...options,
          minimumTokensByCodeArea: { unknown: 50 }
        },
        new AbortController().signal
      );
      assert.equal(invalidPreflight.status, "failure");
      assert.deepEqual(
        (
          await execute(
            executeDuplicateDetection,
            { ...options, minimumTokensByCodeArea: { unknown: 50 } },
            root
          )
        ).result,
        { status: "unavailable", reason: { code: "invalid-options" } }
      );
      const result = await execute(executeDuplicateDetection, options, root);
      assert.deepEqual(result.result, { status: "failed", data: { findingCount: 1 } });
      assert.equal(result.records.length, 1);
      assert.match(result.records[0]?.identity.id ?? "", /^duplicate-fragment\/v1\/sha256:/);
      assert.deepEqual(result.records[0]?.data, {
        codeAreas: ["source"],
        lineCount: 12,
        locations: [
          { endLine: 21, path: "src/a.ts", startLine: 10 },
          { endLine: 31, path: "src/b.ts", startLine: 20 }
        ],
        metric: "duplicate-tokens",
        tokenCount: 80
      });
      assert.equal(existsSync(join(root, "cache", "quality-scan-cache-v1")), true);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });
});

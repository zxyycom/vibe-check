import assert from "node:assert/strict";
import {
  chmodSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, it } from "node:test";

import { executeDuplicateDetection } from "./execution.ts";
import { duplicateDetection } from "./default-check.ts";
import { parseDuplicateDetectionData } from "./final-data.ts";
import { validResolvedDuplicateDetectionOptions } from "./options-validation.ts";
import { defaultProjectFileSelection } from "../project-files/configuration.ts";
import type {
  CheckDependencies,
  CheckExecution,
  CheckExecutionContext,
  CheckProjectContext,
  CheckResult,
  DeepReadonly
} from "../../check/check.ts";

const FILES = Object.freeze({
  exclude: Object.freeze([]),
  include: Object.freeze(["**/*.ts"]),
  source: "filesystem" as const
});

const CODE_AREAS = Object.freeze({
  source: Object.freeze({ files: FILES, minimumLines: 3, minimumTokens: 50 })
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

function scanner(root: string, source: string): string {
  const path = join(root, "scanner.mjs");
  writeFileSync(path, `#!/usr/bin/env bun\n${source}`, "utf8");
  chmodSync(path, 0o755);
  return path;
}

async function assertInvalidOptionsAreRejected(
  check: ReturnType<typeof duplicateDetection>,
  options: ReturnType<typeof duplicateDetection>["options"],
  root: string,
  executable: string
): Promise<void> {
  const invalidPreflight = await check.preflight!(
    { ...options, codeAreas: {} },
    new AbortController().signal
  );
  assert.equal(invalidPreflight.status, "failure");
  const sourceArea = options.codeAreas.source;
  assert.notEqual(sourceArea, undefined);
  for (const invalidOptions of [
    { ...options, cache: { ...options.cache, directory: "" } },
    { ...options, codeAreas: { source: { ...sourceArea, minimumTokens: -1 } } },
    { ...options, codeAreas: { source: { ...sourceArea, minimumTokens: 1.5 } } },
    { ...options, codeAreas: { source: { ...sourceArea, minimumLines: 0 } } },
    { ...options, codeAreas: { source: { ...sourceArea, findingPolicy: "warning" } } },
    { ...options, codeAreas: { source: { minimumLines: 3, minimumTokens: 50 } } },
    { ...options, codeAreas: { "": sourceArea } },
    { ...options, files: FILES },
    { ...options, scanner: { ...options.scanner, workers: 0 } },
    {
      ...options,
      scanner: {
        ...options.scanner,
        command: { ...options.scanner.command, args: ["--workers=2"] }
      }
    }
  ]) {
    assert.equal(validResolvedDuplicateDetectionOptions(invalidOptions), false);
  }
  for (const invalidInput of [
    { cache: { directory: "" } },
    { codeAreas: {} },
    { codeAreas: { source: { files: { excludeDirs: [] } } } },
    { findingPolicy: "warning" },
    { codeAreas: { source: { files: {}, minimumTokens: -1 } } },
    { codeAreas: { source: { minimumTokens: 75 } } },
    { files: FILES },
    { scanner: { workers: 0 } },
    { scanner: { command: { executable, kind: "custom", args: [] } } }
  ]) {
    assert.throws(
      () => Reflect.apply(duplicateDetection, undefined, [invalidInput]),
      /duplicateDetection options are invalid/
    );
  }
  assert.deepEqual(
    (await execute(executeDuplicateDetection, { ...options, codeAreas: {} }, root)).result,
    {
      status: "unavailable",
      reason: { code: "invalid-options" },
      messages: [
        {
          code: "invalid-options",
          level: "error",
          message:
            "duplicateDetection options are invalid; recreate the Check with duplicateDetection(options) or restore its complete resolved options."
        }
      ]
    }
  );
}

function duplicateScannerExecutable(root: string): string {
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
  const executable = scanner(
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
  return executable;
}

async function assertSourceAndCacheWriteFailures(
  options: ReturnType<typeof duplicateDetection>["options"],
  root: string
): Promise<void> {
  const sourceUnavailable = await execute(
    executeDuplicateDetection,
    {
      ...options,
      codeAreas: {
        source: {
          ...options.codeAreas.source,
          files: { ...options.codeAreas.source.files, source: "git-worktree" }
        }
      }
    },
    root
  );
  assert.deepEqual(sourceUnavailable.result, {
    status: "unavailable",
    reason: { code: "source-unavailable" },
    messages: [
      {
        code: "source-unavailable",
        level: "error",
        message:
          "Duplicate detection could not collect its configured project files; check the project root, file permissions, and selected file source."
      }
    ]
  });
  assert.equal(existsSync(join(root, ".cache", "vibe-check", "quality-scan-cache-v3")), true);
  writeFileSync(join(root, "blocked-cache"), "not a directory");
  const cacheWriteFailure = await execute(
    executeDuplicateDetection,
    { ...options, cache: { directory: "blocked-cache", enabled: true } },
    root
  );
  assert.deepEqual(cacheWriteFailure.result, {
    status: "unavailable",
    reason: { code: "cache-write-failed" },
    messages: [
      {
        code: "cache-write-failed",
        level: "error",
        message:
          "Duplicate detection completed scanning but could not write its cache; check the configured cache directory permissions."
      }
    ]
  });
}

function createOverlappingAreaCheck(root: string) {
  mkdirSync(join(root, "scripts"), { recursive: true });
  mkdirSync(join(root, "src"), { recursive: true });
  writeFileSync(join(root, "scripts", "b.ts"), "export const b = 2;\n", "utf8");
  writeFileSync(join(root, "src", "a.ts"), "export const a = 1;\n", "utf8");
  const scanCountPath = join(root, "scan-count.txt");
  const report = JSON.stringify({
    duplicates: [
      duplicateReportItem(120, 5, 8),
      duplicateReportItem(80, 20, 12),
      duplicateReportItem(120, 40, 12)
    ]
  });
  const executable = scanner(
    root,
    [
      "import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';",
      "import { join } from 'node:path';",
      "if (process.argv.includes('--version')) process.stdout.write('jscpd 5.0.11\\n');",
      "else {",
      "  const config = JSON.parse(readFileSync(process.argv[process.argv.indexOf('--config') + 1], 'utf8'));",
      `  if (config.minTokens !== 20 || config.minLines !== 3 || JSON.stringify(config.path) !== ${JSON.stringify(JSON.stringify(["scripts/b.ts", "src/a.ts"]))}) process.exit(2);`,
      "  if (process.argv.includes('--workers')) process.exit(3);",
      `  const countPath = ${JSON.stringify(scanCountPath)};`,
      "  const count = existsSync(countPath) ? Number(readFileSync(countPath, 'utf8')) : 0;",
      "  writeFileSync(countPath, String(count + 1));",
      "  const output = process.argv[process.argv.indexOf('--output') + 1];",
      "  mkdirSync(output, { recursive: true });",
      `  writeFileSync(join(output, 'jscpd-report.json'), ${JSON.stringify(report)});`,
      "}"
    ].join("\n")
  );
  const codeAreas = {
    scripts: {
      files: { ...FILES, include: ["scripts/**/*.ts"] },
      minimumLines: 10,
      minimumTokens: 100
    },
    shared: {
      files: FILES,
      minimumLines: 5,
      minimumTokens: 90
    },
    source: {
      files: { ...FILES, include: ["src/**/*.ts"] },
      minimumLines: 3,
      minimumTokens: 20
    }
  };
  const check = duplicateDetection({
    cache: { directory: ".cache/vibe-check", enabled: true },
    codeAreas,
    findingPolicy: "non-blocking",
    scanner: {
      command: { executable, kind: "custom" }
    }
  });
  return { options: check.options, scanCountPath };
}

function assertDefaultCheckComposition(): void {
  const defaultCheck = duplicateDetection();
  assert.equal(defaultCheck.parseData, parseDuplicateDetectionData);
  assert.deepEqual(defaultCheck.parseData({ blockingFindingCount: 1, findingCount: 2 }), {
    blockingFindingCount: 1,
    findingCount: 2
  });
  assert.throws(
    () => defaultCheck.parseData({ blockingFindingCount: 2, findingCount: 1 }),
    /duplicateDetection final data/
  );
  assert.deepEqual(defaultCheck.options, {
    cache: { directory: ".cache/vibe-check", enabled: true },
    codeAreas: {
      project: {
        files: defaultProjectFileSelection,
        findingPolicy: "non-blocking",
        minimumLines: 4,
        minimumTokens: 100
      }
    },
    scanner: { command: { kind: "package" } }
  });
  assert.equal(Object.isFrozen(defaultCheck.options), true);
  assert.deepEqual(
    duplicateDetection({
      codeAreas: { source: { files: { include: ["src/**/*.ts"] } } }
    }).options.codeAreas.source,
    {
      files: {
        exclude: defaultCheck.options.codeAreas.project.files.exclude,
        include: ["src/**/*.ts"],
        source: "filesystem"
      },
      findingPolicy: "non-blocking",
      minimumLines: 4,
      minimumTokens: 100
    }
  );
  const specialAreaId = "__proto__";
  const specialAreaCheck = duplicateDetection({
    codeAreas: Object.fromEntries([[specialAreaId, { files: {} }]])
  });
  assert.equal(Object.hasOwn(specialAreaCheck.options.codeAreas, specialAreaId), true);
  assert.deepEqual(specialAreaCheck.options.codeAreas[specialAreaId], {
    files: defaultCheck.options.codeAreas.project.files,
    findingPolicy: "non-blocking",
    minimumLines: 4,
    minimumTokens: 100
  });
}

async function assertInitialOverlappingAreaResult(
  options: ReturnType<typeof duplicateDetection>["options"],
  root: string,
  scanCountPath: string
): Promise<void> {
  const result = await execute(executeDuplicateDetection, options, root);
  assert.deepEqual(result.result, {
    status: "passed",
    data: { blockingFindingCount: 0, findingCount: 1 },
    messages: [
      {
        code: "non-blocking-findings",
        level: "warning",
        message:
          "1 non-blocking finding(s) were recorded; inspect this Check's Records for affected paths and measurements, then update the code or policy."
      }
    ]
  });
  assert.equal(readFileSync(scanCountPath, "utf8"), "1");
  assert.equal(result.records.length, 1);
  assert.deepEqual(result.records[0]?.data, {
    blocking: false,
    codeAreas: ["scripts", "shared", "source"],
    lineCount: 12,
    locations: [
      { endLine: 51, path: "scripts/b.ts", startLine: 40 },
      { endLine: 51, path: "src/a.ts", startLine: 40 }
    ],
    metric: "duplicate-tokens",
    tokenCount: 120
  });
}

async function assertReevaluatedOverlappingPolicies(
  options: ReturnType<typeof duplicateDetection>["options"],
  root: string,
  scanCountPath: string
): Promise<void> {
  const blockingOverlap = await execute(
    executeDuplicateDetection,
    {
      ...options,
      codeAreas: {
        ...options.codeAreas,
        scripts: { ...options.codeAreas.scripts, findingPolicy: "blocking" }
      }
    },
    root
  );
  assert.deepEqual(blockingOverlap.result, {
    status: "failed",
    data: { blockingFindingCount: 1, findingCount: 1 },
    messages: [
      {
        code: "blocking-findings",
        level: "error",
        message:
          "1 blocking finding(s) require attention; inspect this Check's Records for affected paths and measurements, then update the code or policy."
      }
    ]
  });
  assert.equal(Reflect.get(blockingOverlap.records[0]?.data ?? {}, "blocking"), true);
  assert.equal(readFileSync(scanCountPath, "utf8"), "1");
  const stricter = await execute(
    executeDuplicateDetection,
    {
      ...options,
      codeAreas: {
        ...options.codeAreas,
        scripts: { ...options.codeAreas.scripts, minimumTokens: 130 }
      }
    },
    root
  );
  assert.deepEqual(stricter.result, {
    status: "passed",
    data: { blockingFindingCount: 0, findingCount: 0 }
  });
  assert.equal(stricter.records.length, 0);
  assert.equal(readFileSync(scanCountPath, "utf8"), "1");
}

describe("default Check direct callbacks", () => {
  it("executes duplicate detection from Check-owned scanner options with final data and Check-owned cache options", async function executesDuplicateDetectionWithCheckOwnedOptions() {
    assertDefaultCheckComposition();
    const root = createRoot("vibe-check-direct-duplicate-");
    try {
      const executable = duplicateScannerExecutable(root);
      const check = duplicateDetection({
        cache: { directory: ".cache/vibe-check", enabled: true },
        codeAreas: CODE_AREAS,
        scanner: {
          command: { executable, kind: "custom" }
        }
      });
      const options = check.options;
      await assertInvalidOptionsAreRejected(check, options, root, executable);
      const result = await execute(executeDuplicateDetection, options, root);
      assert.deepEqual(result.result, {
        status: "passed",
        data: { blockingFindingCount: 0, findingCount: 1 },
        messages: [
          {
            code: "non-blocking-findings",
            level: "warning",
            message:
              "1 non-blocking finding(s) were recorded; inspect this Check's Records for affected paths and measurements, then update the code or policy."
          }
        ]
      });
      assert.equal(result.records.length, 1);
      assert.match(result.records[0]?.identity.id ?? "", /^duplicate-fragment\/v1\/sha256:/);
      assert.deepEqual(result.records[0]?.data, {
        blocking: false,
        codeAreas: ["source"],
        lineCount: 12,
        locations: [
          { endLine: 21, path: "src/a.ts", startLine: 10 },
          { endLine: 31, path: "src/b.ts", startLine: 20 }
        ],
        metric: "duplicate-tokens",
        tokenCount: 80
      });
      await assertSourceAndCacheWriteFailures(options, root);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  it("scans area-owned exact inputs once and applies the strictest overlapping area policy", async function appliesOverlappingAreaPolicyToOneScan() {
    const root = mkdtempSync(join(tmpdir(), "vibe-check-cross-area-duplicate-"));
    const { options, scanCountPath } = createOverlappingAreaCheck(root);
    try {
      await assertInitialOverlappingAreaResult(options, root, scanCountPath);
      await assertReevaluatedOverlappingPolicies(options, root, scanCountPath);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });
});

function duplicateReportItem(tokens: number, startLine: number, lineCount: number): object {
  return {
    firstFile: {
      name: "src/a.ts",
      startLoc: { line: startLine },
      endLoc: { line: startLine + lineCount - 1 }
    },
    secondFile: {
      name: "scripts/b.ts",
      startLoc: { line: startLine },
      endLoc: { line: startLine + lineCount - 1 }
    },
    lines: lineCount,
    tokens
  };
}

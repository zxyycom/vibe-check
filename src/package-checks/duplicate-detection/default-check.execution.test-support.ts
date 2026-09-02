import assert from "node:assert/strict";
import { chmodSync, existsSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { createTypeScriptSourceRoot, executeCheck } from "../check-execution.test-support.ts";
import { duplicateDetection } from "./default-check.ts";
import { executeDuplicateDetection } from "./execution.ts";
import { validResolvedDuplicateDetectionOptions } from "./options-validation.ts";

export const FILES = Object.freeze({
  exclude: Object.freeze([]),
  include: Object.freeze(["**/*.ts"]),
  source: "filesystem" as const
});

export const CODE_AREAS = Object.freeze({
  source: Object.freeze({ files: FILES, minimumLines: 3, minimumTokens: 50 })
});

export const execute = executeCheck;

export function createRoot(prefix: string): string {
  return createTypeScriptSourceRoot(prefix);
}

export function createRealDuplicateRoot(): string {
  const root = mkdtempSync(join(tmpdir(), "vibe-check-public-duplicate-"));
  const source = [
    "export function duplicateExample(value: number): number {",
    "  let total = value;",
    "  total += 1;",
    "  total += 2;",
    "  total += 3;",
    "  total += 4;",
    "  total += 5;",
    "  total += 6;",
    "  total += 7;",
    "  total += 8;",
    "  total += 9;",
    "  total += 10;",
    "  return total;",
    "}",
    ""
  ].join("\n");
  writeFileSync(join(root, "duplicate-a.ts"), source, "utf8");
  writeFileSync(join(root, "duplicate-b.ts"), source, "utf8");
  return root;
}

export function scanner(root: string, source: string): string {
  const path = join(root, "scanner.mjs");
  writeFileSync(path, `#!/usr/bin/env bun\n${source}`, "utf8");
  chmodSync(path, 0o755);
  return path;
}

export async function assertInvalidOptionsAreRejected(
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

export function duplicateScannerExecutable(root: string): string {
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

export async function assertSourceAndCacheWriteFailures(
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

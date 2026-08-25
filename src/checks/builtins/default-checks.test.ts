import assert from "node:assert/strict";
import { existsSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, it } from "node:test";

import type {
  DuplicateDetectionOptions,
  FileMetricsOptions,
  FunctionMetricsOptions,
  MarkdownLinkValidationOptions
} from "../../definition/default-checks.ts";
import { validateDefaultCheckOptions } from "../../definition/default-checks.ts";
import type {
  CheckDependencies,
  CheckExecution,
  CheckExecutionContext,
  CheckProjectContext,
  CheckResult,
  DeepReadonly
} from "../../definition/custom-check.ts";
import { executeDuplicateDetection } from "./duplicate-detection.ts";
import { executeFileMetrics } from "./file-metrics.ts";
import { executeFunctionMetrics } from "./function-metrics.ts";
import { executeMarkdownLinkValidation } from "./markdown-link-validation.ts";

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

const MARKDOWN_FILES = Object.freeze({
  codeAreas: Object.freeze({}),
  excludeDirs: Object.freeze([]),
  generatedFiles: Object.freeze([]),
  include: Object.freeze(["**/*.md", "**/*.markdown"])
});

const MARKDOWN_LINK_OPTIONS: MarkdownLinkValidationOptions = Object.freeze({
  requireExistingTargets: true,
  validateSameDocumentAnchors: true,
  validateCrossDocumentAnchors: true,
  rootExternalTargetMode: "report",
  requireNonEmptyDirectories: false,
  limits: Object.freeze({
    maxMarkdownBytes: 1_048_576,
    maxOccurrences: 10_000,
    maxTargetReads: 1_000
  })
});

const NO_DEPENDENCIES: CheckDependencies = Object.freeze({
  get: (checkId: string) =>
    Object.freeze({
      ok: false,
      error: Object.freeze({ code: "dependency-not-declared", checkId })
    })
});

function project(root: string, files: CheckProjectContext["files"] = FILES): CheckProjectContext {
  return Object.freeze({
    cache: Object.freeze({ directory: "cache", enabled: true, reportActivity: () => undefined }),
    changedFiles: Object.freeze(["src/a.ts"]),
    flags: Object.freeze([]),
    files,
    root
  });
}

async function execute<Options extends object>(
  callback: CheckExecution<Options>,
  options: DeepReadonly<Options>,
  root: string,
  files: CheckProjectContext["files"] = FILES,
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
    project: project(root, files),
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
  it("requires the complete closed Markdown Link options shape and bounded limits", () => {
    assert.equal(
      validateDefaultCheckOptions("markdown-link-validation", MARKDOWN_LINK_OPTIONS),
      true
    );
    assert.equal(
      validateDefaultCheckOptions("markdown-link-validation", {
        ...MARKDOWN_LINK_OPTIONS,
        limits: { maxMarkdownBytes: 1_048_576, maxOccurrences: 10_000 }
      }),
      false
    );
    assert.equal(
      validateDefaultCheckOptions("markdown-link-validation", {
        ...MARKDOWN_LINK_OPTIONS,
        limits: { ...MARKDOWN_LINK_OPTIONS.limits, maxTargetReads: 10_001 }
      }),
      false
    );
    assert.equal(
      validateDefaultCheckOptions("markdown-link-validation", {
        ...MARKDOWN_LINK_OPTIONS,
        unexpected: true
      }),
      false
    );
  });

  it("reports safe Markdown Link findings only after a complete traversal", async () => {
    const root = createRoot("vibe-check-direct-markdown-link-");
    try {
      mkdirSync(join(root, "docs"), { recursive: true });
      writeFileSync(
        join(root, "docs", "guide.md"),
        "[missing](missing.md)\n<https://example.test/private>\n",
        "utf8"
      );

      const result = await execute(
        executeMarkdownLinkValidation,
        MARKDOWN_LINK_OPTIONS,
        root,
        MARKDOWN_FILES
      );
      assert.deepEqual(result.result, {
        status: "failed",
        data: { sourceFileCount: 1, occurrenceCount: 2, targetReadCount: 1, findingCount: 1 }
      });
      assert.deepEqual(result.records, [
        {
          identity: { id: "source:docs%2Fguide.md:occurrence:1:reason:missing-target" },
          data: {
            reason: "missing-target",
            occurrenceKind: "link",
            sourcePath: "docs/guide.md",
            range: {
              start: { line: 1, column: 1 },
              end: { line: 1, column: 22 }
            },
            target: { kind: "project-path", path: "docs/missing.md", fragment: null }
          }
        }
      ]);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  it("reports a root-external target without persisting its path, fragment, or query", async () => {
    const root = createRoot("vibe-check-direct-markdown-link-external-");
    try {
      mkdirSync(join(root, "docs"), { recursive: true });
      writeFileSync(
        join(root, "docs", "guide.md"),
        "[external](../../outside/private.md?credential=do-not-persist#private-anchor)\n",
        "utf8"
      );

      const result = await execute(
        executeMarkdownLinkValidation,
        MARKDOWN_LINK_OPTIONS,
        root,
        MARKDOWN_FILES
      );
      assert.deepEqual(result.result, {
        status: "failed",
        data: { sourceFileCount: 1, occurrenceCount: 1, targetReadCount: 0, findingCount: 1 }
      });
      assert.deepEqual(result.records, [
        {
          identity: {
            id: "source:docs%2Fguide.md:occurrence:1:reason:target-outside-project-root"
          },
          data: {
            reason: "target-outside-project-root",
            occurrenceKind: "link",
            sourcePath: "docs/guide.md",
            range: {
              start: { line: 1, column: 1 },
              end: { line: 1, column: 78 }
            },
            target: { kind: "outside-project-root" }
          }
        }
      ]);
      const persisted = JSON.stringify({ records: result.records, result: result.result });
      assert.equal(persisted.includes("private.md"), false);
      assert.equal(persisted.includes("private-anchor"), false);
      assert.equal(persisted.includes("credential=do-not-persist"), false);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  it("validates a direct Markdown target outside source scope without scanning its links", async () => {
    const root = createRoot("vibe-check-direct-markdown-link-scope-");
    try {
      mkdirSync(join(root, "docs"), { recursive: true });
      mkdirSync(join(root, "notes"), { recursive: true });
      writeFileSync(
        join(root, "docs", "source.md"),
        "[target](../notes/target.md#target)\n",
        "utf8"
      );
      writeFileSync(
        join(root, "notes", "target.md"),
        "# Target\n[not scanned](missing.md)\n",
        "utf8"
      );
      const sourceOnlyFiles = Object.freeze({
        ...MARKDOWN_FILES,
        include: Object.freeze(["docs/source.md"])
      });

      const result = await execute(
        executeMarkdownLinkValidation,
        MARKDOWN_LINK_OPTIONS,
        root,
        sourceOnlyFiles
      );
      assert.deepEqual(result.result, {
        status: "passed",
        data: { sourceFileCount: 1, occurrenceCount: 1, targetReadCount: 1, findingCount: 0 }
      });
      assert.deepEqual(result.records, []);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  it("returns unavailable without publishing an earlier Markdown Link finding", async () => {
    const root = createRoot("vibe-check-direct-markdown-link-limit-");
    try {
      mkdirSync(join(root, "docs"), { recursive: true });
      writeFileSync(join(root, "docs", "a.md"), "[missing](missing.md)\n", "utf8");
      writeFileSync(join(root, "docs", "b.md"), "[also missing](also-missing.md)\n", "utf8");

      const result = await execute(
        executeMarkdownLinkValidation,
        {
          ...MARKDOWN_LINK_OPTIONS,
          limits: { ...MARKDOWN_LINK_OPTIONS.limits, maxOccurrences: 1 }
        },
        root,
        MARKDOWN_FILES
      );
      assert.deepEqual(result.result, {
        status: "unavailable",
        reason: { code: "markdown-link-validation-unavailable" }
      });
      assert.deepEqual(result.records, []);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  it("returns unavailable without publishing an earlier finding when target work reaches its limit", async () => {
    const root = createRoot("vibe-check-direct-markdown-link-target-limit-");
    try {
      mkdirSync(join(root, "docs"), { recursive: true });
      writeFileSync(join(root, "docs", "a.md"), "[missing](missing.md)\n", "utf8");
      writeFileSync(join(root, "docs", "b.md"), "[also missing](also-missing.md)\n", "utf8");

      const result = await execute(
        executeMarkdownLinkValidation,
        {
          ...MARKDOWN_LINK_OPTIONS,
          limits: { ...MARKDOWN_LINK_OPTIONS.limits, maxTargetReads: 1 }
        },
        root,
        MARKDOWN_FILES
      );
      assert.deepEqual(result.result, {
        status: "unavailable",
        reason: { code: "markdown-link-validation-unavailable" }
      });
      assert.deepEqual(result.records, []);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  it("is not applicable when global scope has no eligible Markdown source", async () => {
    const root = createRoot("vibe-check-direct-markdown-link-empty-");
    try {
      const result = await execute(
        executeMarkdownLinkValidation,
        MARKDOWN_LINK_OPTIONS,
        root,
        MARKDOWN_FILES
      );
      assert.deepEqual(result.result, {
        status: "not-applicable",
        reason: { code: "no-eligible-input" }
      });
      assert.deepEqual(result.records, []);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  it("returns unavailable when project root cannot be canonicalized before source discovery", async () => {
    const root = join(tmpdir(), "vibe-check-direct-markdown-link-missing-root");
    rmSync(root, { recursive: true, force: true });

    const result = await execute(
      executeMarkdownLinkValidation,
      MARKDOWN_LINK_OPTIONS,
      root,
      MARKDOWN_FILES
    );
    assert.deepEqual(result.result, {
      status: "unavailable",
      reason: { code: "markdown-link-validation-unavailable" }
    });
    assert.deepEqual(result.records, []);
  });

  it("returns unavailable before source collection when its Run signal is already cancelled", async () => {
    const root = createRoot("vibe-check-direct-markdown-link-cancelled-");
    const controller = new AbortController();
    controller.abort();
    try {
      const result = await execute(
        executeMarkdownLinkValidation,
        MARKDOWN_LINK_OPTIONS,
        root,
        MARKDOWN_FILES,
        controller.signal
      );
      assert.deepEqual(result.result, {
        status: "unavailable",
        reason: { code: "markdown-link-validation-unavailable" }
      });
      assert.deepEqual(result.records, []);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

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
        scanner: { executable: process.execPath, args, availabilityArgs: [...args, "--version"] },
        codeLines: {
          absoluteFloor: 300,
          lowDecisionTokenAllowance: { codeLineFloor: 500, maxDecisionTokens: 10 }
        }
      };
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
        scanner: { executable: process.execPath, args, availabilityArgs: [...args, "--version"] },
        codeLines: {
          absoluteFloor: 10,
          lowComplexityAllowance: { codeLineFloor: 20, maxCyclomaticComplexityExclusive: 3 }
        },
        cyclomaticComplexity: { absoluteFloor: 5 },
        parameterCount: { absoluteFloor: 4 }
      };
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
        scanner: {
          executable: process.execPath,
          args,
          availabilityArgs: [...args, "--version"],
          maxConcurrency: 1
        },
        defaultMinimumTokens: 50,
        minimumTokensByCodeArea: {}
      };
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

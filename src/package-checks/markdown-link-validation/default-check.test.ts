import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, it } from "node:test";

import type { MarkdownLinkValidationOptions } from "./options.ts";
import { executeMarkdownLinkValidation } from "./execution.ts";
import { markdownLinkValidation } from "./default-check.ts";
import { validMarkdownLinkValidationOptions } from "./options-validation.ts";
import type { ProjectFileSelection } from "../project-files/configuration.ts";
import type {
  CheckDependencies,
  CheckExecution,
  CheckExecutionContext,
  CheckProjectContext,
  CheckResult
} from "../../check/check.ts";

const FILES = Object.freeze({
  exclude: Object.freeze([]),
  include: Object.freeze(["**/*.ts"]),
  source: "filesystem" as const
});

const MARKDOWN_FILES = Object.freeze({
  exclude: Object.freeze([]),
  include: Object.freeze(["**/*.md", "**/*.markdown"]),
  source: "filesystem" as const
});

const MARKDOWN_LINK_OPTIONS: MarkdownLinkValidationOptions = Object.freeze({
  files: MARKDOWN_FILES,
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

function project(root: string): CheckProjectContext {
  return Object.freeze({
    flags: Object.freeze([]),
    root
  });
}

async function execute(
  callback: CheckExecution<MarkdownLinkValidationOptions>,
  options: MarkdownLinkValidationOptions,
  root: string,
  files: ProjectFileSelection = FILES,
  signal: AbortSignal = new AbortController().signal
): Promise<
  Readonly<{
    readonly records: readonly ReportedRecord[];
    readonly result: CheckResult;
  }>
> {
  const records: ReportedRecord[] = [];
  const executionOptions: MarkdownLinkValidationOptions = Object.freeze({ ...options, files });
  const context: CheckExecutionContext<MarkdownLinkValidationOptions> = Object.freeze({
    dependencies: NO_DEPENDENCIES,
    options: executionOptions,
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

describe("default Check direct callbacks", () => {
  it("requires the complete closed Markdown Link options shape and bounded limits", async () => {
    assert.equal(
      (await markdownLinkValidation.preflight!(MARKDOWN_LINK_OPTIONS, new AbortController().signal))
        .status,
      "success"
    );
    for (const options of [
      { ...MARKDOWN_LINK_OPTIONS, limits: { maxMarkdownBytes: 1_048_576, maxOccurrences: 10_000 } },
      {
        ...MARKDOWN_LINK_OPTIONS,
        limits: { ...MARKDOWN_LINK_OPTIONS.limits, maxTargetReads: 10_001 }
      },
      {
        ...MARKDOWN_LINK_OPTIONS,
        files: { excludeDirs: [], generatedFiles: [], include: ["**/*"] }
      },
      { ...MARKDOWN_LINK_OPTIONS, unexpected: true }
    ]) {
      assert.equal(validMarkdownLinkValidationOptions(options), false);
    }
    const root = createRoot("vibe-check-invalid-markdown-link-");
    const invalidDirectOptions = {
      ...MARKDOWN_LINK_OPTIONS,
      limits: { ...MARKDOWN_LINK_OPTIONS.limits }
    };
    Reflect.deleteProperty(invalidDirectOptions.limits, "maxTargetReads");
    try {
      assert.deepEqual(
        (await execute(executeMarkdownLinkValidation, invalidDirectOptions, root, MARKDOWN_FILES))
          .result,
        { status: "unavailable", reason: { code: "invalid-options" } }
      );
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
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
        reason: { code: "occurrence-limit-exceeded" }
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
        reason: { code: "target-read-limit-exceeded" }
      });
      assert.deepEqual(result.records, []);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  it("is not applicable when its file selection has no eligible Markdown source", async () => {
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
      reason: { code: "project-root-unavailable" }
    });
    assert.deepEqual(result.records, []);

    const sourceRoot = createRoot("vibe-check-direct-markdown-link-source-limit-");
    try {
      mkdirSync(join(sourceRoot, "docs"), { recursive: true });
      writeFileSync(join(sourceRoot, "docs", "source.md"), "# Source\n", "utf8");

      const sourceResult = await execute(
        executeMarkdownLinkValidation,
        {
          ...MARKDOWN_LINK_OPTIONS,
          limits: { ...MARKDOWN_LINK_OPTIONS.limits, maxMarkdownBytes: 1 }
        },
        sourceRoot,
        MARKDOWN_FILES
      );
      assert.deepEqual(sourceResult.result, {
        status: "unavailable",
        reason: { code: "source-too-large" }
      });
      assert.deepEqual(sourceResult.records, []);
    } finally {
      rmSync(sourceRoot, { recursive: true, force: true });
    }
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
        reason: { code: "cancelled" }
      });
      assert.deepEqual(result.records, []);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });
});

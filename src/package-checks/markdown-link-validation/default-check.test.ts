import assert from "node:assert/strict";
import { existsSync, mkdirSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, it } from "node:test";

import {
  createDeclarativeFingerprint,
  defineConfig,
  normalizeProjectDefinition
} from "../../project-definition/project-definition.ts";
import { executeMarkdownLinkValidation } from "./execution.ts";
import { markdownLinkValidation } from "./default-check.ts";
import { parseMarkdownLinkValidationData } from "./final-data.ts";
import { validMarkdownLinkValidationOptions } from "./options-validation.ts";
import {
  createMarkdownTestRoot,
  execute,
  MARKDOWN_FILES,
  MARKDOWN_LINK_OPTIONS
} from "./default-check.test-support.ts";

describe("default Check direct callbacks", () => {
  it("materializes bounded Markdown Link defaults and rejects malformed resolved options", async () => {
    const defaultCheck = markdownLinkValidation();
    assert.equal(defaultCheck.options.findingPolicy, "non-blocking");
    assert.deepEqual(defaultCheck.options.files.include, [
      "**/*.[mM][dD]",
      "**/*.[mM][aA][rR][kK][dD][oO][wW][nN]"
    ]);
    assert.equal(defaultCheck.options.requireExistingTargets, true);
    assert.deepEqual(defaultCheck.options.cache, { enabled: false });
    assert.equal(Object.isFrozen(defaultCheck.options.cache), true);
    assert.deepEqual(
      markdownLinkValidation({
        files: { include: ["docs/**/*.md"] },
        limits: { maxTargetReads: 50 },
        rootExternalTargetMode: "ignore"
      }).options,
      {
        cache: { enabled: false },
        files: {
          exclude: defaultCheck.options.files.exclude,
          include: ["docs/**/*.md"],
          source: "filesystem"
        },
        findingPolicy: "non-blocking",
        limits: {
          maxMarkdownBytes: 1_048_576,
          maxOccurrences: 10_000,
          maxTargetReads: 50
        },
        requireExistingTargets: true,
        requireNonEmptyDirectories: false,
        rootExternalTargetMode: "ignore",
        validateCrossDocumentAnchors: true,
        validateSameDocumentAnchors: true
      }
    );
    const cacheDirectory = join(tmpdir(), "vibe-check-markdown-link-cache-options");
    const disabledFingerprint = declarativeFingerprint(markdownLinkValidation());
    const enabledFingerprint = declarativeFingerprint(
      markdownLinkValidation({ cache: { enabled: true, directory: cacheDirectory } })
    );
    assert.notEqual(disabledFingerprint, enabledFingerprint);
    assert.throws(
      () => Reflect.apply(markdownLinkValidation, undefined, [{ unknown: true }]),
      /documented closed policy/
    );
    assert.equal(defaultCheck.parseData, parseMarkdownLinkValidationData);
    assert.deepEqual(
      defaultCheck.parseData({
        sourceFileCount: 1,
        occurrenceCount: 2,
        targetReadCount: 1,
        findingCount: 1,
        rejectedInputCount: 0
      }),
      {
        sourceFileCount: 1,
        occurrenceCount: 2,
        targetReadCount: 1,
        findingCount: 1,
        rejectedInputCount: 0
      }
    );
    assert.throws(
      () =>
        defaultCheck.parseData({
          sourceFileCount: 1,
          occurrenceCount: 1,
          targetReadCount: 2,
          findingCount: 0,
          rejectedInputCount: 0
        }),
      /markdownLinkValidation final data/
    );
    assert.equal(
      (await defaultCheck.preflight!(MARKDOWN_LINK_OPTIONS, new AbortController().signal)).status,
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
      { ...MARKDOWN_LINK_OPTIONS, findingPolicy: "not-a-policy" },
      { ...MARKDOWN_LINK_OPTIONS, cache: { enabled: false, directory: cacheDirectory } },
      { ...MARKDOWN_LINK_OPTIONS, cache: { enabled: true } },
      { ...MARKDOWN_LINK_OPTIONS, cache: { enabled: true, directory: "relative-cache" } },
      { ...MARKDOWN_LINK_OPTIONS, cache: { enabled: true, directory: "\0cache" } },
      { ...MARKDOWN_LINK_OPTIONS, unexpected: true }
    ]) {
      assert.equal(validMarkdownLinkValidationOptions(options), false);
    }
    const root = createMarkdownTestRoot("vibe-check-invalid-markdown-link-");
    const invalidDirectOptions = {
      ...MARKDOWN_LINK_OPTIONS,
      limits: { ...MARKDOWN_LINK_OPTIONS.limits }
    };
    Reflect.deleteProperty(invalidDirectOptions.limits, "maxTargetReads");
    try {
      assert.deepEqual(
        (await execute(executeMarkdownLinkValidation, invalidDirectOptions, root, MARKDOWN_FILES))
          .result,
        {
          status: "unavailable",
          reason: { code: "invalid-options" },
          messages: [
            {
              code: "invalid-options",
              level: "error",
              message:
                "markdownLinkValidation options are invalid; recreate the Check with markdownLinkValidation(options) or restore its complete resolved options."
            }
          ]
        }
      );
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  it("reports safe Markdown Link findings only after a complete traversal", async () => {
    const root = createMarkdownTestRoot("vibe-check-direct-markdown-link-");
    try {
      mkdirSync(join(root, "docs"), { recursive: true });
      writeFileSync(
        join(root, "docs", "guide.md"),
        "[missing](missing.md)\n<https://example.test/private>\n",
        "utf8"
      );

      const defaultResult = await execute(
        executeMarkdownLinkValidation,
        markdownLinkValidation({ files: MARKDOWN_FILES }).options,
        root,
        MARKDOWN_FILES
      );
      assert.deepEqual(defaultResult.result, {
        status: "passed",
        data: {
          sourceFileCount: 1,
          occurrenceCount: 2,
          targetReadCount: 1,
          findingCount: 1,
          rejectedInputCount: 0
        },
        messages: [
          {
            code: "invalid-local-links",
            level: "warning",
            message:
              "1 local Markdown link finding(s) were recorded as non-blocking; inspect this Check's Records for source ranges, targets, and reasons."
          },
          {
            code: "finding-detail",
            level: "warning",
            message: "docs/guide.md:1:1 link: missing-target."
          }
        ]
      });
      assert.deepEqual(defaultResult.records, [
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
      const blockingResult = await execute(
        executeMarkdownLinkValidation,
        MARKDOWN_LINK_OPTIONS,
        root,
        MARKDOWN_FILES
      );
      assert.deepEqual(blockingResult.result, {
        status: "failed",
        data: {
          sourceFileCount: 1,
          occurrenceCount: 2,
          targetReadCount: 1,
          findingCount: 1,
          rejectedInputCount: 0
        },
        messages: [
          {
            code: "invalid-local-links",
            level: "error",
            message:
              "1 local Markdown link finding(s) require attention; inspect this Check's Records for source ranges, targets, and reasons."
          },
          {
            code: "finding-detail",
            level: "error",
            message: "docs/guide.md:1:1 link: missing-target."
          }
        ]
      });
      assert.deepEqual(blockingResult.records, defaultResult.records);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  it("uses an explicit parse-facts cache only as best-effort state", async () => {
    const root = createMarkdownTestRoot("vibe-check-direct-markdown-link-cache-");
    const cacheDirectory = join(root, "cache-state");
    try {
      mkdirSync(join(root, "docs"), { recursive: true });
      writeFileSync(join(root, "docs", "guide.md"), "[missing](missing.md)\n", "utf8");
      const disabled = await execute(
        executeMarkdownLinkValidation,
        { ...MARKDOWN_LINK_OPTIONS, cache: Object.freeze({ enabled: false }) },
        root,
        MARKDOWN_FILES
      );
      assert.equal(existsSync(cacheDirectory), false);

      const enabledOptions = {
        ...MARKDOWN_LINK_OPTIONS,
        cache: Object.freeze({ enabled: true as const, directory: cacheDirectory })
      };
      const first = await execute(
        executeMarkdownLinkValidation,
        enabledOptions,
        root,
        MARKDOWN_FILES
      );
      assert.deepEqual(first, disabled);
      const entries = readdirSync(cacheDirectory).filter((entry) => entry.endsWith(".json"));
      assert.equal(entries.length, 1);

      const hit = await execute(
        executeMarkdownLinkValidation,
        enabledOptions,
        root,
        MARKDOWN_FILES
      );
      assert.deepEqual(hit, disabled);

      const entry = entries[0];
      if (entry === undefined) assert.fail("expected a persisted Markdown Link cache entry");
      writeFileSync(join(cacheDirectory, entry), '{"hostile":true}', "utf8");
      const invalidPayload = await execute(
        executeMarkdownLinkValidation,
        enabledOptions,
        root,
        MARKDOWN_FILES
      );
      assert.deepEqual(invalidPayload, disabled);

      const unavailableCacheDirectory = join(root, "cache-state-file");
      writeFileSync(unavailableCacheDirectory, "not a directory", "utf8");
      const unavailableStorage = await execute(
        executeMarkdownLinkValidation,
        {
          ...MARKDOWN_LINK_OPTIONS,
          cache: Object.freeze({ enabled: true as const, directory: unavailableCacheDirectory })
        },
        root,
        MARKDOWN_FILES
      );
      assert.deepEqual(unavailableStorage, disabled);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  it("invalidates source and direct-target parse facts by exact content bytes", async () => {
    const root = createMarkdownTestRoot("vibe-check-direct-markdown-link-cache-identity-");
    const cacheDirectory = join(root, "cache-state");
    const enabledOptions = {
      ...MARKDOWN_LINK_OPTIONS,
      cache: Object.freeze({ enabled: true as const, directory: cacheDirectory })
    };
    try {
      mkdirSync(join(root, "docs"), { recursive: true });
      writeFileSync(join(root, "docs", "guide.md"), "[target](target.md#old)\n", "utf8");
      writeFileSync(join(root, "docs", "target.md"), "# Old\n", "utf8");

      const first = await execute(
        executeMarkdownLinkValidation,
        enabledOptions,
        root,
        MARKDOWN_FILES
      );
      assert.equal(first.result.status, "passed");

      writeFileSync(join(root, "docs", "target.md"), "# New\n", "utf8");
      const staleTarget = await execute(
        executeMarkdownLinkValidation,
        enabledOptions,
        root,
        MARKDOWN_FILES
      );
      assert.equal(staleTarget.result.status, "failed");

      writeFileSync(join(root, "docs", "guide.md"), "[target](target.md#new)\n", "utf8");
      const refreshedSource = await execute(
        executeMarkdownLinkValidation,
        enabledOptions,
        root,
        MARKDOWN_FILES
      );
      assert.equal(refreshedSource.result.status, "passed");
      assert.equal(
        readdirSync(cacheDirectory).filter((entry) => entry.endsWith(".json")).length,
        4
      );
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  it("reports a root-external target without persisting its path, fragment, or query", async () => {
    const root = createMarkdownTestRoot("vibe-check-direct-markdown-link-external-");
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
        data: {
          sourceFileCount: 1,
          occurrenceCount: 1,
          targetReadCount: 0,
          findingCount: 1,
          rejectedInputCount: 0
        },
        messages: [
          {
            code: "invalid-local-links",
            level: "error",
            message:
              "1 local Markdown link finding(s) require attention; inspect this Check's Records for source ranges, targets, and reasons."
          },
          {
            code: "finding-detail",
            level: "error",
            message: "docs/guide.md:1:1 link: target-outside-project-root."
          }
        ]
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
    const root = createMarkdownTestRoot("vibe-check-direct-markdown-link-scope-");
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
        data: {
          sourceFileCount: 1,
          occurrenceCount: 1,
          targetReadCount: 1,
          findingCount: 0,
          rejectedInputCount: 0
        }
      });
      assert.deepEqual(result.records, []);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  it("returns unavailable without publishing an earlier Markdown Link finding", async () => {
    const root = createMarkdownTestRoot("vibe-check-direct-markdown-link-limit-");
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
        reason: { code: "occurrence-limit-exceeded" },
        messages: [
          {
            code: "occurrence-limit-exceeded",
            level: "error",
            message:
              "Markdown link validation exceeded maxOccurrences; narrow the source selection or raise the bounded limit."
          }
        ]
      });
      assert.deepEqual(result.records, []);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  it("returns unavailable without publishing an earlier finding when target work reaches its limit", async () => {
    const root = createMarkdownTestRoot("vibe-check-direct-markdown-link-target-limit-");
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
        reason: { code: "target-read-limit-exceeded" },
        messages: [
          {
            code: "target-read-limit-exceeded",
            level: "error",
            message:
              "Markdown link validation exceeded maxTargetReads; narrow the source selection or raise the bounded limit."
          }
        ]
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
      reason: { code: "project-root-unavailable" },
      messages: [
        {
          code: "project-root-unavailable",
          level: "error",
          message:
            "Markdown link validation could not resolve the project root; check that the path exists and is accessible."
        }
      ]
    });
    assert.deepEqual(result.records, []);

    const sourceRoot = createMarkdownTestRoot("vibe-check-direct-markdown-link-source-limit-");
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
        reason: { code: "source-too-large" },
        messages: [
          {
            code: "source-too-large",
            level: "error",
            message:
              "A selected Markdown source exceeds maxMarkdownBytes; narrow the file selection or raise the bounded limit."
          }
        ]
      });
      assert.deepEqual(sourceResult.records, []);
    } finally {
      rmSync(sourceRoot, { recursive: true, force: true });
    }
  });

  it("returns unavailable before source collection when its Run signal is already cancelled", async () => {
    const root = createMarkdownTestRoot("vibe-check-direct-markdown-link-cancelled-");
    const cacheDirectory = join(root, "cache-state");
    const controller = new AbortController();
    controller.abort();
    try {
      const result = await execute(
        executeMarkdownLinkValidation,
        {
          ...MARKDOWN_LINK_OPTIONS,
          cache: Object.freeze({ enabled: true as const, directory: cacheDirectory })
        },
        root,
        MARKDOWN_FILES,
        controller.signal
      );
      assert.deepEqual(result.result, {
        status: "unavailable",
        reason: { code: "cancelled" },
        messages: [
          {
            code: "cancelled",
            level: "error",
            message:
              "Markdown link validation was cancelled before it could form a complete result; inspect the caller's cancellation reason and retry if appropriate."
          }
        ]
      });
      assert.deepEqual(result.records, []);
      assert.equal(existsSync(cacheDirectory), false);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  it("cancels after parse-facts publication without reporting stale findings", async () => {
    const root = createMarkdownTestRoot("vibe-check-direct-markdown-link-cache-cancelled-");
    const cacheDirectory = join(root, "cache-state");
    const controller = new AbortController();
    try {
      mkdirSync(join(root, "docs"), { recursive: true });
      writeFileSync(join(root, "docs", "guide.md"), "[missing](missing.md)\n", "utf8");

      const result = await execute(
        executeMarkdownLinkValidation,
        {
          ...MARKDOWN_LINK_OPTIONS,
          cache: Object.freeze({ enabled: true as const, directory: cacheDirectory })
        },
        root,
        MARKDOWN_FILES,
        abortWhenCacheDirectoryIsPublished(controller, cacheDirectory)
      );

      assert.equal(controller.signal.aborted, true);
      assert.equal(existsSync(cacheDirectory), true);
      assert.equal(
        readdirSync(cacheDirectory).filter((entry) => entry.endsWith(".json")).length,
        1
      );
      assert.deepEqual(result.result, {
        status: "unavailable",
        reason: { code: "cancelled" },
        messages: [
          {
            code: "cancelled",
            level: "error",
            message:
              "Markdown link validation was cancelled before it could form a complete result; inspect the caller's cancellation reason and retry if appropriate."
          }
        ]
      });
      assert.deepEqual(result.records, []);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });
});

function declarativeFingerprint(check: ReturnType<typeof markdownLinkValidation>): string {
  return createDeclarativeFingerprint(
    normalizeProjectDefinition(defineConfig({ checks: [check] })).declarative
  );
}

/** Converts the exact cache-publication race into a deterministic real AbortSignal test. */
function abortWhenCacheDirectoryIsPublished(
  controller: AbortController,
  cacheDirectory: string
): AbortSignal {
  return new Proxy(controller.signal, {
    get(target, property): unknown {
      if (property === "aborted" && existsSync(cacheDirectory)) controller.abort();
      return Reflect.get(target, property, target) as unknown;
    }
  });
}

import assert from "node:assert/strict";
import { existsSync, mkdirSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, it } from "node:test";

import { executeMarkdownLinkValidation } from "./execution.ts";
import {
  createMarkdownTestRoot,
  execute,
  MARKDOWN_FILES,
  MARKDOWN_LINK_OPTIONS
} from "./default-check.test-support.ts";

describe("default Check direct callbacks", () => {
  it("returns unavailable without publishing an earlier Markdown Link finding", async () => {
    const root = createMarkdownTestRoot("vibe-check-direct-markdown-link-limit-");
    const cacheDirectory = join(root, "cache-state");
    try {
      mkdirSync(join(root, "docs"), { recursive: true });
      writeFileSync(join(root, "docs", "a.md"), "[missing](missing.md)\n", "utf8");
      writeFileSync(join(root, "docs", "b.md"), "[also missing](also-missing.md)\n", "utf8");

      const result = await execute(
        executeMarkdownLinkValidation,
        {
          ...MARKDOWN_LINK_OPTIONS,
          cache: Object.freeze({ enabled: true as const, directory: cacheDirectory }),
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
      assert.deepEqual(readdirSync(cacheDirectory), ["markdown-link-parse-facts-v1.jsonl"]);
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

  it("does not start parse-facts publication after cancellation without reporting stale findings", async () => {
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
        readdirSync(cacheDirectory).filter(
          (entry) => entry === "markdown-link-parse-facts-v1.jsonl"
        ).length,
        0
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

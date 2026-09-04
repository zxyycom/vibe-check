import assert from "node:assert/strict";
import { existsSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
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
      const entries = readdirSync(cacheDirectory);
      assert.deepEqual(entries, ["markdown-link-parse-facts-v1.jsonl"]);

      const hit = await execute(
        executeMarkdownLinkValidation,
        enabledOptions,
        root,
        MARKDOWN_FILES
      );
      assert.deepEqual(hit, disabled);

      const entry = entries[0];
      if (entry === undefined) assert.fail("expected a persisted Markdown Link cache file");
      writeFileSync(join(cacheDirectory, entry), '{"hostile":true}\n', "utf8");
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
        readJsonlLines(join(cacheDirectory, "markdown-link-parse-facts-v1.jsonl")).length,
        4
      );
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });
});

function readJsonlLines(filePath: string): string[] {
  return readFileSync(filePath, "utf8")
    .split("\n")
    .filter((line) => line !== "");
}

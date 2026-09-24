import assert from "node:assert/strict";
import { mkdirSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { describe, it } from "node:test";

import { executeMarkdownLint } from "./execution.ts";
import { lintMarkdownWithCache } from "./findings-cache.ts";
import {
  createMarkdownLintTestRoot,
  executeMarkdownLintCheck,
  MARKDOWN_LINT_OPTIONS
} from "./markdown-lint.test-support.ts";

const SOURCE_PATH = "docs/source.md";
const SOURCE_TEXT = "#missing\n";

describe("Markdown lint findings cache", () => {
  it("preserves complete Check results on cold and warm traversal", async () => {
    const fixture = createCacheFixture();
    try {
      const options = { ...MARKDOWN_LINT_OPTIONS, cache: fixture.cache };
      const fresh = await executeMarkdownLintCheck(
        executeMarkdownLint,
        MARKDOWN_LINT_OPTIONS,
        fixture.root
      );
      const cold = await executeMarkdownLintCheck(executeMarkdownLint, options, fixture.root);
      const warm = await executeMarkdownLintCheck(executeMarkdownLint, options, fixture.root);
      assert.deepEqual(cold, fresh);
      assert.deepEqual(warm, fresh);

      writeFileSync(join(fixture.root, SOURCE_PATH), "# heading\n", "utf8");
      const changed = await executeMarkdownLintCheck(executeMarkdownLint, options, fixture.root);
      const changedFresh = await executeMarkdownLintCheck(
        executeMarkdownLint,
        MARKDOWN_LINT_OPTIONS,
        fixture.root
      );
      assert.deepEqual(changed, changedFresh);
    } finally {
      rmSync(fixture.root, { recursive: true, force: true });
    }
  });

  it("keys per-file findings by source content and selected rules", async () => {
    const fixture = createCacheFixture();
    const signal = new AbortController().signal;
    const rules = MARKDOWN_LINT_OPTIONS.rules;
    try {
      const input = {
        sourcePath: SOURCE_PATH,
        sourceText: SOURCE_TEXT,
        rules,
        cache: fixture.cache,
        signal
      };
      const cold = await lintMarkdownWithCache(input);
      const warm = await lintMarkdownWithCache(input);
      const changed = await lintMarkdownWithCache({ ...input, sourceText: "# heading\n" });
      const changedRules = await lintMarkdownWithCache({
        ...input,
        rules: ["fenced-code-language"]
      });
      assert.equal(typeof cold === "string" ? cold : cold.source, "computed");
      assert.equal(typeof warm === "string" ? warm : warm.source, "cache");
      assert.equal(typeof changed === "string" ? changed : changed.source, "computed");
      assert.equal(
        typeof changedRules === "string" ? changedRules : changedRules.source,
        "computed"
      );
    } finally {
      rmSync(fixture.root, { recursive: true, force: true });
    }
  });

  it("recomputes invalid or unwritable cache entries and respects cancellation", async () => {
    const fixture = createCacheFixture();
    const signal = new AbortController().signal;
    const rules = MARKDOWN_LINT_OPTIONS.rules;
    try {
      const input = {
        sourcePath: SOURCE_PATH,
        sourceText: SOURCE_TEXT,
        rules,
        cache: fixture.cache,
        signal
      };
      await lintMarkdownWithCache(input);
      for (const entry of readdirSync(fixture.cacheDirectory))
        writeFileSync(join(fixture.cacheDirectory, entry), '{"invalid":true}', "utf8");
      const recovered = await lintMarkdownWithCache(input);
      assert.equal(typeof recovered === "string" ? recovered : recovered.source, "computed");

      const blockedDirectory = join(fixture.root, "blocked-cache");
      writeFileSync(blockedDirectory, "not a directory", "utf8");
      const unavailableCache = await lintMarkdownWithCache({
        ...input,
        cache: { enabled: true, directory: blockedDirectory }
      });
      assert.equal(
        typeof unavailableCache === "string" ? unavailableCache : unavailableCache.source,
        "computed"
      );
      const cancelled = new AbortController();
      cancelled.abort();
      assert.equal(
        await lintMarkdownWithCache({ ...input, signal: cancelled.signal }),
        "cancelled"
      );
    } finally {
      rmSync(fixture.root, { recursive: true, force: true });
    }
  });
});

function createCacheFixture(): Readonly<{
  readonly root: string;
  readonly cacheDirectory: string;
  readonly cache: Readonly<{ readonly enabled: true; readonly directory: string }>;
}> {
  const root = createMarkdownLintTestRoot("vibe-check-markdown-lint-cache-");
  const cacheDirectory = join(root, "cache-state");
  mkdirSync(join(root, "docs"), { recursive: true });
  writeFileSync(join(root, SOURCE_PATH), SOURCE_TEXT, "utf8");
  return Object.freeze({
    root,
    cacheDirectory,
    cache: Object.freeze({ enabled: true, directory: cacheDirectory })
  });
}

import assert from "node:assert/strict";
import { mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { describe, it } from "node:test";

import { executeMarkdownLint } from "./execution.ts";
import { markdownLint } from "./default-check.ts";
import { lintMarkdownWithCache } from "./findings-cache.ts";
import {
  createMarkdownLintTestRoot,
  executeMarkdownLintCheck,
  MARKDOWN_LINT_OPTIONS
} from "./markdown-lint.test-support.ts";
import type { MarkdownLintFindingIdentity } from "./options.ts";

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

  it("reconciles current waiver changes and raw finding limits after cache hits", async () => {
    const fixture = createCacheFixture();
    const identity: MarkdownLintFindingIdentity = {
      path: SOURCE_PATH,
      rule: "no-missing-space-atx",
      range: { start: { line: 1, column: 1 }, end: { line: 1, column: 3 } }
    };
    const findingWaivers = [{ identity, reason: "Reviewed cached heading." }];
    const options = markdownLint({
      files: MARKDOWN_LINT_OPTIONS.files,
      findingPolicy: "blocking",
      cache: fixture.cache,
      findingWaivers
    }).options;
    try {
      const original = await executeMarkdownLintCheck(
        executeMarkdownLint,
        MARKDOWN_LINT_OPTIONS,
        fixture.root
      );
      assert.equal(original.result.status, "failed");
      const fresh = await executeMarkdownLintCheck(
        executeMarkdownLint,
        { ...options, cache: { enabled: false } },
        fixture.root
      );
      const cold = await executeMarkdownLintCheck(executeMarkdownLint, options, fixture.root);
      assert.deepEqual(cold, fresh);
      assert.equal(cold.result.status, "passed");
      assert.deepEqual(cold.result.data, original.result.data);
      const cacheContents = () =>
        readdirSync(fixture.cacheDirectory)
          .sort()
          .map((name) => ({
            name,
            bytes: readFileSync(join(fixture.cacheDirectory, name), "utf8")
          }));
      const before = cacheContents();
      const hit = await lintMarkdownWithCache({
        sourcePath: SOURCE_PATH,
        sourceText: SOURCE_TEXT,
        rules: options.rules,
        cache: fixture.cache,
        signal: new AbortController().signal
      });
      assert.equal(typeof hit === "string" ? hit : hit.source, "cache");
      const changed = await executeMarkdownLintCheck(
        executeMarkdownLint,
        {
          ...options,
          findingWaivers: [{ identity, reason: "Updated acceptance reason." }]
        },
        fixture.root
      );
      assert.equal(changed.result.status, "passed");
      assert.deepEqual(changed.records[0], {
        identity: original.records[0]?.identity,
        data: { ...original.records[0]?.data, waiver: { reason: "Updated acceptance reason." } }
      });
      assert.match(changed.result.messages?.[0]?.message ?? "", /Updated acceptance reason/u);
      assert.equal(
        changed.result.messages?.some(({ level }) => level === "error"),
        false
      );
      const staleIdentity = { ...identity, path: "docs/renamed.md" };
      const stale = await executeMarkdownLintCheck(
        executeMarkdownLint,
        {
          ...options,
          findingWaivers: [{ identity: staleIdentity, reason: "Stale path." }]
        },
        fixture.root
      );
      assert.equal(stale.result.status, "failed");
      assert.deepEqual(stale.records[0], original.records[0]);
      assert.deepEqual(stale.records[1]?.data, {
        kind: "finding-waiver-audit",
        identity: staleIdentity,
        reason: "Stale path.",
        matchCount: 0,
        status: "unused"
      });
      const removed = await executeMarkdownLintCheck(
        executeMarkdownLint,
        { ...options, findingWaivers: [] },
        fixture.root
      );
      assert.deepEqual(removed, original);
      assert.deepEqual(cacheContents(), before);

      const secondPath = "docs/second.md";
      writeFileSync(join(fixture.root, secondPath), SOURCE_TEXT, "utf8");
      const allWaived = {
        ...options,
        findingWaivers: [
          ...findingWaivers,
          { identity: { ...identity, path: secondPath }, reason: "Reviewed second heading." }
        ]
      };
      const complete = await executeMarkdownLintCheck(executeMarkdownLint, allWaived, fixture.root);
      assert.equal(complete.result.status, "passed");
      assert.deepEqual(complete.result.data, {
        sourceFileCount: 2,
        findingCount: 2,
        rejectedInputCount: 0
      });
      const limited = await executeMarkdownLintCheck(
        executeMarkdownLint,
        {
          ...allWaived,
          limits: { maxMarkdownBytes: 1024, maxFindings: 1 }
        },
        fixture.root
      );
      assert.equal(limited.result.status, "unavailable");
      assert.deepEqual(limited.result.reason, { code: "finding-limit-exceeded" });
      assert.deepEqual(limited.records, []);
      assert.equal(
        limited.result.messages?.some(({ code }) => code.includes("waiv")),
        false
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

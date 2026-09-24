import assert from "node:assert/strict";
import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { describe, it } from "node:test";

import { markdownLint } from "./default-check.ts";
import { executeMarkdownLint } from "./execution.ts";
import { parseMarkdownLintData } from "./final-data.ts";
import {
  createMarkdownLintTestRoot,
  executeMarkdownLintCheck,
  MARKDOWN_LINT_OPTIONS
} from "./markdown-lint.test-support.ts";

describe("Markdown lint Check", () => {
  it("materializes the closed recommended policy and rejects malformed authoring", () => {
    const check = markdownLint();
    assert.equal(check.checkId, "markdown-lint");
    assert.deepEqual(check.options.rules, [
      "heading-increment",
      "no-reversed-links",
      "no-missing-space-atx",
      "fenced-code-language",
      "no-empty-links",
      "no-alt-text",
      "reference-links-images",
      "table-column-count"
    ]);
    assert.equal(check.options.findingPolicy, "non-blocking");
    assert.deepEqual(check.options.cache, { enabled: false });
    assert.equal(check.parseData, parseMarkdownLintData);
    assert.throws(() => markdownLint({ rules: [] }), /documented closed policy/);
    assert.throws(
      () => markdownLint({ rules: ["no-alt-text", "no-alt-text"] }),
      /documented closed policy/
    );
    assert.throws(
      () => Reflect.apply(markdownLint, undefined, [{ unknown: true }]),
      /documented closed policy/
    );
    assert.throws(
      () => markdownLint({ cache: { enabled: true, directory: "relative-cache" } }),
      /documented closed policy/
    );
  });

  it("publishes Product-owned findings only after a complete bounded traversal", async () => {
    const root = createMarkdownLintTestRoot("vibe-check-markdown-lint-");
    try {
      mkdirSync(join(root, "docs"), { recursive: true });
      writeFileSync(
        join(root, "docs", "broken.md"),
        "#Heading\n\n```\nbody\n```\n\n![](/image.png)\n",
        "utf8"
      );
      const result = await executeMarkdownLintCheck(
        executeMarkdownLint,
        MARKDOWN_LINT_OPTIONS,
        root
      );
      assert.equal(result.result.status, "failed");
      assert.deepEqual(result.result.data, {
        sourceFileCount: 1,
        findingCount: 3,
        rejectedInputCount: 0
      });
      assert.deepEqual(
        result.records.map(({ data }) => JSON.stringify(data)),
        [
          JSON.stringify({
            kind: "lint-finding",
            path: "docs/broken.md",
            rule: "no-missing-space-atx",
            range: { start: { line: 1, column: 1 }, end: { line: 1, column: 3 } }
          }),
          JSON.stringify({
            kind: "lint-finding",
            path: "docs/broken.md",
            rule: "fenced-code-language",
            range: { start: { line: 3, column: 1 }, end: { line: 3, column: 1 } }
          }),
          JSON.stringify({
            kind: "lint-finding",
            path: "docs/broken.md",
            rule: "no-alt-text",
            range: { start: { line: 7, column: 1 }, end: { line: 7, column: 16 } }
          })
        ]
      );
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  it("settles zero input, rejected input, limits, and cancellation without partial lint publication", async () => {
    const root = createMarkdownLintTestRoot("vibe-check-markdown-lint-boundaries-");
    try {
      mkdirSync(join(root, "docs"), { recursive: true });
      writeFileSync(join(root, "docs", "first.md"), "#missing\n", "utf8");
      writeFileSync(join(root, "docs", "second.md"), "#missing\n", "utf8");
      writeFileSync(join(root, "docs", "note.txt"), "ordinary text\n", "utf8");
      const noInput = await executeMarkdownLintCheck(
        executeMarkdownLint,
        Object.freeze({
          ...MARKDOWN_LINT_OPTIONS,
          files: Object.freeze({
            ...MARKDOWN_LINT_OPTIONS.files,
            include: Object.freeze(["none/**/*.md"])
          })
        }),
        root
      );
      assert.deepEqual(noInput.result, {
        status: "not-applicable",
        reason: { code: "no-eligible-input" }
      });
      const rejected = await executeMarkdownLintCheck(
        executeMarkdownLint,
        Object.freeze({
          ...MARKDOWN_LINT_OPTIONS,
          files: Object.freeze({
            ...MARKDOWN_LINT_OPTIONS.files,
            include: Object.freeze(["docs/note.txt"])
          })
        }),
        root
      );
      assert.equal(rejected.result.status, "passed");
      if (rejected.result.status === "passed") {
        assert.deepEqual(rejected.result.data, {
          sourceFileCount: 0,
          findingCount: 1,
          rejectedInputCount: 1
        });
      }
      const limited = await executeMarkdownLintCheck(
        executeMarkdownLint,
        Object.freeze({
          ...MARKDOWN_LINT_OPTIONS,
          limits: Object.freeze({ maxMarkdownBytes: 1_048_576, maxFindings: 1 })
        }),
        root
      );
      assert.equal(limited.result.status, "unavailable");
      assert.deepEqual(limited.records, []);
      const controller = new AbortController();
      controller.abort();
      const cancelled = await executeMarkdownLintCheck(
        executeMarkdownLint,
        MARKDOWN_LINT_OPTIONS,
        root,
        controller.signal
      );
      assert.equal(cancelled.result.status, "unavailable");
      assert.deepEqual(cancelled.records, []);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  it("reports MD052 reference forms through the public single-rule Check", async () => {
    const root = createMarkdownLintTestRoot("vibe-check-markdown-lint-references-");
    try {
      mkdirSync(join(root, "docs"), { recursive: true });
      writeFileSync(
        join(root, "docs", "references.md"),
        "### Warmup heading\n[full][missing-full]\n[collapsed][]\n![image][missing-image]\n[x][x]\n[shortcut]\n",
        "utf8"
      );
      const options = markdownLint({
        files: { include: ["docs/references.md"] },
        rules: ["reference-links-images"]
      }).options;
      const result = await executeMarkdownLintCheck(executeMarkdownLint, options, root);
      assert.equal(result.result.status, "passed");
      assert.equal(result.records.length, 3);
      assert.equal(
        result.records.every(({ data }) => JSON.stringify(data).includes("reference-links-images")),
        true
      );
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });
});

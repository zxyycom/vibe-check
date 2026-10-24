import assert from "node:assert/strict";
import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { describe, it } from "node:test";

import { markdownLint } from "./constructor.ts";
import { executeMarkdownLint } from "./execution.ts";
import { parseMarkdownLintData } from "./final-data.ts";
import { orderedMarkdownLintCandidates } from "./records.ts";
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
    assert.deepEqual(check.options.findingWaivers, []);
    assert.equal(Object.isFrozen(check.options.findingWaivers), true);
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
    assertStableFindingLocations();
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
      assert.deepEqual(
        result.records.map(({ identity }) => identity.id),
        [
          "path:docs%2Fbroken.md:rule:no-missing-space-atx:line:1:column:1:ordinal:1",
          "path:docs%2Fbroken.md:rule:fenced-code-language:line:3:column:1:ordinal:1",
          "path:docs%2Fbroken.md:rule:no-alt-text:line:7:column:1:ordinal:1"
        ]
      );
      assert.deepEqual(result.result.messages, [
        {
          code: "finding-detail",
          level: "error",
          message:
            "docs/broken.md:1:1 no-missing-space-atx: ATX heading markers require a following space."
        },
        {
          code: "finding-detail",
          level: "error",
          message: "docs/broken.md:3:1 fenced-code-language: fenced code blocks require a language."
        },
        {
          code: "finding-detail",
          level: "error",
          message: "docs/broken.md:7:1 no-alt-text: images require alternative text."
        }
      ]);
      for (const findingWaivers of [undefined, []]) {
        const check = markdownLint({
          files: MARKDOWN_LINT_OPTIONS.files,
          findingPolicy: "blocking",
          ...(findingWaivers === undefined ? {} : { findingWaivers })
        });
        assert.deepEqual(
          await executeMarkdownLintCheck(executeMarkdownLint, check.options, root),
          result
        );
      }
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  it("settles zero input, rejected input, limits, and cancellation without partial lint publication", async () => {
    const root = createMarkdownLintTestRoot("vibe-check-markdown-lint-boundaries-");
    try {
      mkdirSync(join(root, "docs"), { recursive: true });
      const emptyRoot = join(root, "empty-root");
      mkdirSync(emptyRoot);
      writeFileSync(join(root, "docs", "first.md"), "#missing\n", "utf8");
      writeFileSync(join(root, "docs", "second.md"), "#missing\n", "utf8");
      writeFileSync(join(root, "docs", "note.txt"), "ordinary text\n", "utf8");
      for (const input of [
        {
          root: emptyRoot,
          pattern: "docs/**/*.md",
          status: "not-applicable",
          reason: "no-eligible-input"
        },
        {
          root,
          pattern: "none/**/*.md",
          status: "not-applicable",
          reason: "no-eligible-input"
        },
        {
          root: join(root, "missing-root"),
          pattern: "docs/**/*.md",
          status: "unavailable",
          reason: "source-unavailable"
        }
      ]) {
        const observed = await executeMarkdownLintCheck(
          executeMarkdownLint,
          Object.freeze({
            ...MARKDOWN_LINT_OPTIONS,
            files: Object.freeze({
              ...MARKDOWN_LINT_OPTIONS.files,
              patterns: Object.freeze([input.pattern])
            })
          }),
          input.root
        );
        assert.equal(observed.result.status, input.status);
        assert.ok(
          observed.result.status === "not-applicable" || observed.result.status === "unavailable"
        );
        assert.deepEqual(observed.result.reason, { code: input.reason });
        assert.equal(Object.hasOwn(observed.result, "data"), false);
        assert.deepEqual(observed.records, []);
      }
      const rejected = await executeMarkdownLintCheck(
        executeMarkdownLint,
        Object.freeze({
          ...MARKDOWN_LINT_OPTIONS,
          files: Object.freeze({
            ...MARKDOWN_LINT_OPTIONS.files,
            patterns: Object.freeze(["docs/note.txt"])
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
        "# Title\n### Warmup heading\n[full][missing-full]\n[collapsed][]\n![image][missing-image]\n[x][x]\n[shortcut]\n",
        "utf8"
      );
      const options = markdownLint({
        files: { patterns: ["docs/references.md"] },
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

function assertStableFindingLocations(): void {
  const candidates = orderedMarkdownLintCandidates(
    [
      { path: "docs/z.md", finding: { lineNumber: 1, range: null, rule: "no-alt-text" } },
      { path: "docs/a.md", finding: { lineNumber: 2, range: [3, 2], rule: "no-alt-text" } },
      {
        path: "docs/a.md",
        finding: { lineNumber: 1, range: [2, 1], rule: "no-missing-space-atx" }
      },
      {
        path: "docs/a.md",
        finding: { lineNumber: 1, range: [1, 9], rule: "no-missing-space-atx" }
      },
      { path: "docs/a.md", finding: { lineNumber: 1, range: [1, 2], rule: "no-alt-text" } },
      { path: "docs/a.md", finding: { lineNumber: 1, range: null, rule: "heading-increment" } },
      {
        path: "docs/a.md",
        finding: { lineNumber: 1, range: [1, 2], rule: "no-missing-space-atx" }
      }
    ],
    ["no-alt-text", "no-missing-space-atx"]
  );
  assert.deepEqual(
    candidates.map(({ data: { path, rule, range } }) => ({ path, rule, range })),
    [
      {
        path: "docs/a.md",
        rule: "no-alt-text",
        range: { start: { line: 1, column: 1 }, end: { line: 1, column: 3 } }
      },
      {
        path: "docs/a.md",
        rule: "heading-increment",
        range: { start: { line: 1, column: 1 }, end: { line: 1, column: 1 } }
      },
      {
        path: "docs/a.md",
        rule: "no-missing-space-atx",
        range: { start: { line: 1, column: 1 }, end: { line: 1, column: 10 } }
      },
      {
        path: "docs/a.md",
        rule: "no-missing-space-atx",
        range: { start: { line: 1, column: 1 }, end: { line: 1, column: 3 } }
      },
      {
        path: "docs/a.md",
        rule: "no-missing-space-atx",
        range: { start: { line: 1, column: 2 }, end: { line: 1, column: 3 } }
      },
      {
        path: "docs/a.md",
        rule: "no-alt-text",
        range: { start: { line: 2, column: 3 }, end: { line: 2, column: 5 } }
      },
      {
        path: "docs/z.md",
        rule: "no-alt-text",
        range: { start: { line: 1, column: 1 }, end: { line: 1, column: 1 } }
      }
    ]
  );
  assert.equal(
    candidates[2]?.id,
    "path:docs%2Fa.md:rule:no-missing-space-atx:line:1:column:1:ordinal:1"
  );
  assert.equal(
    candidates[3]?.id,
    "path:docs%2Fa.md:rule:no-missing-space-atx:line:1:column:1:ordinal:2"
  );
}

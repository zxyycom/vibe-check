import assert from "node:assert/strict";
import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { describe, it } from "node:test";

import { markdownLinkValidation } from "./default-check.ts";
import { executeMarkdownLinkValidation } from "./execution.ts";
import {
  createMarkdownTestRoot,
  execute,
  MARKDOWN_FILES,
  MARKDOWN_LINK_OPTIONS
} from "./default-check.test-support.ts";

describe("default Check direct callbacks", () => {
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
});

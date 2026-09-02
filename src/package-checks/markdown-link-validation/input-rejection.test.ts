import assert from "node:assert/strict";
import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { describe, it } from "node:test";

import { executeMarkdownLinkValidation } from "./execution.ts";
import {
  createMarkdownTestRoot,
  execute,
  MARKDOWN_FILES,
  MARKDOWN_LINK_OPTIONS
} from "./default-check.test-support.ts";

describe("Markdown Link input rejection", () => {
  it("is not applicable only when its file selection selects no path", async () => {
    const root = createMarkdownTestRoot("vibe-check-direct-markdown-link-empty-");
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

  it("reports every selected non-Markdown path without making blocking policy fail", async () => {
    const root = createMarkdownTestRoot("vibe-check-direct-markdown-link-rejected-");
    try {
      const broadFiles = Object.freeze({
        exclude: Object.freeze([]),
        include: Object.freeze(["**/*"]),
        source: "filesystem" as const
      });
      const result = await execute(
        executeMarkdownLinkValidation,
        { ...MARKDOWN_LINK_OPTIONS, files: broadFiles },
        root,
        broadFiles
      );

      assert.deepEqual(result.result, {
        status: "passed",
        data: {
          sourceFileCount: 0,
          occurrenceCount: 0,
          targetReadCount: 0,
          findingCount: 2,
          rejectedInputCount: 2
        },
        messages: [
          {
            code: "input-rejected",
            level: "warning",
            message:
              "2 selected markdownLinkValidation input file(s) were rejected because only .md/.markdown paths are supported; inspect this Check's Records and narrow files.include/exclude."
          },
          {
            code: "finding-detail",
            level: "warning",
            message: "src/a.ts: selected input is not a supported Markdown source."
          },
          {
            code: "finding-detail",
            level: "warning",
            message: "src/b.ts: selected input is not a supported Markdown source."
          }
        ]
      });
      assert.deepEqual(result.records, [
        {
          identity: { id: "/input-rejected/src/a.ts" },
          data: {
            blocking: false,
            kind: "input-rejected",
            path: "src/a.ts",
            reason: "unsupported-file-type"
          }
        },
        {
          identity: { id: "/input-rejected/src/b.ts" },
          data: {
            blocking: false,
            kind: "input-rejected",
            path: "src/b.ts",
            reason: "unsupported-file-type"
          }
        }
      ]);

      mkdirSync(join(root, "docs"), { recursive: true });
      writeFileSync(join(root, "docs", "too-large.md"), "# Too large\n", "utf8");
      const unavailableResult = await execute(
        executeMarkdownLinkValidation,
        {
          ...MARKDOWN_LINK_OPTIONS,
          files: broadFiles,
          limits: { ...MARKDOWN_LINK_OPTIONS.limits, maxMarkdownBytes: 1 }
        },
        root,
        broadFiles
      );
      assert.deepEqual(unavailableResult.records, result.records);
      assert.deepEqual(unavailableResult.result, {
        status: "unavailable",
        reason: { code: "source-too-large" },
        messages: [
          {
            code: "source-too-large",
            level: "error",
            message:
              "A selected Markdown source exceeds maxMarkdownBytes; narrow the file selection or raise the bounded limit."
          },
          {
            code: "input-rejected",
            level: "warning",
            message:
              "2 selected markdownLinkValidation input file(s) were rejected because only .md/.markdown paths are supported; inspect this Check's Records and narrow files.include/exclude."
          }
        ]
      });
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });
});

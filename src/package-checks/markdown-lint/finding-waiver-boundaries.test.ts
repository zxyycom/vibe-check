import assert from "node:assert/strict";
import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { describe, it } from "node:test";

import { markdownLint } from "./default-check.ts";
import { executeMarkdownLint } from "./execution.ts";
import {
  createMarkdownLintTestRoot,
  executeMarkdownLintCheck,
  MARKDOWN_LINT_HEADING_WAIVER as WAIVER,
  MARKDOWN_LINT_OPTIONS
} from "./markdown-lint.test-support.ts";

const IDENTITY = WAIVER.identity;

describe("Markdown lint finding waivers", () => {
  it("audits only complete candidate sets and never waives rejected or unavailable inputs", async () => {
    const root = createMarkdownLintTestRoot("vibe-check-markdown-lint-waiver-boundaries-");
    try {
      mkdirSync(join(root, "docs"), { recursive: true });
      const options = markdownLint({
        files: { ...MARKDOWN_LINT_OPTIONS.files, include: ["docs/*"] },
        findingPolicy: "blocking",
        findingWaivers: [WAIVER]
      }).options;
      const run = (overrides: Partial<typeof options> = {}, signal?: AbortSignal) =>
        executeMarkdownLintCheck(executeMarkdownLint, { ...options, ...overrides }, root, signal);
      const empty = await run();
      assert.deepEqual(empty.result, {
        status: "not-applicable",
        reason: { code: "no-eligible-input" }
      });
      assert.deepEqual(empty.records, []);
      writeFileSync(join(root, "docs/note.txt"), "unsupported input", "utf8");
      const rejected = await run();
      assert.equal(rejected.result.status, "passed");
      assert.deepEqual(rejected.result.data, {
        sourceFileCount: 0,
        findingCount: 1,
        rejectedInputCount: 1
      });
      assert.deepEqual(rejected.records[0]?.data, {
        kind: "input-rejected",
        path: "docs/note.txt",
        blocking: false,
        reason: "unsupported-file-type"
      });
      assert.deepEqual(rejected.records[1]?.data, {
        kind: "finding-waiver-audit",
        identity: IDENTITY,
        reason: WAIVER.reason,
        matchCount: 0,
        status: "unused"
      });
      writeFileSync(join(root, IDENTITY.path), "# Clean heading\n", "utf8");
      const clean = await run();
      assert.equal(clean.result.status, "passed");
      assert.deepEqual(clean.records, rejected.records);
      assert.deepEqual(clean.result.data, {
        sourceFileCount: 1,
        findingCount: 1,
        rejectedInputCount: 1
      });
      writeFileSync(join(root, IDENTITY.path), "#missing\n", "utf8");
      writeFileSync(join(root, "docs/z-invalid.md"), Uint8Array.of(0xff));
      const failedRead = await run();
      assertUnavailableWithoutWaiver(failedRead, "source-unavailable", rejected.records[0]);
      writeFileSync(join(root, "docs/z-invalid.md"), "#missing\n", "utf8");
      const limited = await run({ limits: { maxMarkdownBytes: 1024, maxFindings: 1 } });
      assertUnavailableWithoutWaiver(limited, "finding-limit-exceeded", rejected.records[0]);
      const tooLarge = await run({ limits: { maxMarkdownBytes: 1, maxFindings: 10 } });
      assertUnavailableWithoutWaiver(tooLarge, "source-too-large", rejected.records[0]);
      const controller = new AbortController();
      const cancelledWork = run({}, controller.signal);
      controller.abort();
      assertUnavailableWithoutWaiver(await cancelledWork, "cancelled", rejected.records[0]);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });
});

function assertUnavailableWithoutWaiver(
  observed: Awaited<ReturnType<typeof executeMarkdownLintCheck>>,
  reason: string,
  rejectedRecord:
    | Awaited<ReturnType<typeof executeMarkdownLintCheck>>["records"][number]
    | undefined
): void {
  assert.equal(observed.result.status, "unavailable");
  if (observed.result.status !== "unavailable") return;
  assert.deepEqual(observed.result.reason, { code: reason });
  assert.equal(Object.hasOwn(observed.result, "data"), false);
  assert.deepEqual(observed.records, [rejectedRecord]);
  assert.equal(
    observed.result.messages?.some(({ code }) => code.includes("waiv")),
    false
  );
}

import assert from "node:assert/strict";
import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { describe, it } from "node:test";

import { markdownLint } from "./default-check.ts";
import { executeMarkdownLint, publishMarkdownLintTraversal } from "./execution.ts";
import { parseMarkdownLintData } from "./final-data.ts";
import { resolveMarkdownLintFindingIdentity } from "./finding-waiver-identity.ts";
import {
  createMarkdownLintTestRoot,
  executeMarkdownLintCheck,
  MARKDOWN_LINT_HEADING_WAIVER as WAIVER,
  MARKDOWN_LINT_OPTIONS
} from "./markdown-lint.test-support.ts";
import { orderedMarkdownLintCandidates } from "./records.ts";

const IDENTITY = WAIVER.identity;

describe("Markdown lint finding waivers", () => {
  it("retains exact finding evidence and counts while only unwaived findings block", async () => {
    const root = createMarkdownLintTestRoot("vibe-check-markdown-lint-waivers-");
    try {
      mkdirSync(join(root, "docs"), { recursive: true });
      writeFileSync(join(root, IDENTITY.path), "#missing\n\n```\nbody\n```\n", "utf8");
      const original = await executeMarkdownLintCheck(
        executeMarkdownLint,
        MARKDOWN_LINT_OPTIONS,
        root
      );
      assert.equal(original.result.status, "failed");
      assert.equal(original.records.length, 2);
      const partialOptions = markdownLint({
        files: MARKDOWN_LINT_OPTIONS.files,
        findingPolicy: "blocking",
        findingWaivers: [WAIVER]
      }).options;
      const partial = await executeMarkdownLintCheck(executeMarkdownLint, partialOptions, root);
      assert.equal(partial.result.status, "failed");
      assert.deepEqual(partial.records[0], {
        identity: original.records[0]?.identity,
        data: { ...original.records[0]?.data, waiver: { reason: WAIVER.reason } }
      });
      assert.deepEqual(partial.records[1], original.records[1]);
      assert.deepEqual(
        partial.result.messages?.map(({ code, level }) => ({ code, level })),
        [
          { code: "finding-detail", level: "error" },
          { code: "finding-waived", level: "info" }
        ]
      );
      const waivers = original.records.map(({ data }) => {
        assert.ok("path" in data && "rule" in data && "range" in data);
        const identity = resolveMarkdownLintFindingIdentity({
          path: data.path,
          rule: data.rule,
          range: data.range
        });
        assert.ok(identity !== undefined);
        return { identity, reason: "Reviewed public Record." };
      });
      const staleIdentity = { ...IDENTITY, path: "docs/renamed.md" };
      const options = markdownLint({
        files: MARKDOWN_LINT_OPTIONS.files,
        findingPolicy: "blocking",
        findingWaivers: [...waivers, { identity: staleIdentity, reason: "Stale path." }]
      }).options;
      const waived = await executeMarkdownLintCheck(executeMarkdownLint, options, root);
      assert.equal(waived.result.status, "passed");
      assert.deepEqual(parseMarkdownLintData(waived.result.data), {
        sourceFileCount: 1,
        findingCount: 2,
        rejectedInputCount: 0
      });
      assert.deepEqual(
        waived.records.slice(0, 2),
        original.records.map((record) => ({
          identity: record.identity,
          data: { ...record.data, waiver: { reason: "Reviewed public Record." } }
        }))
      );
      assert.equal(waived.records.length, 3);
      assert.deepEqual(waived.records[2]?.data, {
        kind: "finding-waiver-audit",
        identity: staleIdentity,
        reason: "Stale path.",
        matchCount: 0,
        status: "unused"
      });
      assert.match(
        waived.records[2]?.identity.id ?? "",
        /^\/finding-waiver-audit\/sha256:[a-f0-9]{64}$/u
      );
      assert.deepEqual(
        waived.result.messages?.map(({ code, level }) => ({ code, level })),
        [
          { code: "finding-waived", level: "info" },
          { code: "finding-waived", level: "info" },
          { code: "unused-finding-waiver", level: "warning" }
        ]
      );
      assert.equal(
        waived.result.messages?.[0]?.message,
        "Markdown lint finding for docs/source.md:1:1-3 no-missing-space-atx was waived: Reviewed public Record."
      );
      const advisory = await executeMarkdownLintCheck(
        executeMarkdownLint,
        { ...partialOptions, findingPolicy: "non-blocking" },
        root
      );
      assert.equal(advisory.result.status, "passed");
      assert.deepEqual(advisory.records, partial.records);
      assert.equal(
        advisory.result.messages?.some(({ level }) => level === "error"),
        false
      );
      for (let index = 0; index < 11; index += 1) {
        writeFileSync(join(root, `docs/note-${index}.txt`), "rejected", "utf8");
      }
      const rejectedWithWaivers = await executeMarkdownLintCheck(
        executeMarkdownLint,
        {
          ...options,
          files: { ...options.files, include: ["docs/*"] }
        },
        root
      );
      assert.equal(rejectedWithWaivers.result.status, "passed");
      assert.deepEqual(rejectedWithWaivers.result.data, {
        sourceFileCount: 1,
        findingCount: 13,
        rejectedInputCount: 11
      });
      assert.equal(
        rejectedWithWaivers.result.messages?.some(({ level }) => level === "error"),
        false
      );
      assert.equal(
        rejectedWithWaivers.result.messages?.some(
          ({ code, level }) => code === "findings-omitted" && level === "warning"
        ),
        true
      );
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  it("matches full ranges and leaves repeated identities actionable with a stable audit", async () => {
    const longerIdentity = {
      ...IDENTITY,
      range: { start: IDENTITY.range.start, end: { line: 1, column: 5 } }
    };
    const candidates = orderedMarkdownLintCandidates(
      [
        { path: IDENTITY.path, finding: { lineNumber: 1, range: [1, 2], rule: IDENTITY.rule } },
        { path: IDENTITY.path, finding: { lineNumber: 1, range: [1, 4], rule: IDENTITY.rule } },
        { path: IDENTITY.path, finding: { lineNumber: 1, range: [1, 4], rule: IDENTITY.rule } }
      ],
      MARKDOWN_LINT_OPTIONS.rules
    );
    const options = markdownLint({
      findingPolicy: "blocking",
      findingWaivers: [
        WAIVER,
        { identity: longerIdentity, reason: "Must not choose one duplicate." }
      ]
    }).options;
    const publish = (resolvedOptions: typeof options) =>
      executeMarkdownLintCheck(
        (context) =>
          publishMarkdownLintTraversal(
            context,
            { kind: "complete", candidates, sourceFileCount: 1 },
            []
          ),
        resolvedOptions,
        "/not-read-by-publication"
      );
    const observed = await publish(options);
    assert.equal(observed.result.status, "failed");
    assert.deepEqual(observed.result.data, {
      sourceFileCount: 1,
      findingCount: 3,
      rejectedInputCount: 0
    });
    assert.deepEqual(observed.records[0]?.data, {
      kind: "lint-finding",
      ...IDENTITY,
      waiver: { reason: WAIVER.reason }
    });
    assert.deepEqual(
      observed.records.slice(1, 3).map(({ data }) => data),
      candidates.slice(1).map(({ data }) => data)
    );
    assert.deepEqual(
      observed.records.slice(0, 3).map(({ identity }) => identity.id),
      [
        "path:docs%2Fsource.md:rule:no-missing-space-atx:line:1:column:1:ordinal:1",
        "path:docs%2Fsource.md:rule:no-missing-space-atx:line:1:column:1:ordinal:2",
        "path:docs%2Fsource.md:rule:no-missing-space-atx:line:1:column:1:ordinal:3"
      ]
    );
    assert.deepEqual(observed.records[3]?.data, {
      kind: "finding-waiver-audit",
      identity: longerIdentity,
      reason: "Must not choose one duplicate.",
      matchCount: 2,
      status: "overmatched"
    });
    assert.deepEqual(
      observed.result.messages?.map(({ code, level }) => ({ code, level })),
      [
        { code: "finding-detail", level: "error" },
        { code: "finding-detail", level: "error" },
        { code: "finding-waived", level: "info" },
        { code: "overmatched-finding-waiver", level: "warning" }
      ]
    );
    assert.match(
      observed.result.messages?.at(-1)?.message ?? "",
      /matched 2 findings and was not applied/u
    );
    const advisory = await publish({ ...options, findingPolicy: "non-blocking" });
    assert.equal(advisory.result.status, "passed");
    assert.deepEqual(advisory.records, observed.records);
    assert.equal(
      advisory.result.messages?.some(({ level }) => level === "error"),
      false
    );
    const reordered = await publish({
      ...options,
      findingWaivers: [...options.findingWaivers].reverse()
    });
    assert.deepEqual(reordered.records, observed.records);
  });
});

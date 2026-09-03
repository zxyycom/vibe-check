import assert from "node:assert/strict";
import { rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { describe, it } from "node:test";

import type { CheckMessage } from "../../check/check.ts";
import { functionMetrics } from "./constructor.ts";
import { executeFunctionMetrics } from "./execution.ts";
import {
  createRoot,
  execute,
  recordField,
  type ReportedRecord
} from "./constructor.test-support.ts";

const STRICT_LIMITS = {
  codeLines: {
    maximum: 10,
    lowComplexityAllowance: { cyclomaticComplexityBelow: 3, maximum: 20 }
  },
  cyclomaticComplexity: { maximum: 5 },
  nestingDepth: { maximum: 7 },
  parameters: { maximum: 4 }
} as const;
const RELAXED_LIMITS = {
  codeLines: {
    maximum: 100,
    lowComplexityAllowance: { cyclomaticComplexityBelow: 3, maximum: 150 }
  },
  cyclomaticComplexity: { maximum: 100 },
  nestingDepth: { maximum: 100 },
  parameters: { maximum: 100 }
} as const;

describe("functionMetrics area findings", () => {
  it("records complete analyzer evidence and fails only for effective blocking findings", async () => {
    const root = createRoot("vibe-check-function-areas-");
    try {
      writeFileSync(join(root, "src", "a.ts"), overLimitFunction("a"), "utf8");
      writeFileSync(join(root, "src", "b.ts"), overLimitFunction("b"), "utf8");
      const nonBlockingOptions = {
        codeAreas: {
          source: {
            files: { exclude: [], include: ["src/**/*.ts"], source: "filesystem" },
            limits: STRICT_LIMITS
          }
        }
      } as const;
      const nonBlocking = functionMetrics(nonBlockingOptions);
      const observed = await execute(executeFunctionMetrics, nonBlocking.options, root);
      assert.deepEqual(observed.result, {
        status: "passed",
        data: { blockingFindingCount: 0, findingCount: 8 },
        messages: observed.result.messages
      });
      assert.equal(observed.records.length, 8);
      assert.equal(
        observed.records.every((record) => recordField(record, "blocking") === false),
        true
      );

      const mixed = functionMetrics({
        ...nonBlockingOptions,
        codeAreas: {
          source: nonBlockingOptions.codeAreas.source,
          overlap: {
            files: { exclude: [], include: ["src/a.ts"], source: "filesystem" },
            findingPolicy: "blocking",
            limits: RELAXED_LIMITS
          }
        }
      });
      const blocked = await execute(executeFunctionMetrics, mixed.options, root);
      assert.equal(blocked.result.status, "failed");
      if (blocked.result.status !== "failed") return;
      assert.deepEqual(blocked.result.data, { blockingFindingCount: 4, findingCount: 8 });
      const aRecords = blocked.records.filter(
        (record) => recordField(record, "path") === "src/a.ts"
      );
      const bRecords = blocked.records.filter(
        (record) => recordField(record, "path") === "src/b.ts"
      );
      assert.equal(aRecords.length, 4);
      assert.equal(
        aRecords.every((record) => recordField(record, "blocking") === true),
        true
      );
      assert.equal(
        aRecords.every(
          (record) => JSON.stringify(recordField(record, "codeAreas")) === '["overlap","source"]'
        ),
        true
      );
      assert.equal(bRecords.length, 4);
      assert.equal(
        bRecords.every((record) => recordField(record, "blocking") === false),
        true
      );
      assert.equal(
        bRecords.every(
          (record) => JSON.stringify(recordField(record, "codeAreas")) === '["source"]'
        ),
        true
      );

      assertComplexityContributorsAndNestingFinding(blocked.records, blocked.result.messages ?? []);

      const sourceUnavailable = await execute(
        executeFunctionMetrics,
        {
          ...mixed.options,
          codeAreas: {
            source: {
              ...mixed.options.codeAreas.source,
              files: { ...mixed.options.codeAreas.source.files, source: "git-worktree" }
            }
          }
        },
        root
      );
      assert.deepEqual(sourceUnavailable.result, {
        status: "unavailable",
        reason: { code: "source-unavailable" },
        messages: [
          {
            code: "source-unavailable",
            level: "error",
            message:
              "Function metrics could not collect its configured project files; check the project root, file permissions, and selected file source."
          }
        ]
      });
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });
});

function assertComplexityContributorsAndNestingFinding(
  records: readonly ReportedRecord[],
  messages: readonly CheckMessage[]
): void {
  const complexityRecord = records.find(
    (record) => recordField(record, "metric") === "cyclomatic-complexity"
  );
  assert.deepEqual(recordField(complexityRecord!, "complexityContributors"), [
    { line: 2, token: "if" },
    { line: 3, token: "if" },
    { line: 4, token: "if" },
    { line: 5, token: "if" },
    { line: 6, token: "if" },
    { line: 7, token: "if" },
    { line: 8, token: "if" },
    { line: 9, token: "if" },
    { line: 10, token: "if" },
    { line: 11, token: "if" },
    { line: 12, token: "if" },
    { line: 13, token: "if" },
    { line: 14, token: "if" },
    { line: 15, token: "if" },
    { line: 16, token: "if" },
    { line: 17, token: "if" }
  ]);

  const nestingRecord = records.find((record) => recordField(record, "metric") === "nesting-depth");
  assert.equal(recordField(nestingRecord!, "value"), 16);
  assert.equal(recordField(nestingRecord!, "limit"), 7);
  assert.equal(Object.hasOwn(nestingRecord!.data, "complexityContributors"), false);
  assert.ok(
    messages.some(
      (message) =>
        message.code === "finding-detail" &&
        message.message ===
          "src/a.ts:1 a: cyclomatic-complexity 17 exceeds the 5 limit (areas: overlap, source). Complexity contributors: if at line 2, if at line 3, if at line 4, if at line 5, if at line 6, if at line 7, if at line 8, if at line 9; 8 additional contributor(s) are in this finding Record."
    )
  );
}

function overLimitFunction(name: string): string {
  return [
    `export function ${name}(a: number, b: number, c: number, d: number, e: number, f: number, g: number) {`,
    ...Array.from({ length: 16 }, (_, index) => `  if (a > ${index}) return b;`),
    "  return a;",
    "}"
  ].join("\n");
}

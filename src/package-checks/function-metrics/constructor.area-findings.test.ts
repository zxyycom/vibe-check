import assert from "node:assert/strict";
import { rmSync } from "node:fs";
import { describe, it } from "node:test";

import { functionMetrics } from "./constructor.ts";
import { executeFunctionMetrics } from "./execution.ts";
import { MIXED_DETAILS, NON_BLOCKING_DETAILS } from "./finding-messages.test-support.ts";
import {
  createExecutable,
  createRoot,
  execute,
  recordField,
  RELAXED_LIMITS,
  STRICT_LIMITS
} from "./constructor.test-support.ts";

describe("functionMetrics area findings", () => {
  it("records complete area evidence and fails only for effective blocking findings", async () => {
    const root = createRoot("vibe-check-function-areas-");
    try {
      const executable = createExecutable(
        root,
        [
          "if (process.argv.includes('--version')) {",
          "  process.stdout.write('1.23.0\\n');",
          "} else {",
          "  const expected = ['src/a.ts', 'src/b.ts', '--csv'];",
          "  if (JSON.stringify(process.argv.slice(2)) !== JSON.stringify(expected)) process.exit(2);",
          "  process.stdout.write('NLOC,CCN,token count,parameter count,length,location,file path,function name,long name,start line,end line\\n20,12,100,7,20,a@1-20@src/a.ts,src/a.ts,a,a (),1,20\\n20,12,100,7,20,b@1-20@src/b.ts,src/b.ts,b,b (),1,20\\n');",
          "}"
        ].join("\n")
      );
      const nonBlockingOptions = {
        codeAreas: {
          source: {
            files: { exclude: [], include: ["src/**/*.ts"], source: "filesystem" },
            limits: STRICT_LIMITS
          }
        },
        scanner: { executable }
      } as const;
      const nonBlocking = functionMetrics(nonBlockingOptions);
      const observed = await execute(executeFunctionMetrics, nonBlocking.options, root);
      assert.deepEqual(observed.result, {
        status: "passed",
        data: { blockingFindingCount: 0, findingCount: 6 },
        messages: [
          {
            code: "non-blocking-findings",
            level: "warning",
            message:
              "6 non-blocking finding(s) were recorded; inspect this Check's Records for affected paths and measurements, then update the code or policy."
          },
          ...NON_BLOCKING_DETAILS
        ]
      });
      assert.equal(observed.records.length, 6);
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
      assert.deepEqual(blocked.result, {
        status: "failed",
        data: { blockingFindingCount: 3, findingCount: 6 },
        messages: [
          {
            code: "blocking-findings",
            level: "error",
            message:
              "3 blocking finding(s) require attention; inspect this Check's Records for affected paths and measurements, then update the code or policy."
          },
          ...MIXED_DETAILS
        ]
      });
      const aRecords = blocked.records.filter(
        (record) => recordField(record, "path") === "src/a.ts"
      );
      const bRecords = blocked.records.filter(
        (record) => recordField(record, "path") === "src/b.ts"
      );
      assert.equal(aRecords.length, 3);
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
      assert.equal(bRecords.length, 3);
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

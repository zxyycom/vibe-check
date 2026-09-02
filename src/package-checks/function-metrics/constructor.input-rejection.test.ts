import assert from "node:assert/strict";
import { existsSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { describe, it } from "node:test";

import { functionMetrics } from "./constructor.ts";
import { executeFunctionMetrics } from "./execution.ts";
import { REJECTED_DETAILS, TWO_OMITTED_DETAILS } from "./finding-messages.test-support.ts";
import { createExecutable, createRoot, execute } from "./constructor.test-support.ts";

describe("functionMetrics area findings", () => {
  it("reports every rejected selected path once and sends only accepted paths to Lizard", async () => {
    const root = createRoot("vibe-check-function-rejected-");
    try {
      mkdirSync(join(root, "docs"), { recursive: true });
      writeFileSync(join(root, "docs", "data.json"), "{}\n", "utf8");
      writeFileSync(join(root, "docs", "guide.md"), "# Guide\n", "utf8");
      const executable = createExecutable(
        root,
        [
          "if (process.argv.includes('--version')) {",
          "  process.stdout.write('1.23.0\\n');",
          "} else {",
          "  const expected = ['src/a.ts', '--csv'];",
          "  if (JSON.stringify(process.argv.slice(2)) !== JSON.stringify(expected)) process.exit(2);",
          "}"
        ].join("\n")
      );
      const check = functionMetrics({
        codeAreas: {
          broad: {
            files: {
              exclude: [],
              include: ["src/a.ts", "docs/**"],
              source: "filesystem"
            },
            findingPolicy: "blocking"
          },
          overlap: {
            files: { exclude: [], include: ["docs/guide.md"], source: "filesystem" },
            findingPolicy: "blocking"
          }
        },
        scanner: { executable }
      });

      const observed = await execute(executeFunctionMetrics, check.options, root);
      assert.deepEqual(observed.result, {
        status: "passed",
        data: { blockingFindingCount: 0, findingCount: 2 },
        messages: [
          {
            code: "input-rejected",
            level: "warning",
            message:
              "2 selected functionMetrics input file(s) were rejected because their file type is unsupported; inspect this Check's Records and narrow files.include/exclude."
          },
          ...REJECTED_DETAILS
        ]
      });
      assert.deepEqual(observed.records, [
        {
          identity: { id: "/input-rejected/docs/data.json" },
          data: {
            blocking: false,
            codeAreas: ["broad"],
            kind: "input-rejected",
            path: "docs/data.json",
            reason: "unsupported-file-type"
          }
        },
        {
          identity: { id: "/input-rejected/docs/guide.md" },
          data: {
            blocking: false,
            codeAreas: ["broad", "overlap"],
            kind: "input-rejected",
            path: "docs/guide.md",
            reason: "unsupported-file-type"
          }
        }
      ]);

      createExecutable(
        root,
        [
          "if (process.argv.includes('--version')) {",
          "  process.stdout.write('1.23.0\\n');",
          "} else process.exit(2);"
        ].join("\n")
      );
      const unavailableObserved = await execute(executeFunctionMetrics, check.options, root);
      assert.deepEqual(unavailableObserved.records, observed.records);
      assert.deepEqual(unavailableObserved.result, {
        status: "unavailable",
        reason: { code: "external-execution-failed" },
        messages: [
          {
            code: "external-execution-failed",
            level: "error",
            message:
              "Lizard did not complete successfully; run the configured command directly and inspect its environment."
          },
          {
            code: "input-rejected",
            level: "warning",
            message:
              "2 selected functionMetrics input file(s) were rejected because their file type is unsupported; inspect this Check's Records and narrow files.include/exclude."
          }
        ]
      });
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  it("does not start Lizard when every selected path is rejected", async () => {
    const root = createRoot("vibe-check-function-all-rejected-");
    const marker = join(root, "lizard-called");
    try {
      mkdirSync(join(root, "docs"), { recursive: true });
      const rejectedPaths = Array.from(
        { length: 12 },
        (_, index) => `docs/guide-${String(index + 1).padStart(2, "0")}.md`
      );
      for (const path of rejectedPaths) {
        writeFileSync(join(root, path), "# Guide\n", "utf8");
      }
      const executable = createExecutable(
        root,
        "require('node:fs').writeFileSync('lizard-called', '');"
      );
      const check = functionMetrics({
        codeAreas: {
          docs: {
            files: { exclude: [], include: ["docs/**"], source: "filesystem" },
            findingPolicy: "blocking"
          }
        },
        scanner: { executable }
      });

      const observed = await execute(executeFunctionMetrics, check.options, root);
      assert.deepEqual(observed.result, {
        status: "passed",
        data: { blockingFindingCount: 0, findingCount: 12 },
        messages: [
          {
            code: "input-rejected",
            level: "warning",
            message:
              "12 selected functionMetrics input file(s) were rejected because their file type is unsupported; inspect this Check's Records and narrow files.include/exclude."
          },
          ...rejectedPaths.slice(0, 10).map((path) => ({
            code: "finding-detail",
            level: "warning",
            message: `${path}: selected input is not supported by function metrics (areas: docs).`
          })),
          TWO_OMITTED_DETAILS
        ]
      });
      assert.equal(observed.records.length, 12);
      assert.equal(existsSync(marker), false);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });
});

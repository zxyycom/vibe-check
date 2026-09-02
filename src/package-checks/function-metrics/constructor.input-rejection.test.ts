import assert from "node:assert/strict";
import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { describe, it } from "node:test";

import { functionMetrics } from "./constructor.ts";
import { executeFunctionMetrics } from "./execution.ts";
import { createRoot, execute, recordField } from "./constructor.test-support.ts";

describe("functionMetrics area findings", () => {
  it("reports every rejected selected path once and sends only accepted paths to the analyzer", async () => {
    const root = createRoot("vibe-check-function-rejected-");
    try {
      mkdirSync(join(root, "docs"), { recursive: true });
      writeFileSync(join(root, "docs", "data.json"), "{}\n", "utf8");
      writeFileSync(join(root, "docs", "guide.md"), "# Guide\n", "utf8");
      const check = functionMetrics({
        codeAreas: {
          broad: {
            files: { exclude: [], include: ["src/a.ts", "docs/**"], source: "filesystem" },
            findingPolicy: "blocking"
          },
          overlap: {
            files: { exclude: [], include: ["docs/guide.md"], source: "filesystem" },
            findingPolicy: "blocking"
          }
        }
      });

      const observed = await execute(executeFunctionMetrics, check.options, root);
      assert.equal(observed.result.status, "passed");
      if (observed.result.status !== "passed") return;
      assert.deepEqual(observed.result.data, { blockingFindingCount: 0, findingCount: 2 });
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
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  it("does not create analyzer metric records when every selected path is rejected", async () => {
    const root = createRoot("vibe-check-function-all-rejected-");
    try {
      mkdirSync(join(root, "docs"), { recursive: true });
      const rejectedPaths = Array.from(
        { length: 12 },
        (_, index) => `docs/guide-${String(index + 1).padStart(2, "0")}.md`
      );
      for (const path of rejectedPaths) {
        writeFileSync(join(root, path), "# Guide\n", "utf8");
      }
      const check = functionMetrics({
        codeAreas: {
          docs: {
            files: { exclude: [], include: ["docs/**"], source: "filesystem" },
            findingPolicy: "blocking"
          }
        }
      });

      const observed = await execute(executeFunctionMetrics, check.options, root);
      assert.equal(observed.result.status, "passed");
      if (observed.result.status !== "passed") return;
      assert.deepEqual(observed.result.data, { blockingFindingCount: 0, findingCount: 12 });
      assert.equal(observed.records.length, 12);
      assert.equal(
        observed.records.every((record) => recordField(record, "kind") === "input-rejected"),
        true
      );
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });
});

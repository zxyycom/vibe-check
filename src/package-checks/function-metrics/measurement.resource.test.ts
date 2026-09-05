import assert from "node:assert/strict";
import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { describe, it } from "node:test";

import { functionMetrics } from "./constructor.ts";
import { createRoot, execute } from "./constructor.test-support.ts";
import { executeFunctionMetrics } from "./execution.ts";
import { measureFunctionMetrics } from "./measurement.ts";

const MEBIBYTE = 1024 * 1024;
const FILE_LIMIT = 8 * MEBIBYTE;

describe("functionMetrics resource admission", () => {
  it("uses actual bytes for the 8 MiB per-file boundary and fails closed above it", async () => {
    const root = createRoot("vibe-check-function-file-cap-");
    try {
      const boundaryPath = "src/boundary.ts";
      writeFileSync(join(root, boundaryPath), Buffer.alloc(FILE_LIMIT, 0x20));
      const boundary = await measure(root, [boundaryPath]);
      assert.deepEqual(boundary, { kind: "complete", metrics: [] });

      const overLimitPath = "src/over-limit.ts";
      writeFileSync(join(root, overLimitPath), Buffer.alloc(FILE_LIMIT + 1, 0x20));
      assert.deepEqual(await measure(root, [overLimitPath]), { kind: "resource-limit-exceeded" });
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  // oxfmt-ignore
  it("fails the whole exact input when aggregate bytes exceed 64 MiB without sending a prefix", { timeout: 20_000 }, async () => {
    const root = createRoot("vibe-check-function-aggregate-cap-");
    try {
      const paths = Array.from({ length: 9 }, (_, index) => `src/input-${index}.ts`);
      for (const path of paths.slice(0, 8)) {
        writeFileSync(join(root, path), Buffer.alloc(FILE_LIMIT, 0x20));
      }
      writeFileSync(join(root, paths[8]), " ");
      assert.deepEqual(await measure(root, paths), { kind: "resource-limit-exceeded" });
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  it("reports a missing admitted exact path as source-unavailable", async () => {
    const root = createRoot("vibe-check-function-read-failure-");
    try {
      mkdirSync(join(root, "src"), { recursive: true });
      assert.deepEqual(await measure(root, ["src/missing.ts"]), { kind: "source-unavailable" });
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  it("maps a synchronous Worker postMessage failure to one whole analysis failure", async () => {
    const root = createRoot("vibe-check-function-worker-post-failure-");
    const workerDescriptor = Object.getOwnPropertyDescriptor(globalThis, "Worker");
    if (workerDescriptor === undefined)
      throw new Error("Bun Worker must be available for this test.");
    let terminated = false;
    try {
      writeFileSync(join(root, "src", "input.ts"), "export const input = 1;\n", "utf8");
      Object.defineProperty(globalThis, "Worker", {
        configurable: true,
        value: class {
          public onerror: Worker["onerror"] = null;
          public onmessage: Worker["onmessage"] = null;

          public postMessage(): void {
            throw new Error("Worker postMessage failed.");
          }

          public terminate(): void {
            terminated = true;
          }
        }
      });

      assert.deepEqual(await measure(root, ["src/input.ts"]), { kind: "analysis-failed" });
      assert.equal(terminated, true);
    } finally {
      Object.defineProperty(globalThis, "Worker", workerDescriptor);
      rmSync(root, { recursive: true, force: true });
    }
  });

  it("fails closed for malformed Worker replies while retaining the current transport shape boundary", async () => {
    const root = createRoot("vibe-check-function-worker-reply-");
    const workerDescriptor = Object.getOwnPropertyDescriptor(globalThis, "Worker");
    if (workerDescriptor === undefined)
      throw new Error("Bun Worker must be available for this test.");
    let reply: unknown;
    try {
      writeFileSync(join(root, "src", "input.ts"), "export const input = 1;\n", "utf8");
      Object.defineProperty(globalThis, "Worker", {
        configurable: true,
        value: class {
          public onmessage: ((event: { readonly data: unknown }) => void) | null = null;

          public postMessage(): void {
            this.onmessage?.({ data: reply });
          }

          public terminate(): void {}
        }
      });

      const parentAcceptedMetric = {
        cyclomaticComplexity: {
          extraNestedKey: true,
          source: "typescript-analyzer",
          value: null
        },
        endLine: -2,
        extraMetricKey: true,
        file: "src/input.ts",
        lines: -3,
        name: "parent-accepted",
        parameterCount: -4,
        startLine: -1
      };
      reply = {
        extraTopLevelKey: true,
        kind: "complete",
        metrics: [parentAcceptedMetric]
      };
      assert.deepEqual(await measure(root, ["src/input.ts"]), {
        kind: "complete",
        metrics: [parentAcceptedMetric]
      });

      const invalidReplies = [
        {
          name: "a missing metric identity",
          reply: { kind: "complete", metrics: [{ ...parentAcceptedMetric, name: undefined }] }
        },
        {
          name: "a non-safe-integer measurement",
          reply: { kind: "complete", metrics: [{ ...parentAcceptedMetric, startLine: 1.5 }] }
        },
        {
          name: "a non-safe-integer complexity",
          reply: {
            kind: "complete",
            metrics: [
              {
                ...parentAcceptedMetric,
                cyclomaticComplexity: { source: "typescript-analyzer", value: 1.5 }
              }
            ]
          }
        },
        {
          name: "an unrecognized complexity source",
          reply: {
            kind: "complete",
            metrics: [
              {
                ...parentAcceptedMetric,
                cyclomaticComplexity: { source: "other-analyzer", value: 1 }
              }
            ]
          }
        },
        {
          name: "a metric outside the parent-approved exact paths",
          reply: { kind: "complete", metrics: [{ ...parentAcceptedMetric, file: "src/other.ts" }] }
        }
      ];
      for (const invalidReply of invalidReplies) {
        reply = invalidReply.reply;
        assert.deepEqual(
          await measure(root, ["src/input.ts"]),
          { kind: "analysis-failed" },
          invalidReply.name
        );
      }
    } finally {
      Object.defineProperty(globalThis, "Worker", workerDescriptor);
      rmSync(root, { recursive: true, force: true });
    }
  });

  it("yields during admission so cancellation prevents Worker startup, Records, and waiver audit", async () => {
    const root = createRoot("vibe-check-function-admission-cancel-");
    const workerDescriptor = Object.getOwnPropertyDescriptor(globalThis, "Worker");
    if (workerDescriptor === undefined)
      throw new Error("Bun Worker must be available for this test.");
    let workerStarted = false;
    try {
      writeFileSync(join(root, "src", "input.ts"), Buffer.alloc(FILE_LIMIT, 0x20));
      const check = functionMetrics({
        codeAreas: {
          source: {
            files: { exclude: [], include: ["src/input.ts"], source: "filesystem" }
          }
        },
        findingWaivers: [
          {
            identity: {
              functionName: "missing",
              metric: "parameter-count",
              path: "src/input.ts",
              startLine: 1
            },
            reason: "Admission cancellation must not audit an incomplete metric set."
          }
        ]
      });
      Object.defineProperty(globalThis, "Worker", {
        configurable: true,
        value: class {
          public constructor() {
            workerStarted = true;
            throw new Error("Worker must not start after admission cancellation.");
          }
        }
      });
      const controller = new AbortController();
      const cancellation = setTimeout(() => controller.abort(), 0);
      try {
        const observed = await execute(
          executeFunctionMetrics,
          check.options,
          root,
          controller.signal
        );
        assert.deepEqual(observed.result, {
          status: "unavailable",
          reason: { code: "cancelled" },
          messages: [
            {
              code: "cancelled",
              level: "error",
              message:
                "Function metrics was cancelled before it could form a complete result; inspect the caller's cancellation reason and retry if appropriate."
            }
          ]
        });
        assert.equal(workerStarted, false);
        assert.deepEqual(observed.records, []);
      } finally {
        clearTimeout(cancellation);
      }
    } finally {
      Object.defineProperty(globalThis, "Worker", workerDescriptor);
      rmSync(root, { recursive: true, force: true });
    }
  });
});

function measure(rootDir: string, approvedExactPaths: readonly string[]) {
  return measureFunctionMetrics(
    {
      input: { approvedExactPaths, areas: [], rootDir },
      signal: new AbortController().signal
    },
    { yieldAdmission: () => Promise.resolve() }
  );
}

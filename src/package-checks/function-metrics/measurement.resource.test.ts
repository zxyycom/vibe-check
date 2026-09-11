import assert from "node:assert/strict";
import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { describe, it } from "node:test";

import { functionMetrics } from "./constructor.ts";
import { createRoot, execute } from "./constructor.test-support.ts";
import { executeFunctionMetrics } from "./execution.ts";
import type { FunctionMetricsWorkerPort } from "./analyzer-worker-port.ts";
import { measureFunctionMetrics, type FunctionMeasurementDependencies } from "./measurement.ts";

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
      const aggregateCapPath = paths[8];
      if (aggregateCapPath === undefined) throw new Error("expected aggregate cap fixture path");
      writeFileSync(join(root, aggregateCapPath), " ");
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
    let listeners: WorkerListeners | undefined;
    let terminationCount = 0;
    let unsubscribeCount = 0;
    try {
      writeFileSync(join(root, "src", "input.ts"), "export const input = 1;\n", "utf8");
      assert.deepEqual(
        await measure(root, ["src/input.ts"], {
          createWorker: () => ({
            postMessage: () => {
              throw new Error("Worker postMessage failed.");
            },
            subscribe: (nextListeners) => {
              listeners = nextListeners;
              return (): void => {
                unsubscribeCount += 1;
              };
            },
            terminate: () => {
              terminationCount += 1;
            }
          })
        }),
        { kind: "analysis-failed" }
      );
      assert.equal(unsubscribeCount, 1);
      assert.equal(terminationCount, 1);
      const lateListeners = listeners;
      if (lateListeners === undefined) throw new Error("Worker listeners were not installed");
      lateListeners.message({ kind: "analysis-failed" });
      lateListeners.error();
      lateListeners.exit(0);
      assert.equal(unsubscribeCount, 1);
      assert.equal(terminationCount, 1);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  it("fails closed for malformed Worker replies while retaining the current transport shape boundary", async () => {
    const root = createRoot("vibe-check-function-worker-reply-");
    let reply: unknown;
    try {
      writeFileSync(join(root, "src", "input.ts"), "export const input = 1;\n", "utf8");
      const dependencies = {
        createWorker: () =>
          scriptedWorker({
            postMessage: (listeners) => {
              listeners.message(reply);
            }
          })
      } satisfies Partial<FunctionMeasurementDependencies>;

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
      assert.deepEqual(await measure(root, ["src/input.ts"], dependencies), {
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
          await measure(root, ["src/input.ts"], dependencies),
          { kind: "analysis-failed" },
          invalidReply.name
        );
      }
      for (const failedEvent of [
        {
          name: "Worker error",
          publish: (listeners: WorkerListeners) => {
            listeners.error();
          }
        },
        {
          name: "zero exit without a reply",
          publish: (listeners: WorkerListeners) => {
            listeners.exit(0);
          }
        },
        {
          name: "non-zero exit",
          publish: (listeners: WorkerListeners) => {
            listeners.exit(1);
          }
        }
      ]) {
        assert.deepEqual(
          await measure(root, ["src/input.ts"], {
            createWorker: () => scriptedWorker({ postMessage: failedEvent.publish })
          }),
          { kind: "analysis-failed" },
          failedEvent.name
        );
      }
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  it("yields during admission so cancellation prevents Worker startup, Records, and waiver audit", async () => {
    const root = createRoot("vibe-check-function-admission-cancel-");
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
      const controller = new AbortController();
      const cancellation = setTimeout(() => {
        controller.abort();
      }, 0);
      try {
        const observed = await execute(
          (context) =>
            executeFunctionMetrics(context, {
              measurement: {
                createWorker: () => {
                  workerStarted = true;
                  throw new Error("Worker must not start after admission cancellation.");
                }
              }
            }),
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
      rmSync(root, { recursive: true, force: true });
    }
  });
});

function measure(
  rootDir: string,
  approvedExactPaths: readonly string[],
  dependencies: Partial<FunctionMeasurementDependencies> = {}
) {
  return measureFunctionMetrics(
    {
      input: { approvedExactPaths, areas: [], rootDir },
      signal: new AbortController().signal
    },
    { yieldAdmission: () => Promise.resolve(), ...dependencies }
  );
}

type WorkerListeners = Parameters<FunctionMetricsWorkerPort["subscribe"]>[0];

function scriptedWorker(
  input: Readonly<{
    readonly postMessage: (listeners: WorkerListeners) => void;
    readonly terminate?: () => void;
  }>
): FunctionMetricsWorkerPort {
  let listeners: WorkerListeners | undefined;
  return {
    postMessage: (): void => {
      if (listeners === undefined) throw new Error("scripted Worker has no listeners");
      input.postMessage(listeners);
    },
    subscribe: (nextListeners): (() => void) => {
      listeners = nextListeners;
      return (): void => {
        listeners = undefined;
      };
    },
    terminate: input.terminate ?? (() => undefined)
  };
}

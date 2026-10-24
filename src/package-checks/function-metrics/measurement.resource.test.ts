import assert from "node:assert/strict";
import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { describe, it } from "node:test";

import { functionMetrics } from "./constructor.ts";
import { createRoot, execute } from "./constructor.test-support.ts";
import { executeFunctionMetrics } from "./execution.ts";
import type { FunctionMetricsWorkerPort } from "./analyzer-worker-port.ts";
import {
  DEFAULT_FUNCTION_SOURCE_LIMITS,
  measureFunctionMetrics,
  type FunctionMeasurementDependencies
} from "./measurement.ts";

const FILE_LIMIT = 32 * 1024 + 1;

describe("functionMetrics resource admission", () => {
  it("uses actual bytes across chunk boundaries and fails closed above the private file limit", async () => {
    assert.deepEqual(DEFAULT_FUNCTION_SOURCE_LIMITS, {
      maximumFileBytes: 8 * 1024 * 1024,
      maximumAggregateBytes: 64 * 1024 * 1024
    });
    assert.equal(Object.isFrozen(DEFAULT_FUNCTION_SOURCE_LIMITS), true);
    const root = createRoot("vibe-check-function-file-cap-");
    try {
      const boundaryPath = "src/boundary.ts";
      const source = `${"é".repeat((FILE_LIMIT - 1) / 2)} `;
      assert.equal(Buffer.byteLength(source), FILE_LIMIT);
      writeFileSync(join(root, boundaryPath), source);
      let posted = 0;
      let yields = 0;
      const sourceLimits = { maximumFileBytes: FILE_LIMIT, maximumAggregateBytes: FILE_LIMIT * 2 };
      const createWorker = () =>
        scriptedWorker({
          postMessage: (listeners, request) => {
            posted += 1;
            assert.deepEqual(request, { files: [{ path: boundaryPath, source }] });
            listeners.message({ kind: "complete", metrics: [] });
          }
        });
      assert.deepEqual(
        await measure(root, [boundaryPath], {
          sourceLimits,
          createWorker,
          yieldAdmission: async () => {
            yields += 1;
          }
        }),
        { kind: "complete", metrics: [] }
      );
      assert.equal(yields, 2);
      assert.equal(posted, 1);

      writeFileSync(join(root, boundaryPath), `${source} `);
      let workers = 0;
      assert.deepEqual(
        await measure(root, [boundaryPath], {
          sourceLimits,
          createWorker: () => {
            workers += 1;
            throw new Error("over-limit file must not start");
          }
        }),
        { kind: "resource-limit-exceeded" }
      );
      assert.equal(workers, 0);

      // Omitted policy still admits this input: the small test policy is not the production default.
      assert.deepEqual(
        await measure(root, [boundaryPath], {
          createWorker: () =>
            scriptedWorker({
              postMessage: (listeners, request) => {
                posted += 1;
                assert.deepEqual(request, {
                  files: [{ path: boundaryPath, source: `${source} ` }]
                });
                listeners.message({ kind: "complete", metrics: [] });
              }
            })
        }),
        { kind: "complete", metrics: [] }
      );
      assert.equal(posted, 2);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  it("fails the whole exact input above the private aggregate limit without sending a prefix", async () => {
    const root = createRoot("vibe-check-function-aggregate-cap-");
    try {
      const paths = ["src/first.ts", "src/second.ts", "src/extra.ts"];
      for (const path of paths.slice(0, 2)) writeFileSync(join(root, path), "12345678");
      writeFileSync(join(root, "src/extra.ts"), " ");
      const sourceLimits = { maximumFileBytes: 8, maximumAggregateBytes: 16 };
      let posted = 0;
      assert.deepEqual(
        await measure(root, paths.slice(0, 2), {
          sourceLimits,
          createWorker: () =>
            scriptedWorker({
              postMessage: (listeners, request) => {
                posted += 1;
                assert.deepEqual(request, {
                  files: [
                    { path: "src/first.ts", source: "12345678" },
                    { path: "src/second.ts", source: "12345678" }
                  ]
                });
                listeners.message({ kind: "complete", metrics: [] });
              }
            })
        }),
        { kind: "complete", metrics: [] }
      );
      assert.equal(posted, 1);
      let workers = 0;
      assert.deepEqual(
        await measure(root, paths, {
          sourceLimits,
          createWorker: () => {
            workers += 1;
            throw new Error("over-limit batch must not start");
          }
        }),
        { kind: "resource-limit-exceeded" }
      );
      assert.equal(workers, 0);
      assert.equal(posted, 1);
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
      writeFileSync(join(root, "src", "input.ts"), "function input() { return 1; }\n");
      const check = functionMetrics({
        codeAreas: {
          source: {
            files: { patterns: ["src/input.ts"] }
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
      let yields = 0;
      const observed = await execute(
        (options, context) =>
          executeFunctionMetrics(options, context, {
            measurement: {
              yieldAdmission: async () => {
                yields += 1;
                controller.abort();
              },
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
      assert.equal(yields, 1);
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
    readonly postMessage: (listeners: WorkerListeners, request: unknown) => void;
    readonly terminate?: () => void;
  }>
): FunctionMetricsWorkerPort {
  let listeners: WorkerListeners | undefined;
  return {
    postMessage: (request): void => {
      if (listeners === undefined) throw new Error("scripted Worker has no listeners");
      input.postMessage(listeners, request);
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

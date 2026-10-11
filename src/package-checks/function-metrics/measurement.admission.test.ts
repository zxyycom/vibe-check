import assert from "node:assert/strict";
import { readFile, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { describe, it } from "node:test";

import { createNodeFunctionMetricsWorker } from "./analyzer-worker-port.ts";
import { functionMetrics } from "./constructor.ts";
import { createRoot, execute, recordField } from "./constructor.test-support.ts";
import { executeFunctionMetrics } from "./execution.ts";
import { measureFunctionMetrics } from "./measurement.ts";

const FILE_BYTES = 8 * 1024 * 1024;

describe("functionMetrics admission cancellation", () => {
  it("does not open analysis or create a Worker for an already aborted invocation", async () => {
    const controller = new AbortController();
    controller.abort();
    let workers = 0;
    const result = await measureFunctionMetrics(
      {
        input: { rootDir: "/missing", approvedExactPaths: ["missing.ts"], areas: [] },
        signal: controller.signal
      },
      {
        createWorker: () => {
          workers += 1;
          throw new Error("unexpected Worker");
        }
      }
    );
    assert.deepEqual(result, { kind: "cancelled" });
    assert.equal(workers, 0);
  });

  it("the production yield lets timer and I/O abort stop admission before any Worker batch", async () => {
    const root = createRoot("vibe-check-function-default-yield-");
    try {
      writeFileSync(join(root, "src/input.ts"), Buffer.alloc(FILE_BYTES, 0x20));
      writeFileSync(join(root, "src/later.ts"), "function later() { return 1; }");
      for (const callbackKind of ["timer", "io"] as const) {
        const controller = new AbortController();
        const originalImmediate = globalThis.setImmediate;
        let yields = 0;
        let workers = 0;
        let callbackObserved = false;
        let timer: ReturnType<typeof setTimeout> | undefined;
        // Observe the production scheduling boundary, while delegating every yield unchanged.
        const observeImmediate = (...args: Parameters<typeof setImmediate>) => {
          yields += 1;
          if (yields === 1) {
            const abort = (): void => {
              callbackObserved = true;
              controller.abort();
            };
            if (callbackKind === "timer") timer = setTimeout(abort, 0);
            else
              readFile(join(root, "src/later.ts"), (error) => {
                assert.equal(error, null);
                abort();
              });
          }
          return Reflect.apply(originalImmediate, globalThis, args);
        };
        globalThis.setImmediate = Object.assign(observeImmediate, {
          __promisify__: originalImmediate.__promisify__
        });
        try {
          const result = await measureFunctionMetrics(
            {
              input: {
                rootDir: root,
                approvedExactPaths: ["src/input.ts", "src/later.ts"],
                areas: []
              },
              signal: controller.signal
            },
            {
              createWorker: () => {
                workers += 1;
                throw new Error("unexpected Worker");
              }
            }
          );
          assert.deepEqual(result, { kind: "cancelled" }, callbackKind);
          assert.equal(callbackObserved, true, callbackKind);
          assert.ok(yields > 0 && yields < FILE_BYTES / (32 * 1024), callbackKind);
          assert.equal(workers, 0, callbackKind);
        } finally {
          globalThis.setImmediate = originalImmediate;
          if (timer !== undefined) clearTimeout(timer);
        }
      }
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  it("stops after an early file chunk without submitting later exact paths", async () => {
    const root = createRoot("vibe-check-function-cross-file-");
    try {
      writeFileSync(join(root, "src/early.ts"), "function early() { return 1; }");
      const controller = new AbortController();
      let yields = 0;
      let workers = 0;
      const result = await measureFunctionMetrics(
        {
          input: {
            rootDir: root,
            approvedExactPaths: ["src/early.ts", "src/missing-later.ts"],
            areas: []
          },
          signal: controller.signal
        },
        {
          // Cancel at the early file's chunk yield, before EOF. A missing later path detects accidental admission.
          yieldAdmission: async () => {
            yields += 1;
            controller.abort();
          },
          createWorker: () => {
            workers += 1;
            throw new Error("unexpected Worker");
          }
        }
      );
      assert.deepEqual(result, { kind: "cancelled" });
      assert.equal(yields, 1);
      assert.equal(workers, 0);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  it("cancels a submitted real Worker once and retains rejection facts without waiver audit", async () => {
    const root = createRoot("vibe-check-function-real-worker-cancel-");
    const controller = new AbortController();
    let posted = 0;
    let unsubscribed = 0;
    let terminated = 0;
    let lateListeners:
      | Parameters<ReturnType<typeof createNodeFunctionMetricsWorker>["subscribe"]>[0]
      | undefined;
    try {
      writeFileSync(join(root, "src/input.ts"), "function branch(value) { return value ? 1 : 0; }");
      writeFileSync(join(root, "src/rejected.md"), "unsupported input");
      const check = functionMetrics({
        codeAreas: { source: { files: { patterns: ["src/*"] } } },
        findingWaivers: [
          {
            identity: {
              functionName: "missing",
              metric: "parameter-count",
              path: "src/input.ts",
              startLine: 1
            },
            reason: "An incomplete result must not audit waivers."
          }
        ]
      });
      const observed = await execute(
        (context) =>
          executeFunctionMetrics(context, {
            measurement: {
              createWorker: () => {
                const worker = createNodeFunctionMetricsWorker();
                return {
                  subscribe: (listeners) => {
                    lateListeners = listeners;
                    const unsubscribe = worker.subscribe(listeners);
                    return () => {
                      unsubscribed += 1;
                      unsubscribe();
                    };
                  },
                  postMessage: (request) => {
                    worker.postMessage(request);
                    posted += 1;
                    controller.abort();
                  },
                  terminate: () => {
                    terminated += 1;
                    worker.terminate();
                  }
                };
              }
            }
          }),
        check.options,
        root,
        controller.signal
      );
      assert.equal(observed.result.status, "unavailable");
      if (observed.result.status !== "unavailable") throw new Error("expected unavailable");
      assert.deepEqual(observed.result.reason, { code: "cancelled" });
      assert.equal(Object.hasOwn(observed.result, "data"), false);
      assert.equal(posted, 1);
      assert.equal(unsubscribed, 1);
      assert.equal(terminated, 1);
      assert.equal(observed.records.length, 1);
      const rejection = observed.records[0];
      if (rejection === undefined) throw new Error("expected earlier rejection Record");
      assert.equal(recordField(rejection, "kind"), "input-rejected");
      assert.equal(
        observed.result.messages?.some(({ code }) => code === "input-rejected"),
        true
      );
      assert.ok(lateListeners);
      lateListeners.message({ kind: "complete", metrics: [] });
      lateListeners.error();
      lateListeners.exit(0);
      assert.equal(unsubscribed, 1);
      assert.equal(terminated, 1);
      assert.equal(observed.records.length, 1);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });
});

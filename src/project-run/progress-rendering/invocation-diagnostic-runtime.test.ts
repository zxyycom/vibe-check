import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { defineConfig } from "../../project-definition/project-definition.ts";
import { executeValidatedRun } from "../invocation.ts";
import type { DiagnosticObservation } from "../diagnostic-logging/logger.ts";

describe("Package Run diagnostic logging output", () => {
  it("closes diagnostic logging once after an unexpected nonconfiguration failure", async () => {
    let closeCalls = 0;
    const result = await executeValidatedRun(
      defineConfig({
        checks: [],
        outputs: {
          diagnosticLogging: { enabled: true },
          machinePublication: { enabled: false },
          progressRendering: { enabled: false }
        }
      }),
      {},
      [],
      {
        clock: {
          now: (): never => {
            throw new Error("clock fault");
          }
        },
        diagnosticLoggerFactory: () =>
          Object.freeze({
            close: () => {
              closeCalls += 1;
              return "succeeded" as const;
            },
            observe: () => undefined
          })
      }
    );

    assert.equal(result.kind, "execution");
    if (result.kind !== "execution") return;
    assert.deepEqual(result.diagnostic, { code: "task-engine-failed" });
    assert.equal(closeCalls, 1);
    assert.equal(result.outputs.diagnosticLogging.status, "succeeded");
  });
});

describe("Package Run diagnostic logging output", () => {
  it("hands enabled diagnostics to the Scheduler for one terminal human summary", async () => {
    const observations: DiagnosticObservation[] = [];
    const result = await executeValidatedRun(
      defineConfig({
        checks: [],
        outputs: {
          diagnosticLogging: { enabled: true },
          machinePublication: { enabled: false },
          progressRendering: { enabled: false }
        }
      }),
      {},
      [],
      {
        diagnosticLoggerFactory: () =>
          Object.freeze({
            close: () => "succeeded" as const,
            observe: (observation: DiagnosticObservation) => {
              observations.push(observation);
            }
          })
      }
    );

    assert.equal(result.kind, "completed");
    if (result.kind !== "completed") return;
    const summaries = observations.filter(
      (observation) => observation.event === "scheduler.summary"
    );
    assert.equal(summaries.length, 1);
    const details = summaries[0]?.details;
    assert.ok(details !== null && typeof details === "object");
    assert.equal(Reflect.get(details, "declarativeFingerprint"), result.declarativeFingerprint);
  });
});

describe("Package Run diagnostic logging output", () => {
  it("does not sample Scheduler diagnostics when diagnostic logging is disabled", async () => {
    const observations: DiagnosticObservation[] = [];
    let clockReads = 0;
    const result = await executeValidatedRun(
      defineConfig({
        checks: [],
        outputs: {
          diagnosticLogging: { enabled: false },
          machinePublication: { enabled: false },
          progressRendering: { enabled: false }
        }
      }),
      {},
      [],
      {
        clock: Object.freeze({
          now: () => {
            clockReads += 1;
            if (clockReads > 2) throw new Error("unexpected Scheduler diagnostic sample");
            return 0;
          }
        }),
        diagnosticLoggerFactory: (input) => {
          assert.equal(input.enabled, false);
          return Object.freeze({
            close: () => "disabled" as const,
            observe: (observation: DiagnosticObservation) => {
              observations.push(observation);
            }
          });
        }
      }
    );

    assert.equal(result.kind, "completed");
    assert.equal(clockReads, 2);
    assert.equal(
      observations.some((observation) => observation.event === "scheduler.summary"),
      false
    );
  });
});

describe("Scheduler measurement Hook output", () => {
  it("keeps settled facts while making Hook failures visible", async () => {
    const calls: string[] = [];
    const result = await executeValidatedRun(
      defineConfig({
        checks: [],
        outputs: {
          diagnosticLogging: { enabled: false },
          machinePublication: { enabled: false },
          progressRendering: { enabled: false }
        },
        scheduler: {
          measurementHooks: [
            () => {
              calls.push("failed");
              throw new Error("measurement failure");
            },
            () => calls.push("settled")
          ]
        }
      }),
      {},
      []
    );

    assert.deepEqual(calls, ["failed", "settled"]);
    assert.equal(result.kind, "output");
    if (result.kind !== "output") return;
    assert.deepEqual(result.diagnostic, {
      code: "scheduler-measurement-hooks-failed"
    });
    assert.equal(result.outputs.measurementHooks.status, "failed");
    assert.deepEqual(result.snapshot.checks, []);
  });
});

describe("Scheduler measurement Hook output", () => {
  it("marks all successfully settled configured Hooks as succeeded", async () => {
    let calls = 0;
    const result = await executeValidatedRun(
      defineConfig({
        checks: [],
        outputs: {
          diagnosticLogging: { enabled: false },
          machinePublication: { enabled: false },
          progressRendering: { enabled: false }
        },
        scheduler: {
          measurementHooks: [
            () => {
              calls += 1;
            }
          ]
        }
      }),
      {},
      []
    );

    assert.equal(calls, 1);
    assert.equal(result.kind, "completed");
    assert.deepEqual(result.outputs.measurementHooks, {
      enabled: true,
      status: "succeeded"
    });
  });

  it("preserves execution cancellation when a measurement Hook fails after drain", async () => {
    const controller = new AbortController();
    let entered: (() => void) | undefined;
    const executionEntered = new Promise<void>((resolve) => {
      entered = resolve;
    });
    const cancelled = executeValidatedRun(
      defineConfig({
        checks: [
          {
            checkId: "waiting",
            displayName: "Waiting",
            execution: async ({ signal }) => {
              entered?.();
              await new Promise<void>((resolve) =>
                signal.addEventListener("abort", () => resolve(), {
                  once: true
                })
              );
              return { data: {}, status: "passed" };
            }
          }
        ],
        outputs: {
          diagnosticLogging: { enabled: false },
          machinePublication: { enabled: false },
          progressRendering: { enabled: false }
        },
        scheduler: {
          measurementHooks: [() => Promise.reject(new Error("measurement failure"))]
        }
      }),
      { signal: controller.signal },
      []
    );

    await executionEntered;
    controller.abort();
    const result = await cancelled;

    assert.equal(result.kind, "cancelled");
    if (result.kind !== "cancelled") return;
    assert.equal(result.phase, "execution");
    assert.equal(result.outputs.measurementHooks.status, "failed");
    assert.equal("diagnostic" in result, false);
  });

  it("preserves an admission-policy failure when a measurement Hook fails after drain", async () => {
    const result = await executeValidatedRun(
      defineConfig({
        checks: [
          {
            checkId: "never-started",
            displayName: "Never started",
            execution: () => ({ data: {}, status: "passed" })
          }
        ],
        outputs: {
          diagnosticLogging: { enabled: false },
          machinePublication: { enabled: false },
          progressRendering: { enabled: false }
        },
        scheduler: {
          admissionPolicy: {
            kind: "custom",
            proposeAdmission: () => {
              throw new Error("policy failure");
            }
          },
          measurementHooks: [() => Promise.reject(new Error("measurement failure"))]
        }
      }),
      {},
      []
    );

    assert.equal(result.kind, "execution");
    if (result.kind !== "execution") return;
    assert.deepEqual(result.diagnostic, { code: "admission-policy-failed" });
    assert.equal(result.outputs.measurementHooks.status, "failed");
  });
});

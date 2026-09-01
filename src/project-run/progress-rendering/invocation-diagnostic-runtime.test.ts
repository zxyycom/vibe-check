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
    assert.equal(
      observations.filter((observation) => observation.event === "scheduler.summary").length,
      1
    );
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

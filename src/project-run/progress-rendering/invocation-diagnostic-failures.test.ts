import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { basename, join } from "node:path";
import { describe, it } from "node:test";

import { executeValidatedRun } from "../invocation.ts";
import type { DiagnosticObservation } from "../diagnostic-logging/logger.ts";
import type { AdmissionSelectionPolicy } from "../task-scheduler/admission-selection-policy.ts";
import { check, definition } from "./invocation.test-support.ts";

describe("Package Run diagnostic logging output", () => {
  it("isolates a scheduler channel writer failure while retaining core channel evidence and facts", async () => {
    const root = mkdtempSync(join(tmpdir(), "vibe-check-diagnostic-failure-"));
    try {
      const coreObservations: DiagnosticObservation[] = [];
      const result = await executeValidatedRun(
        definition([
          check({
            execution: ({ records }) => {
              records.report({ id: "accepted" }, { source: "callback" });
              return { status: "passed", data: { accepted: true } };
            }
          })
        ]),
        {
          outputs: { diagnosticLogging: { directory: "diagnostic", enabled: true } },
          projectRoot: root
        },
        [],
        {
          diagnosticLoggerFactory: (input) => {
            if (basename(input.file ?? "")?.startsWith("scheduler-")) {
              return Object.freeze({
                close: () => "succeeded" as const,
                observe: (): never => {
                  throw new Error("scheduler append failed");
                }
              });
            }
            return Object.freeze({
              close: () => "succeeded" as const,
              observe: (observation: DiagnosticObservation) => coreObservations.push(observation)
            });
          }
        }
      );

      assert.equal(result.kind, "output");
      if (result.kind !== "output") return;
      assert.deepEqual(result.diagnostic, { code: "diagnostic-logging-failed" });
      assert.deepEqual(result.snapshot.checks[0]?.outcome, {
        status: "passed",
        data: { accepted: true }
      });
      assert.deepEqual(result.snapshot.records, [
        { checkId: "custom", id: "accepted", data: { source: "callback" } }
      ]);
      assert.equal(result.outputs.diagnosticLogging.status, "failed");
      assert.equal(result.outputs.diagnosticLogging.channels.core.status, "succeeded");
      assert.equal(result.outputs.diagnosticLogging.channels.scheduler.status, "failed");
      assert.equal(result.outputs.diagnosticLogging.channels.learnedAdmission.status, "disabled");
      assert.ok(coreObservations.some((observation) => observation.event === "check.finished"));
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  it("closes diagnostic channels before progress after a diagnostic close failure", async () => {
    const events: string[] = [];
    const result = await executeValidatedRun(
      definition([check()], true),
      { outputs: { diagnosticLogging: { directory: "diagnostic", enabled: true } } },
      [],
      {
        admissionStrategyProviderFactory: () =>
          Object.freeze({
            prepare: async () =>
              Object.freeze({
                get admissionPolicy(): AdmissionSelectionPolicy {
                  throw new Error("task engine setup failed");
                },
                completion: Object.freeze({ kind: "none" as const }),
                observeAdmittedTask: undefined,
                requiresTerminalMeasurement: false
              })
          }),
        diagnosticLoggerFactory: (input) => {
          const channel = basename(input.file ?? "").startsWith("core-") ? "core" : "scheduler";
          return Object.freeze({
            close: () => {
              events.push(`diagnostic.close:${channel}`);
              if (channel === "core") throw new Error("core close failed");
              return "succeeded" as const;
            },
            observe: (observation: DiagnosticObservation) => {
              if (observation.event === "run.terminal-before-log-close") events.push("terminal");
            }
          });
        },
        progressWriterFactory: () =>
          Object.freeze({
            color: false,
            isTTY: false,
            term: undefined,
            write: () => undefined,
            close: () => events.push("progress.close")
          })
      }
    );

    assert.equal(result.kind, "execution");
    if (result.kind !== "execution") return;
    assert.deepEqual(result.diagnostic, { code: "task-engine-failed" });
    assert.equal(result.outputs.diagnosticLogging.status, "failed");
    assert.equal(result.outputs.diagnosticLogging.channels.core.status, "failed");
    assert.equal(result.outputs.diagnosticLogging.channels.scheduler.status, "succeeded");
    assert.deepEqual(events, [
      "terminal",
      "diagnostic.close:core",
      "diagnostic.close:scheduler",
      "progress.close"
    ]);
  });
});

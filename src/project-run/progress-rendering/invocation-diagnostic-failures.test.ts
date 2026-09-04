import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { basename, join } from "node:path";
import { describe, it } from "node:test";

import { executeValidatedRun } from "../invocation.ts";
import type { DiagnosticObservation } from "../diagnostic-logging/logger.ts";
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
});

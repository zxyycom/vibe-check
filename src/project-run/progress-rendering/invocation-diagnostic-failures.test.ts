import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, it } from "node:test";

import { executeValidatedRun } from "../invocation.ts";
import { check, definition, DIAGNOSTIC_FILE } from "./invocation.test-support.ts";

describe("Package Run diagnostic logging output", () => {
  it("contains diagnostic logger implementation failures without revising final facts", async () => {
    const root = mkdtempSync(join(tmpdir(), "vibe-check-diagnostic-failure-"));
    try {
      const source = definition([
        check({
          execution: ({ records }) => {
            records.report({ id: "accepted" }, { source: "callback" });
            return { status: "passed", data: { accepted: true } };
          }
        })
      ]);
      const failures = [
        "factory-throws",
        "observe-throws",
        "close-failed",
        "close-throws"
      ] as const;
      for (const failure of failures) {
        let delegateCloseCalls = 0;
        let delegateObserveCalls = 0;
        const result = await executeValidatedRun(
          source,
          {
            outputs: { diagnosticLogging: { directory: "diagnostic", enabled: true } },
            projectRoot: root
          },
          [],
          {
            diagnosticLoggerFactory: () => {
              if (failure === "factory-throws") throw new Error("logger creation failed");
              return Object.freeze({
                close: () => {
                  delegateCloseCalls += 1;
                  if (failure === "close-throws") throw new Error("logger close failed");
                  return failure === "close-failed" ? "failed" : "succeeded";
                },
                observe: () => {
                  delegateObserveCalls += 1;
                  if (failure === "observe-throws") throw new Error("logger append failed");
                }
              });
            }
          }
        );

        assertDiagnosticLoggerFailure({
          delegateCloseCalls,
          delegateObserveCalls,
          failure,
          result
        });
      }
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });
});

function assertDiagnosticLoggerFailure(
  input: Readonly<{
    readonly delegateCloseCalls: number;
    readonly delegateObserveCalls: number;
    readonly failure: "factory-throws" | "observe-throws" | "close-failed" | "close-throws";
    readonly result: Awaited<ReturnType<typeof executeValidatedRun>>;
  }>
): void {
  assert.equal(input.result.kind, "output", input.failure);
  if (input.result.kind !== "output") return;
  assert.deepEqual(input.result.diagnostic, { code: "diagnostic-logging-failed" }, input.failure);
  assert.deepEqual(input.result.snapshot.checks[0]?.outcome, {
    status: "passed",
    data: { accepted: true }
  });
  assert.deepEqual(input.result.snapshot.records, [
    { checkId: "custom", id: "accepted", data: { source: "callback" } }
  ]);
  assert.deepEqual(input.result.checkMessages, []);
  assert.equal(input.result.outputs.machinePublication.status, "disabled");
  assert.equal(input.result.outputs.progressRendering.status, "disabled");
  assert.equal(input.result.outputs.diagnosticLogging.enabled, true);
  assert.equal(input.result.outputs.diagnosticLogging.status, "failed");
  assert.match(input.result.outputs.diagnosticLogging.file ?? "", DIAGNOSTIC_FILE);
  assert.equal(input.delegateCloseCalls, input.failure === "factory-throws" ? 0 : 1, input.failure);
  if (input.failure === "factory-throws")
    assert.equal(input.delegateObserveCalls, 0, input.failure);
  else if (input.failure === "observe-throws") {
    assert.equal(input.delegateObserveCalls, 1, input.failure);
  } else {
    assert.ok(input.delegateObserveCalls > 1, input.failure);
  }
}

import assert from "node:assert/strict";
import { describe, it } from "node:test";

import type { CoreSnapshot } from "../../check-settlement/facts.ts";
import { defineConfig } from "../../project-definition/project-definition.ts";
import type { Check } from "../../check/check.ts";
import { resolveFinalRunResult } from "../completion/result-resolver.ts";
import type { RunOutputStatus, RunOutputStatuses } from "../outputs/status.ts";
import { outputFailure, type NonConfigurationRunResult, type RunResultFacts } from "../result.ts";
import type { ProgressWriter } from "./renderer.ts";
import { executeValidatedRun } from "../invocation/run.ts";

const PASSED = Object.freeze({ status: "passed" as const, data: Object.freeze({}) });

function definition(checks: readonly Check[]) {
  return defineConfig({
    checks,
    outputs: {
      machinePublication: { enabled: false },
      progressRendering: { enabled: true }
    }
  });
}

function check(checkId = "custom", execution: Check["execution"] = () => PASSED): Check {
  return { checkId, displayName: "Custom", execution };
}

function failingProgressWriter(): ProgressWriter {
  return {
    color: false,
    isTTY: false,
    term: undefined,
    write: (): void => {
      throw new Error("progress stream closed");
    }
  };
}

function capturedProgressWriter(throwAtWrite: number) {
  const attempts: string[] = [];
  const writes: string[] = [];
  const writer: ProgressWriter = {
    color: false,
    isTTY: false,
    term: undefined,
    write: (content: string): void => {
      attempts.push(content);
      if (attempts.length === throwAtWrite) throw new Error("progress stream closed");
      writes.push(content);
    }
  };
  return { attempts, writes, writer };
}

describe("Package Run progress result priority", () => {
  it("keeps an execution failure distinct when progress presentation has failed", async () => {
    let reads = 0;
    const clock = Object.freeze({
      now: (): number => {
        reads += 1;
        if (reads === 1) return 0;
        throw new Error("execution clock failed");
      }
    });
    const result = await executeValidatedRun(definition([check()]), {}, [], {
      clock,
      progressWriterFactory: failingProgressWriter
    });

    assert.equal(result.kind, "execution");
    if (result.kind !== "execution") return;
    assert.deepEqual(result.diagnostic, { code: "task-engine-failed" });
    assert.equal(result.outputs.progressRendering.status, "failed");
  });

  it("mutes ordinary progress events after a settled writer failure while preserving final facts", async () => {
    const output = capturedProgressWriter(2);
    const result = await executeValidatedRun(
      definition([
        check("first", () => ({
          status: "passed",
          data: {},
          messages: [{ level: "info", code: "writer-retained", message: "retained message" }]
        })),
        check("second")
      ]),
      {},
      [],
      { progressWriterFactory: () => output.writer }
    );

    assert.equal(result.kind, "output");
    if (result.kind !== "output") return;
    assert.deepEqual(result.diagnostic, { code: "progress-rendering-failed" });
    assert.equal(result.outputs.progressRendering.status, "failed");
    assert.equal(output.attempts.length, 2);
    assert.equal(output.attempts[0], "Vibe Check\ntotal 2 checks\n\nChecks:\n");
    assert.match(
      output.attempts[1] ?? "",
      /^ {2}\[1\/2] Custom \| passed \| \d+(?:\.\d+)?(?:ms|s)\n {4}\[info] retained message\n$/
    );
    assert.deepEqual(output.writes, ["Vibe Check\ntotal 2 checks\n\nChecks:\n"]);
    assert.deepEqual(
      result.snapshot.checks.map(({ checkId, outcome }) => ({ checkId, outcome })),
      [
        { checkId: "first", outcome: PASSED },
        { checkId: "second", outcome: PASSED }
      ]
    );
    assert.deepEqual(result.checkMessages, [
      {
        checkId: "first",
        level: "info",
        code: "writer-retained",
        message: "retained message"
      }
    ]);
  });

  it("keeps execution cancellation distinct when progress presentation has failed", async () => {
    const controller = new AbortController();
    const result = await executeValidatedRun(
      definition([
        {
          checkId: "started",
          displayName: "Started",
          execution: () => {
            controller.abort();
            return PASSED;
          }
        },
        check("unstarted")
      ]),
      { signal: controller.signal },
      [],
      { progressWriterFactory: failingProgressWriter }
    );

    assert.equal(result.kind, "cancelled");
    if (result.kind !== "cancelled" || result.phase !== "execution") return;
    assert.equal(result.outputs.progressRendering.status, "failed");
    assert.equal(result.snapshot.checks.length, 2);
  });

  it("resolves closed output statuses without replacing primary results", () => {
    const unclosedOutputs = outputStatuses();
    const completed = completedCandidate(unclosedOutputs);
    for (const [outputs, expectedDiagnostic] of [
      [outputStatuses({ measurementHooks: "failed" }), "scheduler-measurement-hooks-failed"],
      [outputStatuses({ diagnosticLogging: "failed" }), "diagnostic-logging-failed"],
      [outputStatuses({ machinePublication: "failed" }), "machine-publication-failed"],
      [
        outputStatuses({
          diagnosticLogging: "failed",
          machinePublication: "failed",
          progressRendering: "failed"
        }),
        "progress-rendering-failed"
      ]
    ] as const) {
      const resolved = resolveFinalRunResult(completed, outputs);

      assert.equal(resolved.kind, "output");
      if (resolved.kind !== "output") continue;
      assert.equal(resolved.diagnostic.code, expectedDiagnostic);
      assertFinalFacts(resolved);
    }

    const closedOutputs = outputStatuses({
      diagnosticLogging: "failed",
      machinePublication: "failed",
      progressRendering: "failed"
    });
    const existingOutputStatuses = outputStatuses({ machinePublication: "failed" });
    const existingOutput = outputFailure(
      "declarative-fingerprint",
      EMPTY_WARNINGS,
      existingOutputStatuses,
      "machinePublication",
      FINAL_FACTS
    );
    const reselected = resolveFinalRunResult(existingOutput, closedOutputs);
    assert.equal(reselected.kind, "output");
    if (reselected.kind !== "output") return;
    assert.equal(reselected.diagnostic.code, "progress-rendering-failed");
    assertFinalFacts(reselected);

    for (const candidate of [
      planningCandidate(unclosedOutputs),
      executionCandidate(unclosedOutputs),
      preWorkCancellationCandidate(unclosedOutputs)
    ]) {
      const resolved = resolveFinalRunResult(candidate, closedOutputs);
      assert.equal(resolved.kind, candidate.kind);
      assert.equal(resolved.outputs, closedOutputs);
    }
  });
});

const EMPTY_WARNINGS = Object.freeze([]);
const EMPTY_SNAPSHOT: CoreSnapshot = Object.freeze({
  checks: Object.freeze([]),
  records: Object.freeze([])
});
const FINAL_FACTS: RunResultFacts = Object.freeze({
  aggregate: null,
  checkDurations: Object.freeze([{ checkId: "custom", durationMs: 1 }]),
  checkMessages: Object.freeze([
    { checkId: "custom", code: "retained", level: "info" as const, message: "retained message" }
  ]),
  snapshot: EMPTY_SNAPSHOT
});

function outputStatuses(
  overrides: Partial<Record<keyof RunOutputStatuses, RunOutputStatus["status"]>> = {}
): RunOutputStatuses {
  const statusFor = (output: keyof RunOutputStatuses): RunOutputStatus =>
    outputStatus(overrides[output] ?? "disabled");
  const diagnosticLogging = statusFor("diagnosticLogging");
  return Object.freeze({
    diagnosticLogging: Object.freeze({
      ...diagnosticLogging,
      channels: Object.freeze({
        core: Object.freeze({ ...diagnosticLogging, file: null }),
        learnedAdmission: Object.freeze({ ...diagnosticLogging, file: null }),
        scheduler: Object.freeze({ ...diagnosticLogging, file: null })
      })
    }),
    machinePublication: statusFor("machinePublication"),
    measurementHooks: statusFor("measurementHooks"),
    progressRendering: statusFor("progressRendering")
  });
}

function outputStatus(status: RunOutputStatus["status"]): RunOutputStatus {
  return Object.freeze({ enabled: status !== "disabled", status });
}

function completedCandidate(
  outputs: RunOutputStatuses
): Extract<NonConfigurationRunResult, { readonly kind: "completed" }> {
  return Object.freeze({
    kind: "completed",
    declarativeFingerprint: "declarative-fingerprint",
    definitionWarnings: EMPTY_WARNINGS,
    outputs,
    ...FINAL_FACTS
  });
}

function planningCandidate(
  outputs: RunOutputStatuses
): Extract<NonConfigurationRunResult, { readonly kind: "planning" }> {
  return Object.freeze({
    kind: "planning",
    declarativeFingerprint: "declarative-fingerprint",
    definitionWarnings: EMPTY_WARNINGS,
    diagnostic: Object.freeze({ code: "task-graph-invalid" }),
    outputs
  });
}

function executionCandidate(
  outputs: RunOutputStatuses
): Extract<NonConfigurationRunResult, { readonly kind: "execution" }> {
  return Object.freeze({
    kind: "execution",
    declarativeFingerprint: "declarative-fingerprint",
    definitionWarnings: EMPTY_WARNINGS,
    diagnostic: Object.freeze({ code: "task-engine-failed" }),
    outputs
  });
}

function preWorkCancellationCandidate(
  outputs: RunOutputStatuses
): Extract<NonConfigurationRunResult, { readonly kind: "cancelled" }> {
  return Object.freeze({
    kind: "cancelled",
    declarativeFingerprint: "declarative-fingerprint",
    definitionWarnings: EMPTY_WARNINGS,
    outputs,
    phase: "pre-work"
  });
}

function assertFinalFacts(
  result: Extract<NonConfigurationRunResult, { readonly kind: "output" }>
): void {
  assert.equal(result.aggregate, FINAL_FACTS.aggregate);
  assert.equal(result.checkDurations, FINAL_FACTS.checkDurations);
  assert.equal(result.checkMessages, FINAL_FACTS.checkMessages);
  assert.equal(result.snapshot, FINAL_FACTS.snapshot);
}

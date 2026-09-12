import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { defineCheck } from "../../check/check.ts";
import type { NormalizedCheck } from "../../project-definition/project-definition.ts";
import type { DiagnosticObservation } from "../diagnostic-logging/logger.ts";
import { executeResolvedChecks } from "./resolved-checks.ts";
import {
  PROJECT,
  definedHandoff,
  diagnosticDetailsRecord,
  normalized,
  recordingLogger
} from "./resolved-checks.test-support.ts";

describe("Package Run direct Check handoff execution", () => {
  it("does not expose declared-provider handoffs in containment or cancellation diagnostics", async () => {
    await assertContainedDiagnosticOmitsHandoff();
    await assertCancelledDiagnosticOmitsHandoff();
  });
});

async function assertContainedDiagnosticOmitsHandoff(): Promise<void> {
  const handoff = Object.freeze({ privateToken: "containment-secret" });
  const observations: DiagnosticObservation[] = [];
  const provider = defineCheck({
    checkId: "contained-handoff-provider",
    displayName: "Contained handoff provider",
    handoff: true,
    execution: ({ records }) => {
      records.report({ id: "duplicate" }, { ordinal: 1 });
      records.report({ id: "duplicate" }, { ordinal: 2 });
      return { status: "passed", data: { visible: true }, handoff };
    }
  });

  const execution = await executeHandoffProvider(provider, observations, undefined);

  assert.equal(execution.kind, "completed");
  assert.deepEqual(execution.snapshot.checks[0]?.outcome, {
    status: "unavailable",
    reason: { code: "record-conflict" }
  });
  assertDiagnosticResultIsHandoffFree(
    diagnosticDetailsRecord(
      observations.find((observation) => observation.event === "check.contained")?.details
    ).raw,
    handoff
  );
}

async function assertCancelledDiagnosticOmitsHandoff(): Promise<void> {
  const controller = new AbortController();
  const handoff = Object.freeze({ privateToken: "cancellation-secret" });
  const observations: DiagnosticObservation[] = [];
  const provider = defineCheck({
    checkId: "cancelled-handoff-provider",
    displayName: "Cancelled handoff provider",
    handoff: true,
    execution: () => {
      controller.abort();
      return { status: "passed", data: { visible: true }, handoff };
    }
  });

  const execution = await executeHandoffProvider(provider, observations, controller.signal);

  assert.equal(execution.kind, "cancelled");
  assert.deepEqual(execution.snapshot.checks[0]?.outcome, {
    status: "unavailable",
    reason: { code: "execution-cancelled" }
  });
  assertDiagnosticResultIsHandoffFree(
    diagnosticDetailsRecord(
      observations.find((observation) => observation.event === "callback.cancelled")?.details
    ).result,
    handoff
  );
}

function assertDiagnosticResultIsHandoffFree(
  result: unknown,
  handoff: Readonly<{ readonly privateToken: string }>
): void {
  assert.deepEqual(result, { status: "passed", data: { visible: true } });
  assert.notEqual(result, handoff);
  assert.equal(Object.hasOwn(result as object, "handoff"), false);
  assert.doesNotMatch(JSON.stringify(result), /secret/);
}

/** Runs one declared provider with a recording diagnostic channel for handoff-boundary assertions. */
function executeHandoffProvider(
  provider: Readonly<{
    readonly checkId: string;
    readonly displayName: string;
    readonly execution: NormalizedCheck["execution"];
  }>,
  observations: DiagnosticObservation[],
  signal: AbortSignal | undefined
) {
  return executeResolvedChecks({
    checks: [
      normalized(provider.execution, {
        checkId: provider.checkId,
        displayName: provider.displayName,
        handoff: definedHandoff(provider)
      })
    ],
    diagnosticLogger: recordingLogger(observations),
    maxParallel: 1,
    project: PROJECT,
    signal
  });
}

import { diagnosticTags } from "../diagnostic-logging/logger.ts";
import {
  planning,
  preExecutionCancellation,
  type NonConfigurationRunResult,
  type RunDiagnostic
} from "../result.ts";
import type { Invocation } from "./run.ts";

/** Records a pre-execution cancellation as the Run-owned candidate result. */
export function cancelledBeforeExecution(
  invocation: Invocation,
  phase: "pre-work" | "planning"
): NonConfigurationRunResult {
  invocation.diagnosticLogging.core.observe({
    event: "run.cancelled",
    tags: diagnosticTags("RUN", "CANCELLED"),
    details: { phase }
  });
  return preExecutionCancellation(
    invocation.declarativeFingerprint,
    invocation.definitionWarnings,
    invocation.outputs.value(),
    phase
  );
}

/** Constructs the planning failure candidate after the static graph has been rejected. */
export function planningResult(
  invocation: Invocation,
  code: Extract<RunDiagnostic["code"], "task-graph-invalid">
): NonConfigurationRunResult {
  return planning(
    invocation.declarativeFingerprint,
    invocation.definitionWarnings,
    invocation.outputs.value(),
    code
  );
}

/** Constructs a pre-settlement execution failure without revising existing output facts. */
export function executionResult(
  invocation: Invocation,
  code: Extract<
    RunDiagnostic["code"],
    "admission-strategy-preparation-failed" | "task-engine-failed"
  >
): NonConfigurationRunResult {
  return Object.freeze({
    kind: "execution",
    declarativeFingerprint: invocation.declarativeFingerprint,
    definitionWarnings: invocation.definitionWarnings,
    diagnostic: Object.freeze({ code }),
    outputs: invocation.outputs.value()
  });
}

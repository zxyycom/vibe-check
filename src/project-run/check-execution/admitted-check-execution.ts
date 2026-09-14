/** Handles one admitted Check's preparation boundary and ready callback handoff. */

import type { CheckProjectContext } from "../../check/check.ts";
import type { NormalizedCheck } from "../../project-definition/project-definition.ts";
import type { ResolvedInvocationPaths } from "../invocation/paths.ts";
import { checkIdentity } from "./execution-finalization.ts";
import { recordSettledCheck, type CheckExecutionState } from "./execution-settlement.ts";
import { prepareCheck, type CheckPreparationResolution } from "./preparation.ts";
import { executeReadyCheck } from "./ready-check-execution.ts";

export type CheckExecutionClock = Readonly<{ now(): number }>;

export type AdmittedCheckExecutionInput = CheckExecutionState &
  Readonly<{
    readonly check: NormalizedCheck;
    readonly clock: CheckExecutionClock;
    readonly onAdmittedCheck: ((check: NormalizedCheck) => void) | undefined;
    readonly invocationId: string;
    readonly paths: ResolvedInvocationPaths | undefined;
    readonly project: CheckProjectContext;
    readonly signal: AbortSignal;
  }>;

export async function executeAdmittedCheck(input: AdmittedCheckExecutionInput): Promise<boolean> {
  observeAdmittedCheck(input);
  const preparation = await prepareCheck({
    check: input.check,
    diagnosticLogger: input.diagnosticLogger,
    signal: input.signal
  });
  if (preparation.kind === "blocked") {
    settleBlockedPreparation(input, preparation);
    return false;
  }
  return executeReadyCheck({ ...input, prepare: preparation });
}

function settleBlockedPreparation(
  state: CheckExecutionState,
  prepare: Extract<CheckPreparationResolution, { readonly kind: "blocked" }>
): void {
  const scope = state.session.openCheckScope(prepare.check.definition.checkId);
  const outcome = scope.settleProduct(prepare.outcome);
  recordSettledCheck({
    check: checkIdentity(prepare.check),
    durationMs: null,
    messages: prepare.check.preparationMessages,
    outcome,
    phase: "preparation",
    state
  });
}

/** Diagnostic observation belongs to the invocation; it cannot revise admitted Task facts. */
function observeAdmittedCheck(input: AdmittedCheckExecutionInput): void {
  try {
    input.onAdmittedCheck?.(input.check);
  } catch {
    // Learned diagnostic output is best-effort and has no execution consequence.
  }
}

/** Handles one admitted Check's preflight boundary and ready callback handoff. */

import type { CheckProjectContext } from "../../check/check.ts";
import type { NormalizedCheck } from "../../project-definition/project-definition.ts";
import type { ResolvedInvocationPaths } from "../invocation/paths.ts";
import { checkIdentity } from "./execution-finalization.ts";
import { recordSettledCheck, type CheckExecutionState } from "./execution-settlement.ts";
import { prepareCheck, type CheckPreflightResolution } from "./preflight.ts";
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
  const preflight = await prepareCheck({
    check: input.check,
    diagnosticLogger: input.diagnosticLogger,
    signal: input.signal
  });
  if (preflight.kind === "blocked") {
    settleBlockedPreflight(input, preflight);
    return false;
  }
  return executeReadyCheck({ ...input, preflight });
}

function settleBlockedPreflight(
  state: CheckExecutionState,
  preflight: Extract<CheckPreflightResolution, { readonly kind: "blocked" }>
): void {
  const scope = state.session.openCheckScope(preflight.check.definition.checkId);
  const outcome = scope.settleProduct(preflight.outcome);
  recordSettledCheck({
    check: checkIdentity(preflight.check),
    durationMs: null,
    messages: preflight.check.preflightMessages,
    outcome,
    phase: "preflight",
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

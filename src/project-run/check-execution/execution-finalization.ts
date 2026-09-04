import type { CheckMessage } from "../../check/check.ts";
import type { CoreSnapshot } from "../../check-settlement/facts.ts";
import type {
  NormalizedCheck,
  SchedulerMeasurementContext
} from "../../project-definition/project-definition.ts";
import type { SettledTask } from "../task-scheduler/scheduler.ts";
import type { CheckDuration, CheckRunMessage } from "../result.ts";
import {
  CheckExecutionInvariantFailure,
  recordSettledCheck,
  type CheckIdentity,
  type CheckExecutionState,
  type SettledCheckFacts
} from "./execution-settlement.ts";
import type { ResolvedCheckExecution } from "./resolved-execution-result.ts";

const EMPTY_MESSAGES: readonly CheckMessage[] = Object.freeze([]);

/** Closes the task graph, lifecycle facts, and canonical Check summaries as one Run boundary. */
export function closeResolvedChecks(
  input: Readonly<{
    readonly allChecks: readonly NormalizedCheck[];
    readonly effectiveCheckIds: readonly string[];
    readonly graphRun: Awaited<
      ReturnType<typeof import("../task-scheduler/scheduler.ts").runTaskGraph<boolean>>
    >;
    readonly state: CheckExecutionState;
  }>
): ResolvedCheckExecution {
  try {
    assertNoTaskEngineFailures(input.graphRun.settlements);
    if (input.graphRun.admissionPolicyFault !== undefined) {
      return closeAdmissionPolicyFailed({
        normalizedChecks: input.allChecks,
        state: input.state,
        terminalSchedulerMeasurement: input.graphRun.terminalMeasurement
      });
    }
    if (input.graphRun.cancelled) {
      return closeCancelledExecution({
        normalizedChecks: input.allChecks,
        state: input.state,
        terminalSchedulerMeasurement: input.graphRun.terminalMeasurement
      });
    }
    assertEveryCheckClosed(input.allChecks, input.graphRun.settlements);
    return completedResolvedExecution(
      input.effectiveCheckIds,
      input.state.session.freeze(),
      input.state,
      input.graphRun.terminalMeasurement
    );
  } catch (error) {
    throw trustedFailure(error);
  }
}

export function closeAdmissionPolicyFailed(
  input: Readonly<{
    readonly normalizedChecks: readonly NormalizedCheck[];
    readonly state: CheckExecutionState;
    readonly terminalSchedulerMeasurement?: SchedulerMeasurementContext;
  }>
): ResolvedCheckExecution {
  input.state.session.closeUnresolvedAsCancelled();
  const snapshot = input.state.session.freeze();
  settleUnstartedCancelledChecks({ ...input, snapshot });
  return resolvedExecution(
    "admission-policy-failed",
    snapshot,
    input.state,
    input.terminalSchedulerMeasurement
  );
}

export function closeCancelledExecution(
  input: Readonly<{
    readonly normalizedChecks: readonly NormalizedCheck[];
    readonly state: CheckExecutionState;
    readonly terminalSchedulerMeasurement?: SchedulerMeasurementContext;
  }>
): ResolvedCheckExecution {
  input.state.session.closeUnresolvedAsCancelled();
  const snapshot = input.state.session.freeze();
  settleUnstartedCancelledChecks({ ...input, snapshot });
  return resolvedExecution("cancelled", snapshot, input.state, input.terminalSchedulerMeasurement);
}

export function checkIdentity(
  check: Pick<NormalizedCheck, "definition" | "visibility">
): CheckIdentity {
  return Object.freeze({
    checkId: check.definition.checkId,
    displayName: check.definition.displayName,
    visibility: check.visibility
  });
}

export function trustedFailure(error: unknown): CheckExecutionInvariantFailure {
  return error instanceof CheckExecutionInvariantFailure
    ? error
    : new CheckExecutionInvariantFailure(
        "Check execution adapter escaped its contained failure boundary"
      );
}

function resolvedExecution(
  kind: Exclude<ResolvedCheckExecution["kind"], "completed">,
  snapshot: CoreSnapshot,
  state: CheckExecutionState,
  terminalSchedulerMeasurement: SchedulerMeasurementContext | undefined
): ResolvedCheckExecution {
  return Object.freeze({
    kind,
    ...checkRunSummaries(snapshot, state.settledFactsByCheckId),
    snapshot,
    ...(terminalSchedulerMeasurement === undefined ? {} : { terminalSchedulerMeasurement })
  });
}

function completedResolvedExecution(
  effectiveCheckIds: readonly string[],
  snapshot: CoreSnapshot,
  state: CheckExecutionState,
  terminalSchedulerMeasurement: SchedulerMeasurementContext | undefined
): Extract<ResolvedCheckExecution, { readonly kind: "completed" }> {
  return Object.freeze({
    kind: "completed",
    ...checkRunSummaries(snapshot, state.settledFactsByCheckId),
    effectiveCheckIds,
    snapshot,
    ...(terminalSchedulerMeasurement === undefined ? {} : { terminalSchedulerMeasurement })
  });
}

function settleUnstartedCancelledChecks(
  input: Readonly<{
    readonly normalizedChecks: readonly NormalizedCheck[];
    readonly snapshot: CoreSnapshot;
    readonly state: CheckExecutionState;
  }>
): void {
  const normalizedByCheckId = new Map(
    input.normalizedChecks.map((check) => [check.definition.checkId, check])
  );
  for (const check of input.snapshot.checks) {
    if (input.state.settledFactsByCheckId.has(check.checkId)) continue;
    const normalized = normalizedByCheckId.get(check.checkId);
    if (normalized === undefined) {
      throw new CheckExecutionInvariantFailure(
        "Cancelled Check does not identify a normalized Check"
      );
    }
    recordSettledCheck({
      check: checkIdentity(normalized),
      durationMs: null,
      messages: EMPTY_MESSAGES,
      outcome: check.outcome,
      phase: "execution",
      state: input.state
    });
  }
}

function checkRunSummaries(
  snapshot: CoreSnapshot,
  settledFactsByCheckId: ReadonlyMap<string, SettledCheckFacts>
): Readonly<{
  readonly checkDurations: readonly CheckDuration[];
  readonly checkMessages: readonly CheckRunMessage[];
}> {
  if (snapshot.checks.length !== settledFactsByCheckId.size) {
    throw new CheckExecutionInvariantFailure("Check settled facts do not close every Check");
  }
  const checkDurations: CheckDuration[] = [];
  const messages: CheckRunMessage[] = [];
  for (const check of snapshot.checks) {
    const settledFacts = settledFactsByCheckId.get(check.checkId);
    if (settledFacts === undefined) {
      throw new CheckExecutionInvariantFailure("Check settled facts are missing a Check");
    }
    checkDurations.push(
      Object.freeze({
        checkId: check.checkId,
        durationMs: settledFacts.durationMs
      })
    );
    messages.push(
      ...settledFacts.messages.map((message) =>
        Object.freeze({ checkId: check.checkId, ...message })
      )
    );
  }
  return Object.freeze({
    checkDurations: Object.freeze(checkDurations),
    checkMessages: messages.length === 0 ? Object.freeze([]) : Object.freeze(messages)
  });
}

/** Closes one Scheduler-blocked Check before a terminal observer may start. */
export function settleBlockedDependent(
  input: Readonly<{
    readonly check: NormalizedCheck;
    readonly dependencyIds: readonly string[];
    readonly state: CheckExecutionState;
  }>
): void {
  const scope = input.state.session.openCheckScope(input.check.definition.checkId);
  const outcome = scope.settleProduct(
    Object.freeze({
      status: "unavailable" as const,
      reason: Object.freeze({
        code: "dependency-not-passed",
        checkIds: Object.freeze([...input.dependencyIds])
      })
    })
  );
  recordSettledCheck({
    check: checkIdentity(input.check),
    durationMs: null,
    messages: EMPTY_MESSAGES,
    outcome,
    phase: "dependency",
    state: input.state
  });
}

function assertNoTaskEngineFailures(settlements: readonly SettledTask<boolean>[]): void {
  for (const settled of settlements) {
    if (settled.settlement.kind === "failed") {
      throw new CheckExecutionInvariantFailure(
        "Task engine received an unexpected execution failure"
      );
    }
  }
}

function assertEveryCheckClosed(
  checks: readonly NormalizedCheck[],
  settlements: readonly SettledTask<boolean>[]
): void {
  if (settlements.some((settled) => settled.settlement.kind === "cancelled-before-start")) {
    throw new CheckExecutionInvariantFailure("Non-cancelled Task graph left a Check unstarted");
  }
  if (checks.length !== settlements.length) {
    throw new CheckExecutionInvariantFailure(
      "Task graph does not have one Task per executable Check"
    );
  }
}

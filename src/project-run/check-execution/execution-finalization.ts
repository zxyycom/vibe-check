import type { CheckMessage } from "../../check/check.ts";
import type { CoreSnapshot } from "../../check-settlement/facts.ts";
import type { NormalizedCheck } from "../../project-definition/project-definition.ts";
import type { SettledTask } from "../task-scheduler/scheduler.ts";
import type { CheckDuration, CheckRunMessage } from "../result.ts";
import {
  CheckExecutionInvariantFailure,
  recordSettledCheck,
  type CheckIdentity,
  type SettledCheckFacts
} from "./execution-settlement.ts";
import type { PreparedCheck } from "./preparation-barrier.ts";
import type { CheckExecutionState, ResolvedCheckExecution } from "./resolved-checks.ts";

const EMPTY_MESSAGES: readonly CheckMessage[] = Object.freeze([]);

/** Closes the task graph, lifecycle facts, and canonical Check summaries as one Run boundary. */
export function closeResolvedChecks(
  input: Readonly<{
    readonly allChecks: readonly NormalizedCheck[];
    readonly graphRun: Awaited<
      ReturnType<typeof import("../task-scheduler/scheduler.ts").runTaskGraph<void>>
    >;
    readonly readyChecks: readonly PreparedCheck[];
    readonly state: CheckExecutionState;
  }>
): ResolvedCheckExecution {
  try {
    assertNoTaskEngineFailures(input.graphRun.settlements);
    if (input.graphRun.cancelled) {
      return closeCancelledExecution({
        normalizedChecks: input.allChecks,
        preparedChecks: input.readyChecks,
        state: input.state
      });
    }
    assertEveryCheckClosed(input.readyChecks, input.graphRun.settlements);
    return resolvedExecution("completed", input.state.session.freeze(), input.state);
  } catch (error) {
    throw trustedFailure(error);
  }
}

export function closeCancelledExecution(
  input: Readonly<{
    readonly normalizedChecks: readonly NormalizedCheck[];
    readonly preparedChecks: readonly PreparedCheck[];
    readonly state: CheckExecutionState;
  }>
): ResolvedCheckExecution {
  input.state.session.closeUnresolvedAsCancelled();
  const snapshot = input.state.session.freeze();
  settleUnstartedCancelledChecks({ ...input, snapshot });
  return resolvedExecution("cancelled", snapshot, input.state);
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
  kind: ResolvedCheckExecution["kind"],
  snapshot: CoreSnapshot,
  state: CheckExecutionState
): ResolvedCheckExecution {
  return Object.freeze({
    kind,
    ...checkRunSummaries(snapshot, state.settledFactsByCheckId),
    snapshot
  });
}

function settleUnstartedCancelledChecks(
  input: Readonly<{
    readonly normalizedChecks: readonly NormalizedCheck[];
    readonly preparedChecks: readonly PreparedCheck[];
    readonly snapshot: CoreSnapshot;
    readonly state: CheckExecutionState;
  }>
): void {
  const normalizedByCheckId = new Map(
    input.normalizedChecks.map((check) => [check.definition.checkId, check])
  );
  const preparedByCheckId = new Map(
    input.preparedChecks.map((check) => [check.definition.checkId, check])
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
      messages: preparedByCheckId.get(check.checkId)?.preflightMessages ?? EMPTY_MESSAGES,
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
      Object.freeze({ checkId: check.checkId, durationMs: settledFacts.durationMs })
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

function assertNoTaskEngineFailures(settlements: readonly SettledTask<void>[]): void {
  for (const settled of settlements) {
    if (settled.settlement.kind === "failed") {
      throw new CheckExecutionInvariantFailure(
        "Task engine received an unexpected execution failure"
      );
    }
    if (settled.settlement.kind === "blocked") {
      throw new CheckExecutionInvariantFailure("Task engine blocked a Product Check");
    }
  }
}

function assertEveryCheckClosed(
  checks: readonly NormalizedCheck[],
  settlements: readonly SettledTask<void>[]
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

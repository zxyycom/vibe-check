import type { CheckOutcome, CheckProjectContext } from "../definition/custom-check.ts";
import type { NormalizedCheck } from "../definition/project.ts";
import {
  createCoreCheckSession,
  type CoreCheckSession
} from "../quality-core/check-record/core-session.ts";
import type { CoreSnapshot } from "../quality-core/check-record/model.ts";
import { prepareTaskGraph, runTaskGraph, type SettledTask } from "../task-scheduler/index.ts";
import { executeCheckCallback } from "./check-callback.ts";
import { planStaticCheckGraph } from "./check-execution-plan.ts";
import type { CheckDuration } from "./result.ts";

const INERT_SIGNAL = new AbortController().signal;
const SYSTEM_MONOTONIC_CLOCK: CheckExecutionClock = Object.freeze({ now: () => performance.now() });

/** Private Run handoff for Check lifecycle presentation and accounting. */
export type CheckExecutionLifecycle = Readonly<{
  readonly started: (fact: CheckStartedFact) => void;
  readonly settled: (fact: CheckSettledFact) => void;
}>;

/** Package-private monotonic clock seam for execution accounting. */
export type CheckExecutionClock = Readonly<{ now(): number }>;

export type CheckStartedFact = Readonly<{ checkId: string; displayName: string }>;

export type CheckSettledFact = CheckStartedFact &
  Readonly<{ outcome: CheckOutcome; durationMs: number | null }>;

type CheckIdentity = Pick<NormalizedCheck["definition"], "checkId" | "displayName">;

type ResolvedCheckExecutionFacts = Readonly<{
  readonly checkDurations: readonly CheckDuration[];
  readonly snapshot: CoreSnapshot;
}>;

export type ResolvedCheckExecution =
  | (Readonly<{ readonly kind: "completed" }> & ResolvedCheckExecutionFacts)
  | (Readonly<{ readonly kind: "cancelled" }> & ResolvedCheckExecutionFacts);

interface CheckExecutionState {
  readonly checkDurationsByCheckId: Map<string, number | null>;
  readonly lifecycle: CheckExecutionLifecycle | undefined;
  readonly openedCheckIds: Set<string>;
  readonly session: CoreCheckSession;
}

interface ExecuteCheckInput extends CheckExecutionState {
  readonly check: NormalizedCheck;
  readonly clock: CheckExecutionClock;
  readonly project: CheckProjectContext;
  readonly signal: AbortSignal;
}

/** Internal marker: a settled unavailable Check must block scheduler dependents. */
class CheckUnavailableSignal extends Error {
  public constructor() {
    super("Contained Check is unavailable");
    this.name = "CheckUnavailableSignal";
  }
}

/** Any escape from the Product adapter is a Package Run task-engine failure. */
class CheckExecutionInvariantFailure extends Error {
  public constructor(message: string) {
    super(message);
    this.name = "CheckExecutionInvariantFailure";
  }
}

/**
 * Runs the already normalized executable Check collection through one generic
 * Task per Check. Graph validation happens before Core scopes or callbacks.
 */
export async function executeResolvedChecks(
  input: Readonly<{
    readonly checks: readonly NormalizedCheck[];
    readonly maxParallel: number;
    readonly project: CheckProjectContext;
    readonly signal: AbortSignal | undefined;
    readonly clock?: CheckExecutionClock;
    readonly lifecycle?: CheckExecutionLifecycle;
  }>
): Promise<ResolvedCheckExecution> {
  const graph = planStaticCheckGraph(input.checks);
  prepareTaskGraph(graph, input.maxParallel);

  const registrations = input.checks.map(({ definition }) => Object.freeze({ definition }));
  const session = createCoreCheckSession(registrations);
  const clock = input.clock ?? SYSTEM_MONOTONIC_CLOCK;
  const state: CheckExecutionState = {
    checkDurationsByCheckId: new Map<string, number | null>(),
    lifecycle: input.lifecycle,
    openedCheckIds: new Set<string>(),
    session
  };
  let graphRun: Awaited<ReturnType<typeof runTaskGraph<void>>>;
  try {
    graphRun = await runTaskGraph({
      graph,
      maxParallel: input.maxParallel,
      signal: input.signal,
      execute: (task, context) => {
        const check = input.checks.find((candidate) => candidate.definition.checkId === task.id);
        if (check === undefined) {
          throw new CheckExecutionInvariantFailure("Task graph has no executable Check");
        }
        return executeCheck({
          ...state,
          check,
          clock,
          project: input.project,
          signal: context.signal ?? INERT_SIGNAL
        });
      }
    });
  } catch (error) {
    throw trustedFailure(error);
  }

  return closeResolvedChecks(input.checks, graphRun, state);
}

function closeResolvedChecks(
  checks: readonly NormalizedCheck[],
  graphRun: Awaited<ReturnType<typeof runTaskGraph<void>>>,
  state: CheckExecutionState
): ResolvedCheckExecution {
  try {
    assertContainedTaskFailures(graphRun.settlements);
    settleBlockedChecks(state, checks, graphRun.settlements);
    if (graphRun.cancelled) {
      state.session.closeUnresolvedAsCancelled();
      const snapshot = state.session.freeze();
      settleUnstartedCancelledChecks(snapshot, state);
      return resolvedExecution("cancelled", snapshot, state);
    }
    assertEveryCheckClosed(checks, graphRun.settlements);
    return resolvedExecution("completed", state.session.freeze(), state);
  } catch (error) {
    throw trustedFailure(error);
  }
}

function resolvedExecution(
  kind: ResolvedCheckExecution["kind"],
  snapshot: CoreSnapshot,
  state: CheckExecutionState
): ResolvedCheckExecution {
  return Object.freeze({
    kind,
    checkDurations: checkDurationsFor(snapshot, state.checkDurationsByCheckId),
    snapshot
  });
}

async function executeCheck(input: ExecuteCheckInput): Promise<void> {
  const checkId = input.check.definition.checkId;
  const scope = input.session.openCheckScope(checkId);
  input.openedCheckIds.add(checkId);
  emitStarted(input.lifecycle, input.check.definition);
  const startedAt = input.clock.now();
  const callback = await executeCheckCallback({
    check: input.check,
    project: input.project,
    scope,
    signal: input.signal
  });
  const settled =
    callback.source === "author"
      ? scope.settle(callback.result)
      : scope.settleProduct(callback.result);
  recordSettledCheck(input, input.check.definition, settled, durationSince(startedAt, input.clock));
  if (settled.status === "unavailable") throw new CheckUnavailableSignal();
}

function settleBlockedChecks(
  state: CheckExecutionState,
  checks: readonly NormalizedCheck[],
  settlements: readonly SettledTask<void>[]
): void {
  for (const settled of settlements) {
    if (settled.settlement.kind !== "blocked") continue;
    const check = checks.find((candidate) => candidate.definition.checkId === settled.task.id);
    if (check === undefined || state.openedCheckIds.has(check.definition.checkId)) {
      throw new CheckExecutionInvariantFailure("Blocked Task does not identify an unopened Check");
    }
    const scope = state.session.openCheckScope(check.definition.checkId);
    const outcome = scope.settleProduct(
      Object.freeze({
        status: "unavailable",
        reason: {
          code: "prerequisite-unavailable",
          checkIds: Object.freeze([...new Set(settled.settlement.dependencyIds)].sort(compareText))
        }
      })
    );
    recordSettledCheck(state, check.definition, outcome, null);
  }
}

function settleUnstartedCancelledChecks(snapshot: CoreSnapshot, state: CheckExecutionState): void {
  for (const check of snapshot.checks) {
    if (state.checkDurationsByCheckId.has(check.checkId)) continue;
    recordSettledCheck(state, check, check.outcome, null);
  }
}

function recordSettledCheck(
  state: CheckExecutionState,
  check: CheckIdentity,
  outcome: CheckOutcome,
  durationMs: number | null
): void {
  if (state.checkDurationsByCheckId.has(check.checkId)) {
    throw new CheckExecutionInvariantFailure("Check lifecycle settled more than once");
  }
  state.checkDurationsByCheckId.set(check.checkId, durationMs);
  emitSettled(state.lifecycle, check, outcome, durationMs);
}

function emitStarted(lifecycle: CheckExecutionLifecycle | undefined, check: CheckIdentity): void {
  lifecycle?.started(Object.freeze({ checkId: check.checkId, displayName: check.displayName }));
}

function emitSettled(
  lifecycle: CheckExecutionLifecycle | undefined,
  check: CheckIdentity,
  outcome: CheckOutcome,
  durationMs: number | null
): void {
  lifecycle?.settled(
    Object.freeze({
      checkId: check.checkId,
      displayName: check.displayName,
      outcome,
      durationMs
    })
  );
}

function durationSince(startedAt: number, clock: CheckExecutionClock): number {
  const elapsed = clock.now() - startedAt;
  return Number.isFinite(elapsed) && elapsed >= 0 ? elapsed : 0;
}

function checkDurationsFor(
  snapshot: CoreSnapshot,
  checkDurationsByCheckId: ReadonlyMap<string, number | null>
): readonly CheckDuration[] {
  if (snapshot.checks.length !== checkDurationsByCheckId.size) {
    throw new CheckExecutionInvariantFailure("Check duration summary does not close every Check");
  }
  return Object.freeze(
    snapshot.checks.map((check) => {
      const durationMs = checkDurationsByCheckId.get(check.checkId);
      if (durationMs === undefined) {
        throw new CheckExecutionInvariantFailure("Check duration summary is missing a Check");
      }
      return Object.freeze({ checkId: check.checkId, durationMs });
    })
  );
}

function assertContainedTaskFailures(settlements: readonly SettledTask<void>[]): void {
  for (const settled of settlements) {
    if (
      settled.settlement.kind === "failed" &&
      !(settled.settlement.error instanceof CheckUnavailableSignal)
    ) {
      throw new CheckExecutionInvariantFailure(
        "Task engine received an unexpected execution failure"
      );
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

function compareText(left: string, right: string): number {
  if (left < right) return -1;
  if (left > right) return 1;
  return 0;
}

function trustedFailure(error: unknown): CheckExecutionInvariantFailure {
  return error instanceof CheckExecutionInvariantFailure
    ? error
    : new CheckExecutionInvariantFailure(
        "Check execution adapter escaped its contained failure boundary"
      );
}

import type {
  CheckDependencies,
  CheckMessage,
  CheckOutcome,
  CheckProjectContext,
  CheckVisibility,
  DependencyReadResult
} from "../definition/custom-check.ts";
import type { NormalizedCheck } from "../definition/project.ts";
import {
  createCoreCheckSession,
  type CoreCheckSession
} from "../quality-core/check-record/core-session.ts";
import type { CoreCheck, CoreSnapshot } from "../quality-core/check-record/model.ts";
import { prepareTaskGraph, runTaskGraph, type SettledTask } from "../task-scheduler/index.ts";
import { executeCheckCallback } from "./check-callback.ts";
import { planStaticCheckGraph } from "./check-execution-plan.ts";
import { parseCheckTerminalResult } from "./check-terminal-result.ts";
import type { CheckDuration, CheckRunMessage } from "./result.ts";

const INERT_SIGNAL = new AbortController().signal;
const SYSTEM_MONOTONIC_CLOCK: CheckExecutionClock = Object.freeze({ now: () => performance.now() });
const EMPTY_MESSAGES: readonly CheckMessage[] = Object.freeze([]);

/** Private Run handoff for Check lifecycle presentation and accounting. */
export type CheckExecutionLifecycle = Readonly<{
  readonly started: (fact: CheckStartedFact) => void;
  readonly settled: (fact: CheckSettledFact) => void;
}>;

/** Package-private monotonic clock seam for execution accounting. */
export type CheckExecutionClock = Readonly<{ now(): number }>;

export type CheckStartedFact = Readonly<{ checkId: string; displayName: string }>;

export type CheckSettledFact = CheckStartedFact &
  Readonly<{
    durationMs: number | null;
    messages: readonly CheckMessage[];
    outcome: CheckOutcome;
    visibility: CheckVisibility;
  }>;

type CheckIdentity = Readonly<{
  readonly checkId: string;
  readonly displayName: string;
  readonly visibility: CheckVisibility;
}>;

type ResolvedCheckExecutionFacts = Readonly<{
  readonly checkDurations: readonly CheckDuration[];
  readonly checkMessages: readonly CheckRunMessage[];
  readonly snapshot: CoreSnapshot;
}>;

export type ResolvedCheckExecution =
  | (Readonly<{ readonly kind: "completed" }> & ResolvedCheckExecutionFacts)
  | (Readonly<{ readonly kind: "cancelled" }> & ResolvedCheckExecutionFacts);

interface CheckExecutionState {
  readonly settledFactsByCheckId: Map<string, SettledCheckFacts>;
  readonly lifecycle: CheckExecutionLifecycle | undefined;
  readonly session: CoreCheckSession;
}

interface SettledCheckFacts {
  readonly durationMs: number | null;
  readonly messages: readonly CheckMessage[];
}

interface ExecuteCheckInput extends CheckExecutionState {
  readonly check: NormalizedCheck;
  readonly clock: CheckExecutionClock;
  readonly project: CheckProjectContext;
  readonly signal: AbortSignal;
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
    settledFactsByCheckId: new Map<string, SettledCheckFacts>(),
    lifecycle: input.lifecycle,
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
    assertNoTaskEngineFailures(graphRun.settlements);
    if (graphRun.cancelled) {
      state.session.closeUnresolvedAsCancelled();
      const snapshot = state.session.freeze();
      settleUnstartedCancelledChecks(snapshot, checks, state);
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
  const summaries = checkRunSummaries(snapshot, state.settledFactsByCheckId);
  return Object.freeze({
    kind,
    ...summaries,
    snapshot
  });
}

async function executeCheck(input: ExecuteCheckInput): Promise<void> {
  const checkId = input.check.definition.checkId;
  const scope = input.session.openCheckScope(checkId);
  const identity = checkIdentity(input.check);
  emitStarted(input.lifecycle, identity);
  const startedAt = input.clock.now();
  const callback = await executeCheckCallback({
    check: input.check,
    dependencies: createCheckDependencies(input),
    project: input.project,
    scope,
    signal: input.signal
  });
  const settled = settleCallback(scope, callback);
  recordSettledCheck(
    input,
    identity,
    settled.outcome,
    settled.messages,
    durationSince(startedAt, input.clock)
  );
}

function createCheckDependencies(input: ExecuteCheckInput): CheckDependencies {
  const allowedDependencyIds = Object.freeze([...input.check.dependsOn]);
  return Object.freeze({
    get: (checkId: string): DependencyReadResult =>
      readDependency(input.session, allowedDependencyIds, checkId)
  });
}

function readDependency(
  session: CoreCheckSession,
  allowedDependencyIds: readonly string[],
  checkId: string
): DependencyReadResult {
  if (typeof checkId !== "string" || !allowedDependencyIds.includes(checkId)) {
    return dependencyNotDeclared(checkId);
  }
  return dependencyReadResult(session.readSettledCheck(checkId));
}

function dependencyReadResult(coreCheck: CoreCheck): DependencyReadResult {
  const outcome = coreCheck.outcome;
  if (outcome.status === "passed" || outcome.status === "failed") {
    return Object.freeze({
      ok: true,
      checkId: coreCheck.checkId,
      status: outcome.status,
      data: outcome.data
    });
  }
  return Object.freeze({
    ok: false,
    error: Object.freeze({
      code: "upstream-data-unavailable",
      checkId: coreCheck.checkId,
      status: outcome.status
    })
  });
}

function dependencyNotDeclared(checkId: unknown): DependencyReadResult {
  return Object.freeze({
    ok: false,
    error: Object.freeze({
      code: "dependency-not-declared",
      checkId: typeof checkId === "string" ? checkId : ""
    })
  });
}

function settleCallback(
  scope: ReturnType<CoreCheckSession["openCheckScope"]>,
  callback: Awaited<ReturnType<typeof executeCheckCallback>>
): Readonly<{ readonly messages: readonly CheckMessage[]; readonly outcome: CheckOutcome }> {
  if (callback.source === "product") {
    return Object.freeze({
      messages: EMPTY_MESSAGES,
      outcome: scope.settleProduct(callback.result)
    });
  }
  const terminal = parseCheckTerminalResult(callback.result);
  const settlement = scope.settle(terminal?.result ?? callback.result);
  return Object.freeze({
    messages:
      terminal !== undefined && settlement.authorResultAccepted
        ? terminal.messages
        : EMPTY_MESSAGES,
    outcome: settlement.outcome
  });
}

function settleUnstartedCancelledChecks(
  snapshot: CoreSnapshot,
  checks: readonly NormalizedCheck[],
  state: CheckExecutionState
): void {
  for (const check of snapshot.checks) {
    if (state.settledFactsByCheckId.has(check.checkId)) continue;
    const normalized = checks.find((candidate) => candidate.definition.checkId === check.checkId);
    if (normalized === undefined) {
      throw new CheckExecutionInvariantFailure(
        "Cancelled Check does not identify a normalized Check"
      );
    }
    recordSettledCheck(state, checkIdentity(normalized), check.outcome, EMPTY_MESSAGES, null);
  }
}

function recordSettledCheck(
  state: CheckExecutionState,
  check: CheckIdentity,
  outcome: CheckOutcome,
  messages: readonly CheckMessage[],
  durationMs: number | null
): void {
  if (state.settledFactsByCheckId.has(check.checkId)) {
    throw new CheckExecutionInvariantFailure("Check lifecycle settled more than once");
  }
  state.settledFactsByCheckId.set(check.checkId, Object.freeze({ durationMs, messages }));
  emitSettled(state.lifecycle, check, outcome, messages, durationMs);
}

function emitStarted(lifecycle: CheckExecutionLifecycle | undefined, check: CheckIdentity): void {
  lifecycle?.started(Object.freeze({ checkId: check.checkId, displayName: check.displayName }));
}

function checkIdentity(check: NormalizedCheck): CheckIdentity {
  return Object.freeze({
    checkId: check.definition.checkId,
    displayName: check.definition.displayName,
    visibility: check.visibility
  });
}

function emitSettled(
  lifecycle: CheckExecutionLifecycle | undefined,
  check: CheckIdentity,
  outcome: CheckOutcome,
  messages: readonly CheckMessage[],
  durationMs: number | null
): void {
  lifecycle?.settled(
    Object.freeze({
      checkId: check.checkId,
      displayName: check.displayName,
      outcome,
      durationMs,
      messages,
      visibility: check.visibility
    })
  );
}

function durationSince(startedAt: number, clock: CheckExecutionClock): number {
  const elapsed = clock.now() - startedAt;
  return Number.isFinite(elapsed) && elapsed >= 0 ? elapsed : 0;
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
    for (const message of settledFacts.messages) {
      messages.push(
        Object.freeze({
          checkId: check.checkId,
          code: message.code,
          level: message.level,
          message: message.message
        })
      );
    }
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

function trustedFailure(error: unknown): CheckExecutionInvariantFailure {
  return error instanceof CheckExecutionInvariantFailure
    ? error
    : new CheckExecutionInvariantFailure(
        "Check execution adapter escaped its contained failure boundary"
      );
}

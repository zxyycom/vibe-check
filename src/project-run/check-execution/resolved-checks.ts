import type {
  CheckDependencies,
  CheckMessage,
  CheckOutcome,
  CheckProjectContext,
  CheckVisibility,
  DependencyReadResult
} from "../../check/check.ts";
import type { NormalizedCheck } from "../../project-definition/project-definition.ts";
import { createCoreCheckSession, type CoreCheckSession } from "../../check-settlement/session.ts";
import type { CoreSnapshot } from "../../check-settlement/facts.ts";
import { prepareTaskGraph } from "../task-scheduler/graph.ts";
import { runTaskGraph, type SettledTask } from "../task-scheduler/scheduler.ts";
import { executeCheckCallback } from "./callback.ts";
import { planStaticCheckGraph } from "./plan.ts";
import { parseCheckTerminalResult } from "./terminal-result.ts";
import {
  prepareChecks,
  type CheckPreflightResolution,
  type PreparedCheck,
  type ReadyCheckPreflightResolution
} from "./preflight.ts";
import type { CheckDuration, CheckRunMessage } from "../result.ts";

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
  readonly preflight: ReadyCheckPreflightResolution;
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
  const completeCheckGraph = planStaticCheckGraph(input.checks);
  prepareTaskGraph(completeCheckGraph, input.maxParallel);
  const preflightResolutions = await prepareChecks({
    checks: input.checks,
    signal: input.signal
  });

  const checkRegistrations = input.checks.map(({ definition }) => Object.freeze({ definition }));
  const session = createCoreCheckSession(checkRegistrations);
  const clock = input.clock ?? SYSTEM_MONOTONIC_CLOCK;
  const executionState: CheckExecutionState = {
    settledFactsByCheckId: new Map<string, SettledCheckFacts>(),
    lifecycle: input.lifecycle,
    session
  };
  const readyPreflights: ReadyCheckPreflightResolution[] = [];
  const blockedCheckIds = new Set<string>();
  for (const resolution of preflightResolutions) {
    if (resolution.kind === "ready") {
      readyPreflights.push(resolution);
      continue;
    }
    blockedCheckIds.add(resolution.check.definition.checkId);
    settleBlockedPreflight(executionState, resolution);
  }
  const readyChecks = readyPreflights.map((preflight) => preflight.check);
  // The barrier is execution-phase work. A signal received while it runs must close this
  // phase as cancelled even when every preflight already blocked and the scheduler graph is empty.
  if (input.signal?.aborted) {
    executionState.session.closeUnresolvedAsCancelled();
    const snapshot = executionState.session.freeze();
    settleUnstartedCancelledChecks({
      normalizedChecks: input.checks,
      preparedChecks: readyChecks,
      snapshot,
      state: executionState
    });
    return resolvedExecution("cancelled", snapshot, executionState);
  }
  const readyPreflightByCheckId = new Map(
    readyPreflights.map((preflight) => [preflight.check.definition.checkId, preflight])
  );
  const graph = planStaticCheckGraph(readyChecks, {
    alreadySettledCheckIds: blockedCheckIds
  });
  let graphRun: Awaited<ReturnType<typeof runTaskGraph<void>>>;
  try {
    graphRun = await runTaskGraph({
      graph,
      maxParallel: input.maxParallel,
      signal: input.signal,
      execute: (task, context) => {
        const preflight = readyPreflightByCheckId.get(task.id);
        if (preflight === undefined) {
          throw new CheckExecutionInvariantFailure("Task graph has no prepared Check");
        }
        return executeCheck({
          ...executionState,
          preflight,
          clock,
          project: input.project,
          signal: context.signal ?? INERT_SIGNAL
        });
      }
    });
  } catch (error) {
    throw trustedFailure(error);
  }

  return closeResolvedChecks({
    allChecks: input.checks,
    graphRun,
    readyChecks,
    state: executionState
  });
}

function settleBlockedPreflight(
  state: CheckExecutionState,
  preflight: Extract<CheckPreflightResolution, { readonly kind: "blocked" }>
): void {
  const scope = state.session.openCheckScope(preflight.check.definition.checkId);
  const outcome = scope.settleProduct(preflight.outcome);
  recordSettledCheck(
    state,
    checkIdentity(preflight.check),
    outcome,
    preflight.check.preflightMessages,
    null
  );
}

function closeResolvedChecks(
  input: Readonly<{
    readonly allChecks: readonly NormalizedCheck[];
    readonly graphRun: Awaited<ReturnType<typeof runTaskGraph<void>>>;
    readonly readyChecks: readonly PreparedCheck[];
    readonly state: CheckExecutionState;
  }>
): ResolvedCheckExecution {
  try {
    assertNoTaskEngineFailures(input.graphRun.settlements);
    if (input.graphRun.cancelled) {
      input.state.session.closeUnresolvedAsCancelled();
      const snapshot = input.state.session.freeze();
      settleUnstartedCancelledChecks({
        normalizedChecks: input.allChecks,
        preparedChecks: input.readyChecks,
        snapshot,
        state: input.state
      });
      return resolvedExecution("cancelled", snapshot, input.state);
    }
    assertEveryCheckClosed(input.readyChecks, input.graphRun.settlements);
    return resolvedExecution("completed", input.state.session.freeze(), input.state);
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
  const check = input.preflight.check;
  const checkId = check.definition.checkId;
  const scope = input.session.openCheckScope(checkId);
  const identity = checkIdentity(check);
  emitStarted(input.lifecycle, identity);
  const startedAt = input.clock.now();
  const callback = await executeCheckCallback({
    check,
    dependencies: createCheckDependencies(input),
    project: input.project,
    scope,
    signal: input.signal
  });
  const settled = settleCallback(scope, callback, check.preflightMessages);
  recordSettledCheck(
    input,
    identity,
    settled.outcome,
    settled.messages,
    durationSince(startedAt, input.clock)
  );
}

function createCheckDependencies(input: ExecuteCheckInput): CheckDependencies {
  const directDependencyIds = input.preflight.check.dependsOn;
  return Object.freeze({
    get: (checkId: string): DependencyReadResult =>
      readDependency(input.session, directDependencyIds, checkId)
  });
}

function readDependency(
  session: CoreCheckSession,
  directDependencyIds: readonly string[],
  checkId: string
): DependencyReadResult {
  if (typeof checkId !== "string" || !directDependencyIds.includes(checkId)) {
    return dependencyNotDeclared(checkId);
  }
  return dependencyReadResult(checkId, session.readSettledCheckOutcome(checkId));
}

function dependencyReadResult(checkId: string, outcome: CheckOutcome): DependencyReadResult {
  if (outcome.status === "passed" || outcome.status === "failed") {
    return Object.freeze({
      ok: true,
      checkId,
      status: outcome.status,
      data: outcome.data
    });
  }
  return Object.freeze({
    ok: false,
    error: Object.freeze({
      code: "upstream-data-unavailable",
      checkId,
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
  callback: Awaited<ReturnType<typeof executeCheckCallback>>,
  preflightMessages: readonly CheckMessage[]
): Readonly<{ readonly messages: readonly CheckMessage[]; readonly outcome: CheckOutcome }> {
  if (callback.source === "product") {
    return Object.freeze({
      messages: preflightMessages,
      outcome: scope.settleProduct(callback.result)
    });
  }
  const terminal = parseCheckTerminalResult(callback.result);
  const settlement = scope.settle(terminal?.result ?? callback.result);
  return Object.freeze({
    messages:
      terminal !== undefined && settlement.authorResultAccepted
        ? Object.freeze([...preflightMessages, ...terminal.messages])
        : preflightMessages,
    outcome: settlement.outcome
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
  const normalizedCheckById = new Map(
    input.normalizedChecks.map((check) => [check.definition.checkId, check])
  );
  const preparedCheckById = new Map(
    input.preparedChecks.map((check) => [check.definition.checkId, check])
  );
  for (const check of input.snapshot.checks) {
    if (input.state.settledFactsByCheckId.has(check.checkId)) continue;
    const normalized = normalizedCheckById.get(check.checkId);
    if (normalized === undefined) {
      throw new CheckExecutionInvariantFailure(
        "Cancelled Check does not identify a normalized Check"
      );
    }
    const messages = preparedCheckById.get(check.checkId)?.preflightMessages ?? EMPTY_MESSAGES;
    recordSettledCheck(input.state, checkIdentity(normalized), check.outcome, messages, null);
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

function checkIdentity(check: Pick<NormalizedCheck, "definition" | "visibility">): CheckIdentity {
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

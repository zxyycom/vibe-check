import type {
  CheckMessage,
  CheckOutcome,
  CheckProjectContext,
  CheckVisibility
} from "../../check/check.ts";
import type { NormalizedCheck } from "../../project-definition/project-definition.ts";
import { createCoreCheckSession, type CoreCheckSession } from "../../check-settlement/session.ts";
import {
  diagnosticTags,
  summarizeDiagnosticValue,
  type DiagnosticLogger
} from "../diagnostic-logging/logger.ts";
import { prepareTaskGraph } from "../task-scheduler/graph.ts";
import { runTaskGraph } from "../task-scheduler/scheduler.ts";
import { executeCheckCallback } from "./callback.ts";
import { runWithCheckConsoleRouter } from "./console-capture.ts";
import { createCheckDependencies } from "./dependencies.ts";
import {
  CheckExecutionInvariantFailure,
  recordSettledCheck,
  settleCallback,
  type CheckExecutionSettlementState,
  type CheckIdentity,
  type SettledCheckFacts
} from "./execution-settlement.ts";
import {
  checkIdentity,
  closeCancelledExecution,
  closeResolvedChecks,
  trustedFailure
} from "./execution-finalization.ts";
import { planStaticCheckGraph } from "./plan.ts";
import {
  prepareChecks,
  type CheckPreflightResolution,
  type PreparedCheck,
  type ReadyCheckPreflightResolution
} from "./preflight.ts";

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
  Readonly<{
    durationMs: number | null;
    messages: readonly CheckMessage[];
    outcome: CheckOutcome;
    visibility: CheckVisibility;
  }>;

type ResolvedCheckExecutionFacts = Readonly<{
  readonly checkDurations: readonly import("../result.ts").CheckDuration[];
  readonly checkMessages: readonly import("../result.ts").CheckRunMessage[];
  readonly snapshot: import("../../check-settlement/facts.ts").CoreSnapshot;
}>;

export type ResolvedCheckExecution =
  | (Readonly<{ readonly kind: "completed" }> & ResolvedCheckExecutionFacts)
  | (Readonly<{ readonly kind: "cancelled" }> & ResolvedCheckExecutionFacts);

export interface CheckExecutionState extends CheckExecutionSettlementState {
  readonly session: CoreCheckSession;
}

interface ExecuteCheckInput extends CheckExecutionState {
  readonly preflight: ReadyCheckPreflightResolution;
  readonly clock: CheckExecutionClock;
  readonly project: CheckProjectContext;
  readonly signal: AbortSignal;
}

type PreparedResolvedCheckExecution = Readonly<{
  readonly blockedCheckIds: ReadonlySet<string>;
  readonly readyChecks: readonly PreparedCheck[];
  readonly readyPreflights: readonly ReadyCheckPreflightResolution[];
  readonly state: CheckExecutionState;
}>;

type ResolvedCheckExecutionInput = Readonly<{
  readonly checks: readonly NormalizedCheck[];
  readonly maxParallel: number;
  readonly project: CheckProjectContext;
  readonly signal: AbortSignal | undefined;
  readonly clock?: CheckExecutionClock;
  readonly diagnosticLogger?: DiagnosticLogger;
  readonly lifecycle?: CheckExecutionLifecycle;
}>;

/**
 * Runs the already normalized executable Check collection through one generic
 * Task per Check. Graph validation happens before Core scopes or callbacks.
 */
export async function executeResolvedChecks(
  input: ResolvedCheckExecutionInput
): Promise<ResolvedCheckExecution> {
  prepareTaskGraph(planStaticCheckGraph(input.checks), input.maxParallel);
  return runWithCheckConsoleRouter(() => executePreparedResolvedChecks(input));
}

async function executePreparedResolvedChecks(
  input: ResolvedCheckExecutionInput
): Promise<ResolvedCheckExecution> {
  const prepared = await prepareResolvedCheckExecution(input);
  // The barrier is execution-phase work. A signal received while it runs must close this
  // phase as cancelled even when every preflight already blocked and the scheduler graph is empty.
  if (input.signal?.aborted) {
    return closeCancelledExecution({
      normalizedChecks: input.checks,
      preparedChecks: prepared.readyChecks,
      state: prepared.state
    });
  }
  const readyPreflightByCheckId = new Map(
    prepared.readyPreflights.map((preflight) => [preflight.check.definition.checkId, preflight])
  );
  const graph = planStaticCheckGraph(prepared.readyChecks, {
    alreadySettledCheckIds: prepared.blockedCheckIds
  });
  let graphRun: Awaited<ReturnType<typeof runTaskGraph<void>>>;
  try {
    graphRun = await runTaskGraph({
      graph,
      maxParallel: input.maxParallel,
      diagnosticLogger: input.diagnosticLogger,
      signal: input.signal,
      execute: (task, context) => {
        const preflight = readyPreflightByCheckId.get(task.id);
        if (preflight === undefined) {
          throw new CheckExecutionInvariantFailure("Task graph has no prepared Check");
        }
        return executeCheck({
          ...prepared.state,
          preflight,
          clock: input.clock ?? SYSTEM_MONOTONIC_CLOCK,
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
    readyChecks: prepared.readyChecks,
    state: prepared.state
  });
}

async function prepareResolvedCheckExecution(
  input: Readonly<{
    readonly checks: readonly NormalizedCheck[];
    readonly diagnosticLogger?: DiagnosticLogger;
    readonly lifecycle?: CheckExecutionLifecycle;
    readonly maxParallel: number;
    readonly signal: AbortSignal | undefined;
  }>
): Promise<PreparedResolvedCheckExecution> {
  const preflights = await prepareChecks({
    checks: input.checks,
    diagnosticLogger: input.diagnosticLogger,
    signal: input.signal
  });
  const state = createExecutionState({
    checks: input.checks,
    diagnosticLogger: input.diagnosticLogger,
    lifecycle: input.lifecycle
  });
  const partition = settlePreflightResolutions(state, preflights);
  return Object.freeze({ ...partition, state });
}

function createExecutionState(
  input: Readonly<{
    readonly checks: readonly NormalizedCheck[];
    readonly diagnosticLogger: DiagnosticLogger | undefined;
    readonly lifecycle: CheckExecutionLifecycle | undefined;
  }>
): CheckExecutionState {
  return {
    diagnosticLogger: input.diagnosticLogger,
    settledFactsByCheckId: new Map<string, SettledCheckFacts>(),
    lifecycle: input.lifecycle,
    session: createCoreCheckSession(
      input.checks.map(({ definition }) => Object.freeze({ definition }))
    )
  };
}

function settlePreflightResolutions(
  state: CheckExecutionState,
  resolutions: readonly CheckPreflightResolution[]
): Omit<PreparedResolvedCheckExecution, "state"> {
  const readyPreflights: ReadyCheckPreflightResolution[] = [];
  const blockedCheckIds = new Set<string>();
  for (const resolution of resolutions) {
    if (resolution.kind === "ready") {
      readyPreflights.push(resolution);
      continue;
    }
    blockedCheckIds.add(resolution.check.definition.checkId);
    settleBlockedPreflight(state, resolution);
  }
  return Object.freeze({
    blockedCheckIds,
    readyChecks: Object.freeze(readyPreflights.map((preflight) => preflight.check)),
    readyPreflights: Object.freeze(readyPreflights)
  });
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

async function executeCheck(input: ExecuteCheckInput): Promise<void> {
  const check = input.preflight.check;
  const checkId = check.definition.checkId;
  const scope = input.session.openCheckScope(checkId);
  const identity = checkIdentity(check);
  input.diagnosticLogger?.observe({
    event: "check.started",
    tags: diagnosticTags(`CHECK:${checkId}`, "EXECUTION", "STARTED"),
    details: {
      dependencies: check.dependsOn,
      displayName: check.definition.displayName,
      options: summarizeDiagnosticValue(check.options)
    }
  });
  emitStarted(input.lifecycle, identity);
  const startedAt = input.clock.now();
  const callback = await executeCheckCallback({
    check,
    dependencies: createCheckDependencies({
      checkId,
      diagnosticLogger: input.diagnosticLogger,
      directDependencyIds: check.dependsOn,
      session: input.session
    }),
    diagnosticLogger: input.diagnosticLogger,
    project: input.project,
    scope,
    signal: input.signal
  });
  const settled = settleCallback({
    callback,
    checkId,
    diagnosticLogger: input.diagnosticLogger,
    preflightMessages: check.preflightMessages,
    scope
  });
  recordSettledCheck({
    check: identity,
    durationMs: durationSince(startedAt, input.clock),
    messages: settled.messages,
    outcome: settled.outcome,
    phase: "execution",
    state: input
  });
}

function emitStarted(lifecycle: CheckExecutionLifecycle | undefined, check: CheckIdentity): void {
  lifecycle?.started(Object.freeze({ checkId: check.checkId, displayName: check.displayName }));
}

function durationSince(startedAt: number, clock: CheckExecutionClock): number {
  const elapsed = clock.now() - startedAt;
  return Number.isFinite(elapsed) && elapsed >= 0 ? elapsed : 0;
}

import type {
  CheckMessage,
  CheckOutcome,
  CheckProjectContext,
  CheckVisibility
} from "../../check/check.ts";
import type {
  AdmissionPolicy,
  NormalizedCheck
} from "../../project-definition/project-definition.ts";
import { createCoreCheckSession, type CoreCheckSession } from "../../check-settlement/session.ts";
import {
  diagnosticTags,
  summarizeDiagnosticValue,
  type DiagnosticLogger
} from "../diagnostic-logging/logger.ts";
import { prepareTaskGraph } from "../task-scheduler/graph.ts";
import { admissionSelectionPolicyFor } from "../task-scheduler/custom-admission-policy.ts";
import { runTaskGraph } from "../task-scheduler/scheduler.ts";
import type { SchedulerPerformanceDiagnosticsInput } from "../task-scheduler/scheduler-performance-diagnostics.ts";
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
  closeResolvedChecks,
  settleBlockedDependent,
  trustedFailure
} from "./execution-finalization.ts";
import { planStaticCheckGraph } from "./plan.ts";
import {
  prepareCheck,
  type CheckPreflightResolution,
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
  | (Readonly<{ readonly kind: "cancelled" }> & ResolvedCheckExecutionFacts)
  | (Readonly<{ readonly kind: "admission-policy-failed" }> & ResolvedCheckExecutionFacts);

export interface CheckExecutionState extends CheckExecutionSettlementState {
  readonly session: CoreCheckSession;
}

interface ExecuteCheckInput extends CheckExecutionState {
  readonly check: NormalizedCheck;
  readonly clock: CheckExecutionClock;
  readonly project: CheckProjectContext;
  readonly signal: AbortSignal;
}

type ResolvedCheckExecutionInput = Readonly<{
  readonly admissionPolicy?: AdmissionPolicy;
  readonly checks: readonly NormalizedCheck[];
  readonly maxParallel: number;
  readonly project: CheckProjectContext;
  readonly signal: AbortSignal | undefined;
  readonly clock?: CheckExecutionClock;
  readonly diagnosticLogger?: DiagnosticLogger;
  /** Explicit enabled-only diagnostics handoff from the invocation output owner. */
  readonly schedulerPerformanceDiagnostics?: SchedulerPerformanceDiagnosticsInput;
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
  const state = createExecutionState({
    checks: input.checks,
    diagnosticLogger: input.diagnosticLogger,
    lifecycle: input.lifecycle
  });
  const checksByCheckId = new Map(
    input.checks.map((check) => [check.definition.checkId, check] as const)
  );
  let graphRun: Awaited<ReturnType<typeof runTaskGraph<boolean>>>;
  try {
    graphRun = await runTaskGraph({
      graph: planStaticCheckGraph(input.checks),
      admissionPolicy:
        input.admissionPolicy === undefined
          ? undefined
          : admissionSelectionPolicyFor(input.admissionPolicy),
      maxParallel: input.maxParallel,
      diagnosticLogger: input.diagnosticLogger,
      performanceDiagnostics: input.schedulerPerformanceDiagnostics,
      signal: input.signal,
      isPrerequisiteSatisfied: (satisfied) => satisfied,
      onTaskBlocked: (task, dependencyIds) => {
        const check = checksByCheckId.get(task.id);
        if (check === undefined) {
          throw new CheckExecutionInvariantFailure("Blocked Task has no normalized Check");
        }
        settleBlockedDependent({ check, dependencyIds, state });
      },
      execute: (task, context) => {
        const check = checksByCheckId.get(task.id);
        if (check === undefined) {
          throw new CheckExecutionInvariantFailure("Task graph has no normalized Check");
        }
        return executeAdmittedCheck({
          ...state,
          check,
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
    state
  });
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

async function executeAdmittedCheck(input: ExecuteCheckInput): Promise<boolean> {
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

async function executeReadyCheck(
  input: ExecuteCheckInput & Readonly<{ readonly preflight: ReadyCheckPreflightResolution }>
): Promise<boolean> {
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
      directRelationCheckIds: directRelationCheckIds(check),
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
  return settled.outcome.status === "passed";
}

function directRelationCheckIds(
  check: Pick<NormalizedCheck, "dependsOn" | "observes">
): readonly string[] {
  return Object.freeze([...new Set([...check.dependsOn, ...check.observes])].sort());
}

function emitStarted(lifecycle: CheckExecutionLifecycle | undefined, check: CheckIdentity): void {
  lifecycle?.started(Object.freeze({ checkId: check.checkId, displayName: check.displayName }));
}

function durationSince(startedAt: number, clock: CheckExecutionClock): number {
  const elapsed = clock.now() - startedAt;
  return Number.isFinite(elapsed) && elapsed >= 0 ? elapsed : 0;
}

import type { CheckMessage, CheckProjectContext } from "../../check/check.ts";
import type {
  NormalizedCheck,
  SchedulerMeasurementHook
} from "../../project-definition/project-definition.ts";
import { createCoreCheckSession } from "../../check-settlement/session.ts";
import {
  diagnosticTags,
  summarizeDiagnosticValue,
  type DiagnosticLogger
} from "../diagnostic-logging/logger.ts";
import { prepareTaskGraph } from "../task-scheduler/graph.ts";
import type { AdmissionSelectionPolicy } from "../task-scheduler/admission-selection-policy.ts";
import { runTaskGraph } from "../task-scheduler/scheduler.ts";
import type { SchedulerPerformanceDiagnosticsInput } from "../task-scheduler/scheduler-performance-diagnostics.ts";
import { executeCheckCallback } from "./callback.ts";
import { artifactDirectoryForCheck, type ResolvedInvocationPaths } from "../invocation-paths.ts";
import { runWithCheckConsoleRouter } from "./console-capture.ts";
import { createCheckDependencies } from "./dependencies.ts";
import {
  CheckExecutionInvariantFailure,
  recordSettledCheck,
  settleCallback,
  type CheckExecutionState,
  type CheckIdentity,
  type SettledCheckFacts
} from "./execution-settlement.ts";
import {
  checkIdentity,
  closeResolvedChecks,
  settleBlockedDependent,
  trustedFailure
} from "./execution-finalization.ts";
import type { CheckExecutionLifecycle } from "./lifecycle.ts";
import { planStaticCheckGraph } from "./plan.ts";
import {
  selectEffectiveCheckIds,
  resolveFlagControlSettlements,
  type FlagControlSettlement
} from "./flag-controls.ts";
import {
  prepareCheck,
  type CheckPreflightResolution,
  type ReadyCheckPreflightResolution
} from "./preflight.ts";
import type { ResolvedCheckExecution } from "./resolved-execution-result.ts";

const INERT_SIGNAL = new AbortController().signal;
const NO_CHECK_MESSAGES: readonly CheckMessage[] = Object.freeze([]);
const DIRECT_EXECUTION_INVOCATION_ID = "invocation/v1:direct-check-execution";
const SYSTEM_MONOTONIC_CLOCK: CheckExecutionClock = Object.freeze({
  now: () => performance.now()
});

/** Package-private monotonic clock seam for execution accounting. */
export type CheckExecutionClock = Readonly<{ now(): number }>;

interface ExecuteCheckInput extends CheckExecutionState {
  readonly check: NormalizedCheck;
  readonly clock: CheckExecutionClock;
  readonly onAdmittedCheck: ((check: NormalizedCheck) => void) | undefined;
  readonly invocationId: string;
  readonly paths: ResolvedInvocationPaths | undefined;
  readonly project: CheckProjectContext;
  readonly signal: AbortSignal;
}

type ResolvedCheckExecutionInput = Readonly<{
  /** Complete prepared private policy handoff; public policy dispatch stays outside execution. */
  readonly admissionPolicy?: AdmissionSelectionPolicy;
  readonly checks: readonly NormalizedCheck[];
  readonly maxParallel: number;
  /** Product invocation identity；private direct-execution tests 使用稳定 fallback。 */
  readonly invocationId?: string;
  /** 冻结的 invocation paths；仅 private direct-execution tests 可以省略。 */
  readonly paths?: ResolvedInvocationPaths;
  readonly project: CheckProjectContext;
  readonly signal: AbortSignal | undefined;
  readonly clock?: CheckExecutionClock;
  /** Core-owner Check lifecycle channel. */
  readonly diagnosticLogger?: DiagnosticLogger;
  /** Scheduler-owner decision and summary channel. */
  readonly schedulerDiagnosticLogger?: DiagnosticLogger;
  /** Explicit enabled-only diagnostics handoff from the invocation output owner. */
  readonly schedulerPerformanceDiagnostics?: SchedulerPerformanceDiagnosticsInput;
  readonly schedulerMeasurementHooks?: readonly SchedulerMeasurementHook[];
  readonly onSchedulerMeasurementHookFailure?: () => void;
  readonly onSchedulerMeasurementHooksSettled?: () => void;
  readonly lifecycle?: CheckExecutionLifecycle;
  /** Provider-owned bounded learned admission diagnostics, delivered by invocation. */
  readonly onAdmittedCheck?: (check: NormalizedCheck) => void;
}>;

/**
 * Runs the already normalized executable Check collection through one generic
 * Task per Check. Graph validation happens before Core scopes or callbacks.
 */
export async function executeResolvedChecks(
  input: ResolvedCheckExecutionInput
): Promise<ResolvedCheckExecution> {
  prepareTaskGraph(planStaticCheckGraph(input.checks), input.maxParallel);
  const effectiveCheckIds = selectEffectiveCheckIds(input.checks, input.project.flags);
  return runWithCheckConsoleRouter(() => executePreparedResolvedChecks(input, effectiveCheckIds));
}

async function executePreparedResolvedChecks(
  input: ResolvedCheckExecutionInput,
  effectiveCheckIds: readonly string[]
): Promise<ResolvedCheckExecution> {
  const state = createExecutionState({
    checks: input.checks,
    diagnosticLogger: input.diagnosticLogger,
    lifecycle: input.lifecycle
  });
  const flagControlSettlements = resolveFlagControlSettlements({
    checks: input.checks,
    diagnosticLogger: input.diagnosticLogger,
    effectiveCheckIds,
    signal: input.signal
  });
  for (const settlement of flagControlSettlements) {
    settleFlagControlOutcome(state, settlement);
  }
  input.lifecycle?.flagControlCompleted();
  const checksByCheckId = new Map(
    input.checks.map((check) => [check.definition.checkId, check] as const)
  );
  let graphRun: Awaited<ReturnType<typeof runTaskGraph<boolean>>>;
  try {
    graphRun = await runTaskGraph<boolean>({
      graph: planStaticCheckGraph(input.checks),
      admissionPolicy: input.admissionPolicy,
      maxParallel: input.maxParallel,
      diagnosticLogger: input.schedulerDiagnosticLogger ?? input.diagnosticLogger,
      performanceDiagnostics: input.schedulerPerformanceDiagnostics,
      measurementHooks: input.schedulerMeasurementHooks,
      onMeasurementHookFailure: input.onSchedulerMeasurementHookFailure,
      onMeasurementHooksSettled: input.onSchedulerMeasurementHooksSettled,
      preAdmissionTaskResults: Object.freeze(
        flagControlSettlements.map((settlement) =>
          Object.freeze({
            taskId: settlement.check.definition.checkId,
            value: false
          })
        )
      ),
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
          onAdmittedCheck: input.onAdmittedCheck,
          invocationId: input.invocationId ?? DIRECT_EXECUTION_INVOCATION_ID,
          paths: input.paths,
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
    effectiveCheckIds,
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

function settleFlagControlOutcome(
  state: CheckExecutionState,
  settlement: FlagControlSettlement
): void {
  const scope = state.session.openCheckScope(settlement.check.definition.checkId);
  const outcome = scope.settleProduct(settlement.outcome);
  recordSettledCheck({
    check: checkIdentity(settlement.check),
    durationMs: null,
    messages: NO_CHECK_MESSAGES,
    outcome,
    phase: "control",
    state
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

async function executeAdmittedCheck(input: ExecuteCheckInput): Promise<boolean> {
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

/** Diagnostic observation belongs to the invocation; it cannot revise admitted Task facts. */
function observeAdmittedCheck(input: ExecuteCheckInput): void {
  try {
    input.onAdmittedCheck?.(input.check);
  } catch {
    // Learned diagnostic output is best-effort and has no execution consequence.
  }
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
    artifactDirectory:
      input.paths === undefined ? null : artifactDirectoryForCheck(input.paths, checkId),
    check,
    dependencies: createCheckDependencies({
      checkId,
      diagnosticLogger: input.diagnosticLogger,
      directRelationCheckIds: directRelationCheckIds(check),
      session: input.session
    }),
    diagnosticLogger: input.diagnosticLogger,
    invocationId: input.invocationId,
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

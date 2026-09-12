import type { CheckMessage, CheckProjectContext } from "../../check/check.ts";
import type {
  NormalizedCheck,
  SchedulerMeasurementHook
} from "../../project-definition/project-definition.ts";
import type { ResourceUnitMapping } from "../../project-definition/resource-unit-mapping.ts";
import { createCoreCheckSession } from "../../check-settlement/session.ts";
import type { DiagnosticLogger } from "../diagnostic-logging/logger.ts";
import type { AdmissionSelectionPolicy } from "../task-scheduler/admission-selection-policy.ts";
import { prepareTaskGraph } from "../task-scheduler/graph.ts";
import type { SchedulerPerformanceDiagnosticsInput } from "../task-scheduler/measurement/diagnostics.ts";
import type { ResolvedInvocationPaths } from "../invocation/paths.ts";
import { runWithCheckConsoleRouter } from "./console-capture.ts";
import {
  recordSettledCheck,
  type CheckExecutionState,
  type SettledCheckFacts
} from "./execution-settlement.ts";
import { checkIdentity, closeResolvedChecks } from "./execution-finalization.ts";
import type { CheckExecutionLifecycle } from "./lifecycle.ts";
import { planStaticCheckGraph } from "./plan.ts";
import {
  selectEffectiveCheckIds,
  resolveFlagControlSettlements,
  type FlagControlSettlement
} from "./flag-controls.ts";
import { runScheduledChecks } from "./scheduled-check-run.ts";
import type { CheckExecutionClock } from "./admitted-check-execution.ts";
import type { ResolvedCheckExecution } from "./resolved-execution-result.ts";

const NO_CHECK_MESSAGES: readonly CheckMessage[] = Object.freeze([]);

/** Package-private monotonic clock seam for execution accounting. */
export type { CheckExecutionClock } from "./admitted-check-execution.ts";

export type ResolvedCheckExecutionInput = Readonly<{
  /** Complete prepared private policy handoff; public policy dispatch stays outside execution. */
  readonly admissionPolicy?: AdmissionSelectionPolicy;
  readonly checks: readonly NormalizedCheck[];
  readonly maxParallel: number;
  readonly resourceCapacities?: ResourceUnitMapping;
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
  prepareTaskGraph(planStaticCheckGraph(input.checks, input.resourceCapacities), input.maxParallel);
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
  try {
    const flagControlSettlements = resolveFlagControlSettlements({
      checks: input.checks,
      ...(input.diagnosticLogger === undefined ? {} : { diagnosticLogger: input.diagnosticLogger }),
      effectiveCheckIds,
      signal: input.signal
    });
    for (const settlement of flagControlSettlements) {
      settleFlagControlOutcome(state, settlement);
    }
    input.lifecycle?.flagControlCompleted();
    const graphRun = await runScheduledChecks({
      execution: input,
      flagControlSettlements,
      state
    });

    return closeResolvedChecks({
      allChecks: input.checks,
      effectiveCheckIds,
      graphRun,
      state
    });
  } finally {
    state.handoffsByCheckId.clear();
  }
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
    handoffsByCheckId: new Map(),
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

import { taskIdsForCore } from "./admission-core/scheduler-queries.ts";
import type { AdmissionSelectionPolicy } from "./admission-selection-policy.ts";
import type { AdmissionPolicyContext } from "../../project-definition/project-definition.ts";
import { staticAdmissionSelectionPolicy } from "./admission-selection-policy.ts";
import { decideAdmission, type SchedulerDecisionCycle } from "./scheduler-admission-decision.ts";
import {
  coreDecisionContext,
  decisionContext,
  type SchedulerInspection
} from "./scheduler-decision-inspection.ts";
import { freezeDecision, freezeDecisionWithContext } from "./scheduler-decision-model.ts";
import type {
  SchedulerDecision,
  SchedulerSnapshot,
  SchedulerTrigger
} from "./scheduler-decision-model.ts";
import {
  compilePreparedAdmissionGraph,
  createAdmissionCoreFromSchedulerSnapshot,
  reconcileAdmissionCore,
  schedulerInspectionForCore,
  type AdmissionCoreState
} from "./admission-core/core.ts";

export type {
  SchedulerDecision,
  SchedulerSettlementKind,
  SchedulerSnapshot,
  SchedulerTrigger
} from "./scheduler-decision-model.ts";

/**
 * Computes the next generic task-engine action from an immutable state projection.
 * Starting work, awaiting promises, cancellation, and diagnostic output remain in
 * the imperative scheduler shell.
 */
export function decideScheduler(
  snapshot: SchedulerSnapshot,
  trigger: SchedulerTrigger,
  policy: AdmissionSelectionPolicy = staticAdmissionSelectionPolicy,
  measurement?: () => AdmissionPolicyContext["measurement"],
  admissionCore?: AdmissionCoreState
): SchedulerDecision {
  const core =
    admissionCore ??
    createAdmissionCoreFromSchedulerSnapshot(
      compilePreparedAdmissionGraph(snapshot.graph, snapshot.maxParallel),
      snapshot
    );
  if (admissionCore === undefined) {
    const reconciliation = reconcileAdmissionCore(core);
    const forced = reconciliation.effects.find(
      (effect) => effect.kind === "settled" && effect.settlementKind === "blocked"
    );
    if (forced?.kind === "settled" && forced.settlementKind === "blocked") {
      return freezeDecision({
        ...decisionContext(
          Object.freeze({
            ...schedulerInspectionForCore(core),
            isAbortRequested: snapshot.isAbortRequested,
            isCancelled: snapshot.isCancelled
          }),
          core.compiled.graph.schedulerGraphSnapshot
        ),
        dependencyIds: forced.dependencyIds ?? [],
        kind: "settle-blocked",
        taskId: forced.taskId,
        trigger
      });
    }
  }
  return decideSchedulerFromCore({
    admissionCore: core,
    pendingTaskIds: snapshot.pendingTaskIds,
    policy,
    runtime: snapshot,
    trigger,
    ...(measurement === undefined ? {} : { measurement })
  });
}

/** Uses the authoritative core without rebuilding discarded shell state projections. */
export function decideSchedulerFromCore(
  input: Readonly<{
    readonly admissionCore: AdmissionCoreState;
    readonly runtime: Pick<SchedulerSnapshot, "isAbortRequested" | "isCancelled">;
    readonly trigger: SchedulerTrigger;
    readonly policy: AdmissionSelectionPolicy;
    readonly measurement?: () => AdmissionPolicyContext["measurement"];
    /** Preserves standalone snapshot cancellation order when one was supplied. */
    readonly pendingTaskIds?: readonly string[];
  }>
): SchedulerDecision {
  const { admissionCore: core, trigger, policy, measurement } = input;
  const runtime = Object.freeze({
    isAbortRequested: input.runtime.isAbortRequested,
    isCancelled: input.runtime.isCancelled
  });
  let state: SchedulerInspection | undefined;
  const inspection = () =>
    (state ??= Object.freeze({
      ...schedulerInspectionForCore(core),
      isAbortRequested: runtime.isAbortRequested,
      isCancelled: runtime.isCancelled
    }));
  const cycle: SchedulerDecisionCycle = Object.freeze({
    admissionCore: core,
    context: coreDecisionContext(core, inspection),
    policy,
    get state() {
      return inspection();
    },
    runtime,
    ...(measurement === undefined ? {} : { measurement }),
    trigger
  });
  const terminalDecision = decideTerminalSchedulerAction(cycle, runtime, input.pendingTaskIds);
  if (terminalDecision !== undefined) return terminalDecision;

  return decideAdmission(cycle);
}

function decideTerminalSchedulerAction(
  cycle: SchedulerDecisionCycle,
  runtime: Pick<SchedulerSnapshot, "isAbortRequested" | "isCancelled">,
  pendingTaskIds: readonly string[] | undefined
): SchedulerDecision | undefined {
  if (runtime.isAbortRequested && !runtime.isCancelled) {
    return freezeDecisionWithContext(cycle.context, {
      kind: "cancel-pending",
      taskIds: pendingTaskIds ?? taskIdsForCore(cycle.admissionCore, "pending"),
      trigger: Object.freeze({ kind: "cancellation-observed" })
    });
  }
  const runningTaskCount = cycle.admissionCore.selection.runningTotal;
  const pendingTaskCount = cycle.admissionCore.selection.remainingTaskCount - runningTaskCount;
  if (pendingTaskCount === 0 && runningTaskCount === 0) {
    return freezeDecisionWithContext(cycle.context, {
      cancelled: runtime.isCancelled,
      kind: "complete",
      trigger: cycle.trigger
    });
  }
  if (runtime.isCancelled) {
    if (pendingTaskCount > 0) {
      throw new Error("cancelled scheduler state retains pending tasks");
    }
    return awaitDrainDecision(cycle);
  }
  if (pendingTaskCount === 0) return awaitDrainDecision(cycle);
  return undefined;
}

function awaitDrainDecision(cycle: SchedulerDecisionCycle): SchedulerDecision {
  return freezeDecisionWithContext(cycle.context, {
    candidates: Object.freeze([]),
    eligibleCount: 0,
    hardGuard: Object.freeze({ kind: "wait", runningCanDrain: true }),
    kind: "await-running",
    proposal: null,
    trigger: cycle.trigger
  });
}

import type { PlannedTask, PlannedTaskGraph } from "./graph.ts";
import type { SchedulerGraphSnapshot } from "../../project-definition/project-definition.ts";
import { summarizeSchedulerBlockers } from "./scheduler-blocker-summary.ts";
import type {
  SchedulerCapacity,
  SchedulerDecisionContext,
  SchedulerSettlementKind
} from "./scheduler-decision-model.ts";

export interface SchedulerInspection {
  readonly activeScopeIds: readonly string[];
  readonly graph: PlannedTaskGraph;
  readonly isAbortRequested: boolean;
  readonly isCancelled: boolean;
  readonly maxParallel: number;
  readonly pendingTasks: readonly PlannedTask[];
  readonly runningMutexes: readonly string[];
  readonly runningTaskIds: readonly string[];
  readonly settledTasks: readonly Readonly<{
    readonly kind: SchedulerSettlementKind;
    readonly taskId: string;
  }>[];
}

export function decisionContext(
  state: SchedulerInspection,
  graphIdentity: SchedulerGraphSnapshot
): SchedulerDecisionContext {
  const capacity = capacityFor(state);
  return Object.freeze({
    blockers: summarizeSchedulerBlockers(state, capacity),
    capacity,
    graphIdentity
  });
}

export function capacityFor(state: SchedulerInspection): SchedulerCapacity {
  return Object.freeze({
    effectiveMaxParallel: effectiveMaxParallelFor(state),
    maxParallel: state.maxParallel,
    running: state.runningTaskIds.length
  });
}

function effectiveMaxParallelFor(state: SchedulerInspection): number {
  let effective = state.maxParallel;
  for (const scope of state.graph.scopes) {
    if (state.activeScopeIds.includes(scope.id)) effective = Math.min(effective, scope.maxParallel);
  }
  return effective;
}

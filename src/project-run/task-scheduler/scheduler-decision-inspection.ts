import { capacityForCore } from "./admission-core/scheduler-queries.ts";
import type { AdmissionCoreState } from "./admission-core/core.ts";
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
  readonly effectiveMaxParallel: number;
  readonly graph: PlannedTaskGraph;
  readonly isAbortRequested: boolean;
  readonly isCancelled: boolean;
  readonly maxParallel: number;
  readonly pendingTasks: readonly PlannedTask[];
  readonly runningMutexes: readonly string[];
  readonly resources: readonly Readonly<{
    readonly available: number;
    readonly capacity: number;
    readonly inUse: number;
    readonly resourceId: string;
  }>[];
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
    effectiveMaxParallel: state.effectiveMaxParallel,
    maxParallel: state.maxParallel,
    running: state.runningTaskIds.length
  });
}

/** Defers diagnostic-only full inspection/blockers; capacity is a thin scalar projection. */
export function coreDecisionContext(
  core: AdmissionCoreState,
  inspection: () => SchedulerInspection
): SchedulerDecisionContext {
  let blockers: SchedulerDecisionContext["blockers"] | undefined;
  const capacity = capacityForCore(core);
  return Object.freeze({
    get blockers() {
      return (blockers ??= summarizeSchedulerBlockers(inspection(), capacity));
    },
    capacity,
    graphIdentity: core.compiled.graph.schedulerGraphSnapshot
  });
}

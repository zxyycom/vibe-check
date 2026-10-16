import { capacityForCore } from "./admission-core/scheduler-queries.ts";
import type { AdmissionCoreState } from "./admission-core/core.ts";
import type { PlannedTask, PlannedTaskGraph } from "./graph.ts";
import { summarizeSchedulerBlockers } from "./scheduler-blocker-summary.ts";
import type {
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

/** Defers diagnostic-only blocker aggregation; capacity is a thin scalar projection. */
export function coreDecisionContext(core: AdmissionCoreState): SchedulerDecisionContext {
  let blockers: SchedulerDecisionContext["blockers"] | undefined;
  const capacity = capacityForCore(core);
  return Object.freeze({
    get blockers() {
      return (blockers ??= summarizeSchedulerBlockers(core));
    },
    capacity,
    get graphIdentity() {
      return core.compiled.graph.schedulerGraphSnapshot;
    }
  });
}

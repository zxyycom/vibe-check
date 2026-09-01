import type { PlannedTask, PlannedTaskGraph, PlannedTaskScope } from "./graph.ts";
import { summarizeSchedulerBlockers } from "./scheduler-blocker-summary.ts";
import type {
  SchedulerAwaitReason,
  SchedulerCapacity,
  SchedulerDecisionContext,
  SchedulerSettlementKind,
  SchedulerSnapshot
} from "./scheduler-decision-model.ts";

export interface SchedulerInspection {
  readonly activeScopeIds: ReadonlySet<string>;
  readonly graph: PlannedTaskGraph;
  readonly maxParallel: number;
  readonly pendingTasks: readonly PlannedTask[];
  readonly reservationTaskId: string | undefined;
  readonly runningMutexes: ReadonlySet<string>;
  readonly runningTaskIds: ReadonlySet<string>;
  readonly settlementKindByTaskId: ReadonlyMap<string, SchedulerSettlementKind>;
}

export function inspectSnapshot(snapshot: SchedulerSnapshot): SchedulerInspection {
  const tasksById = new Map(snapshot.graph.tasks.map((task) => [task.id, task] as const));
  const pendingTasks = snapshot.pendingTaskIds.map((taskId) => pendingTaskFor(taskId, tasksById));
  return Object.freeze({
    activeScopeIds: new Set(snapshot.activeScopeIds),
    graph: snapshot.graph,
    maxParallel: snapshot.maxParallel,
    pendingTasks: Object.freeze(pendingTasks),
    reservationTaskId: snapshot.reservationTaskId,
    runningMutexes: new Set(snapshot.runningMutexes),
    runningTaskIds: new Set(snapshot.runningTaskIds),
    settlementKindByTaskId: new Map(
      snapshot.settledTasks.map(({ taskId, kind }) => [taskId, kind] as const)
    )
  });
}

export function decisionContext(state: SchedulerInspection): SchedulerDecisionContext {
  const capacity = capacityFor(state);
  return Object.freeze({
    blockers: summarizeSchedulerBlockers(state, capacity),
    capacity,
    reservation: Object.freeze({ taskId: state.reservationTaskId ?? null })
  });
}

export function selectBlockedTask(
  state: SchedulerInspection
): Readonly<{ readonly dependencyIds: readonly string[]; readonly task: PlannedTask }> | undefined {
  for (let index = state.pendingTasks.length - 1; index >= 0; index -= 1) {
    const task = state.pendingTasks[index];
    const dependencyIds = blockingDependencyIds(task, state.settlementKindByTaskId);
    if (dependencyIds !== undefined)
      return Object.freeze({ dependencyIds: Object.freeze(dependencyIds), task });
  }
  return undefined;
}

export function isDependencyMutexEligible(task: PlannedTask, state: SchedulerInspection): boolean {
  return (
    task.dependsOn.every(
      (dependencyId) => state.settlementKindByTaskId.get(dependencyId) === "completed"
    ) && task.mutex.every((mutex) => !state.runningMutexes.has(mutex))
  );
}

export function capacityWaitReason(state: SchedulerInspection): SchedulerAwaitReason {
  return state.runningTaskIds.size >= state.maxParallel ? "root-capacity" : "active-scope-capacity";
}

export function canAdmit(state: SchedulerInspection, task: PlannedTask): boolean {
  return state.runningTaskIds.size < prospectiveMaxParallel(state, task);
}

export function activationScopeFor(
  state: SchedulerInspection,
  task: PlannedTask
): PlannedTaskScope | undefined {
  const scope = scopeForTask(state, task);
  return scope?.activationTaskIds.includes(task.id) === true && !state.activeScopeIds.has(scope.id)
    ? scope
    : undefined;
}

export function selectTighteningTask(
  state: SchedulerInspection,
  eligibleTasks: readonly PlannedTask[],
  effectiveMaxParallel: number
): PlannedTask | undefined {
  return eligibleTasks
    .filter((task) => activatesTighteningScope(state, task, effectiveMaxParallel))
    .sort((left, right) => compareConstrainedTasks(state, left, right))[0];
}

export function selectConstrainedContinuation(
  state: SchedulerInspection,
  eligibleTasks: readonly PlannedTask[],
  effectiveMaxParallel: number
): PlannedTask | undefined {
  return eligibleTasks
    .filter((task) => isConstrainedContinuation(state, task, effectiveMaxParallel))
    .sort((left, right) => compareConstrainedTasks(state, left, right))[0];
}

/** Selects the greatest static priority while preserving pending order for ties. */
export function selectOrdinaryReadyTask(tasks: readonly PlannedTask[]): PlannedTask {
  const [first, ...remaining] = tasks;
  if (first === undefined) throw new Error("ordinary scheduler selection requires a task");
  return remaining.reduce(
    (selected, task) => (task.admissionPriority > selected.admissionPriority ? task : selected),
    first
  );
}

function pendingTaskFor(taskId: string, tasksById: ReadonlyMap<string, PlannedTask>): PlannedTask {
  const task = tasksById.get(taskId);
  if (task === undefined) throw new Error(`scheduler snapshot has unknown pending task ${taskId}`);
  return task;
}

function blockingDependencyIds(
  task: PlannedTask,
  settlementKindByTaskId: ReadonlyMap<string, SchedulerSettlementKind>
): string[] | undefined {
  const settlementKinds = task.dependsOn.map(
    (dependencyId) => [dependencyId, settlementKindByTaskId.get(dependencyId)] as const
  );
  if (settlementKinds.some(([, kind]) => kind === undefined)) return undefined;
  const dependencyIds = settlementKinds.flatMap(([dependencyId, kind]) =>
    kind === "completed" ? [] : [dependencyId]
  );
  return dependencyIds.length === 0 ? undefined : dependencyIds;
}

function capacityFor(state: SchedulerInspection): SchedulerCapacity {
  return Object.freeze({
    effectiveMaxParallel: effectiveMaxParallelFor(state),
    maxParallel: state.maxParallel,
    running: state.runningTaskIds.size
  });
}

function effectiveMaxParallelFor(state: SchedulerInspection): number {
  let effective = state.maxParallel;
  for (const scope of state.graph.scopes) {
    if (state.activeScopeIds.has(scope.id)) effective = Math.min(effective, scope.maxParallel);
  }
  return effective;
}

function prospectiveMaxParallel(state: SchedulerInspection, task: PlannedTask): number {
  const scope = activationScopeFor(state, task);
  return scope === undefined
    ? effectiveMaxParallelFor(state)
    : Math.min(effectiveMaxParallelFor(state), scope.maxParallel);
}

function activatesTighteningScope(
  state: SchedulerInspection,
  task: PlannedTask,
  effectiveMaxParallel: number
): boolean {
  const scope = activationScopeFor(state, task);
  return scope !== undefined && scope.maxParallel < effectiveMaxParallel;
}

function isConstrainedContinuation(
  state: SchedulerInspection,
  task: PlannedTask,
  effectiveMaxParallel: number
): boolean {
  const scope = scopeForTask(state, task);
  return (
    scope !== undefined &&
    state.activeScopeIds.has(scope.id) &&
    scope.maxParallel < state.maxParallel &&
    scope.maxParallel === effectiveMaxParallel
  );
}

function compareConstrainedTasks(
  state: SchedulerInspection,
  left: PlannedTask,
  right: PlannedTask
): number {
  const leftScope = scopeForTask(state, left);
  const rightScope = scopeForTask(state, right);
  if (leftScope === undefined || rightScope === undefined) {
    throw new Error("constrained task is missing a scope");
  }
  return (
    leftScope.maxParallel - rightScope.maxParallel ||
    right.admissionPriority - left.admissionPriority ||
    compareText(leftScope.id, rightScope.id) ||
    compareText(left.id, right.id)
  );
}

function compareText(left: string, right: string): number {
  if (left < right) return -1;
  if (left > right) return 1;
  return 0;
}

function scopeForTask(state: SchedulerInspection, task: PlannedTask): PlannedTaskScope | undefined {
  return task.scopeId === undefined
    ? undefined
    : state.graph.scopes.find((scope) => scope.id === task.scopeId);
}

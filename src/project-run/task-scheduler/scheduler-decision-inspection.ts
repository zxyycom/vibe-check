import type { PlannedTask, PlannedTaskGraph, PlannedTaskScope } from "./graph.ts";
import { summarizeSchedulerBlockers } from "./scheduler-blocker-summary.ts";
import type {
  SchedulerCapacity,
  SchedulerDecisionContext,
  SchedulerSettlementKind,
  SchedulerSnapshot
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

export function inspectSnapshot(snapshot: SchedulerSnapshot): SchedulerInspection {
  const tasksById = new Map(snapshot.graph.tasks.map((task) => [task.id, task] as const));
  const pendingTasks = snapshot.pendingTaskIds.map((taskId) => pendingTaskFor(taskId, tasksById));
  return Object.freeze({
    activeScopeIds: Object.freeze([...snapshot.activeScopeIds]),
    graph: snapshot.graph,
    isAbortRequested: snapshot.isAbortRequested,
    isCancelled: snapshot.isCancelled,
    maxParallel: snapshot.maxParallel,
    pendingTasks: Object.freeze(pendingTasks),
    runningMutexes: Object.freeze([...snapshot.runningMutexes]),
    runningTaskIds: Object.freeze([...snapshot.runningTaskIds]),
    settledTasks: Object.freeze(
      snapshot.settledTasks.map(({ taskId, kind }) => Object.freeze({ kind, taskId }))
    )
  });
}

export function decisionContext(state: SchedulerInspection): SchedulerDecisionContext {
  const capacity = capacityFor(state);
  return Object.freeze({
    blockers: summarizeSchedulerBlockers(state, capacity),
    capacity,
    graphIdentity: Object.freeze({
      scopes: Object.freeze(
        state.graph.scopes.map((scope) =>
          Object.freeze({
            activationTaskIds: Object.freeze([...scope.activationTaskIds]),
            id: scope.id,
            maxParallel: scope.maxParallel,
            terminalTaskId: scope.terminalTaskId
          })
        )
      ),
      tasks: Object.freeze(
        state.graph.tasks.map((task) =>
          Object.freeze({
            admissionPriority: task.admissionPriority,
            dependsOn: Object.freeze([...task.dependsOn]),
            id: task.id,
            mutex: Object.freeze([...task.mutex]),
            observes: Object.freeze([...task.observes]),
            scopeId: task.scopeId ?? null
          })
        )
      )
    })
  });
}

export function selectBlockedTask(
  state: SchedulerInspection
): Readonly<{ readonly dependencyIds: readonly string[]; readonly task: PlannedTask }> | undefined {
  for (let index = state.pendingTasks.length - 1; index >= 0; index -= 1) {
    const task = state.pendingTasks[index];
    const dependencyIds = blockingDependencyIds(task, state.settledTasks);
    if (dependencyIds !== undefined)
      return Object.freeze({ dependencyIds: Object.freeze(dependencyIds), task });
  }
  return undefined;
}

export function isRelationMutexEligible(task: PlannedTask, state: SchedulerInspection): boolean {
  return (
    isRelationEligible(task, state) &&
    task.mutex.every((mutex) => !state.runningMutexes.includes(mutex))
  );
}

export function isRelationEligible(task: PlannedTask, state: SchedulerInspection): boolean {
  return (
    task.dependsOn.every(
      (dependencyId) => settlementKindFor(state.settledTasks, dependencyId) === "completed"
    ) &&
    task.observes.every(
      (observationId) => settlementKindFor(state.settledTasks, observationId) !== undefined
    )
  );
}

export function canAdmit(state: SchedulerInspection, task: PlannedTask): boolean {
  return state.runningTaskIds.length < prospectiveMaxParallel(state, task);
}

export function activationScopeFor(
  state: SchedulerInspection,
  task: PlannedTask
): PlannedTaskScope | undefined {
  const scope = scopeForTask(state, task);
  return scope?.activationTaskIds.includes(task.id) === true &&
    !state.activeScopeIds.includes(scope.id)
    ? scope
    : undefined;
}

function pendingTaskFor(taskId: string, tasksById: ReadonlyMap<string, PlannedTask>): PlannedTask {
  const task = tasksById.get(taskId);
  if (task === undefined) throw new Error(`scheduler snapshot has unknown pending task ${taskId}`);
  return task;
}

function blockingDependencyIds(
  task: PlannedTask,
  settledTasks: SchedulerInspection["settledTasks"]
): string[] | undefined {
  const settlementKinds = task.dependsOn.map(
    (dependencyId) => [dependencyId, settlementKindFor(settledTasks, dependencyId)] as const
  );
  if (settlementKinds.some(([, kind]) => kind === undefined)) return undefined;
  const dependencyIds = settlementKinds.flatMap(([dependencyId, kind]) =>
    kind === "completed" ? [] : [dependencyId]
  );
  return dependencyIds.length === 0 ? undefined : dependencyIds;
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

function prospectiveMaxParallel(state: SchedulerInspection, task: PlannedTask): number {
  const scope = activationScopeFor(state, task);
  return scope === undefined
    ? effectiveMaxParallelFor(state)
    : Math.min(effectiveMaxParallelFor(state), scope.maxParallel);
}

function scopeForTask(state: SchedulerInspection, task: PlannedTask): PlannedTaskScope | undefined {
  return task.scopeId === undefined
    ? undefined
    : state.graph.scopes.find((scope) => scope.id === task.scopeId);
}

function settlementKindFor(
  settledTasks: SchedulerInspection["settledTasks"],
  taskId: string
): SchedulerSettlementKind | undefined {
  return settledTasks.find((task) => task.taskId === taskId)?.kind;
}

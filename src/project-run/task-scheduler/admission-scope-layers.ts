import type { SchedulerInspection } from "./scheduler-decision-inspection.ts";
import type { PlannedTask, PlannedTaskGraph, PlannedTaskScope } from "./graph.ts";

/** Returns the declared scope for one Task without inferring membership from activation state. */
export function scopeForTask(
  graph: PlannedTaskGraph,
  task: PlannedTask
): PlannedTaskScope | undefined {
  return task.scopeId === undefined
    ? undefined
    : graph.scopes.find((scope) => scope.id === task.scopeId);
}

/** Returns the inactive constrained scope that this Task would activate. */
export function tighteningScopeForTask(
  graph: PlannedTaskGraph,
  inspection: SchedulerInspection,
  task: PlannedTask
): PlannedTaskScope | undefined {
  const scope = scopeForTask(graph, task);
  if (
    scope === undefined ||
    !scope.activationTaskIds.includes(task.id) ||
    inspection.activeScopeIds.includes(scope.id) ||
    scope.maxParallel >= inspection.maxParallel
  ) {
    return undefined;
  }
  return scope;
}

/** Reports whether a Task continues an active scope that constrains root parallelism. */
export function isConstrainedScopeContinuation(
  graph: PlannedTaskGraph,
  inspection: SchedulerInspection,
  task: PlannedTask
): boolean {
  const scope = scopeForTask(graph, task);
  return (
    scope !== undefined &&
    inspection.activeScopeIds.includes(scope.id) &&
    scope.maxParallel < inspection.maxParallel
  );
}

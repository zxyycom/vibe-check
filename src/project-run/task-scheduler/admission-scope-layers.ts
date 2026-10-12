import type { CompiledAdmissionGraph } from "./admission-core/core.ts";
import type { PlannedTask, PlannedTaskScope } from "./graph.ts";

/** Returns the declared scope for one Task without inferring membership from activation state. */
export function scopeForTask(
  compiled: CompiledAdmissionGraph,
  task: PlannedTask
): PlannedTaskScope | undefined {
  return task.scopeId === undefined ? undefined : compiled.scopesById.get(task.scopeId);
}

/** Returns the inactive constrained scope that this Task would activate. */
export function tighteningScopeForTask(
  compiled: CompiledAdmissionGraph,
  maxParallel: number,
  activeScopeIds: ReadonlySet<string>,
  task: PlannedTask
): PlannedTaskScope | undefined {
  const scope = scopeForTask(compiled, task);
  const taskSlot = compiled.taskSlotsById.get(task.id);
  if (
    scope === undefined ||
    taskSlot === undefined ||
    !compiled.taskActivatesScope[taskSlot] ||
    activeScopeIds.has(scope.id) ||
    scope.maxParallel >= maxParallel
  ) {
    return undefined;
  }
  return scope;
}

/** Reports whether a Task continues an active scope that constrains root parallelism. */
export function isConstrainedScopeContinuation(
  compiled: CompiledAdmissionGraph,
  maxParallel: number,
  activeScopeIds: ReadonlySet<string>,
  task: PlannedTask
): boolean {
  const scope = scopeForTask(compiled, task);
  return scope !== undefined && activeScopeIds.has(scope.id) && scope.maxParallel < maxParallel;
}

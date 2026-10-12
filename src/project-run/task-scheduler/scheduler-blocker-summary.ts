import type { SchedulerInspection } from "./scheduler-decision-inspection.ts";
import type { SchedulerBlockerSummary, SchedulerCapacity } from "./scheduler-decision-model.ts";

/** Summarizes why pending Tasks cannot currently advance. */
export function summarizeSchedulerBlockers(
  state: SchedulerInspection,
  capacity: SchedulerCapacity
): SchedulerBlockerSummary {
  const settledKindsByTaskId = new Map(
    state.settledTasks.map(({ taskId, kind }) => [taskId, kind])
  );
  const runningMutexes = new Set(state.runningMutexes);
  const resourcesById = new Map(state.resources.map((resource) => [resource.resourceId, resource]));
  let dependency = 0;
  let mutex = 0;
  let resourceCapacity = 0;
  for (const task of state.pendingTasks) {
    if (hasUnsatisfiedRelation(task, settledKindsByTaskId)) {
      dependency += 1;
      continue;
    }
    if (hasRunningMutex(task.mutex, runningMutexes)) mutex += 1;
    else if (hasResourceShortage(task.resourceClaims, resourcesById)) resourceCapacity += 1;
  }
  return Object.freeze({
    dependency,
    mutex,
    resourceCapacity,
    rootCapacity: state.runningTaskIds.length >= state.maxParallel,
    scopeCapacity:
      capacity.effectiveMaxParallel < state.maxParallel &&
      state.runningTaskIds.length >= capacity.effectiveMaxParallel
  });
}

function hasResourceShortage(
  claims: SchedulerInspection["pendingTasks"][number]["resourceClaims"],
  resourcesById: ReadonlyMap<string, SchedulerInspection["resources"][number]>
): boolean {
  return claims.some((claim) => {
    const resource = resourcesById.get(claim.resourceId);
    return resource === undefined || claim.units > resource.available;
  });
}

function hasUnsatisfiedRelation(
  task: SchedulerInspection["pendingTasks"][number],
  settledKindsByTaskId: ReadonlyMap<string, SchedulerInspection["settledTasks"][number]["kind"]>
): boolean {
  return (
    task.dependsOn.some((dependencyId) => settledKindsByTaskId.get(dependencyId) !== "completed") ||
    task.observes.some((observationId) => settledKindsByTaskId.get(observationId) === undefined)
  );
}

function hasRunningMutex(
  mutexNames: readonly string[],
  runningMutexes: ReadonlySet<string>
): boolean {
  return mutexNames.some((mutexName) => runningMutexes.has(mutexName));
}

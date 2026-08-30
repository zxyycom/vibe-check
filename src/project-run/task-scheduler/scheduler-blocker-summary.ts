import type { SchedulerInspection } from "./scheduler-decision-inspection.ts";
import type { SchedulerBlockerSummary, SchedulerCapacity } from "./scheduler-decision-model.ts";

/** Summarizes why pending Tasks cannot currently advance. */
export function summarizeSchedulerBlockers(
  state: SchedulerInspection,
  capacity: SchedulerCapacity
): SchedulerBlockerSummary {
  let dependency = 0;
  let mutex = 0;
  for (const task of state.pendingTasks) {
    if (hasUncompletedDependency(task.dependsOn, state.settlementKindByTaskId)) {
      dependency += 1;
      continue;
    }
    if (hasRunningMutex(task.mutex, state.runningMutexes)) mutex += 1;
  }
  return Object.freeze({
    dependency,
    mutex,
    rootCapacity: state.runningTaskIds.size >= state.maxParallel,
    scopeCapacity:
      capacity.effectiveMaxParallel < state.maxParallel &&
      state.runningTaskIds.size >= capacity.effectiveMaxParallel
  });
}

function hasUncompletedDependency(
  dependencyIds: readonly string[],
  settlementKindByTaskId: SchedulerInspection["settlementKindByTaskId"]
): boolean {
  return dependencyIds.some(
    (dependencyId) => settlementKindByTaskId.get(dependencyId) !== "completed"
  );
}

function hasRunningMutex(
  mutexNames: readonly string[],
  runningMutexes: SchedulerInspection["runningMutexes"]
): boolean {
  return mutexNames.some((mutexName) => runningMutexes.has(mutexName));
}

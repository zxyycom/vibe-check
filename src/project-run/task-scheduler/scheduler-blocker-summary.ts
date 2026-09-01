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
    if (hasUnsatisfiedRelation(task, state.settledTasks)) {
      dependency += 1;
      continue;
    }
    if (hasRunningMutex(task.mutex, state.runningMutexes)) mutex += 1;
  }
  return Object.freeze({
    dependency,
    mutex,
    rootCapacity: state.runningTaskIds.length >= state.maxParallel,
    scopeCapacity:
      capacity.effectiveMaxParallel < state.maxParallel &&
      state.runningTaskIds.length >= capacity.effectiveMaxParallel
  });
}

function hasUnsatisfiedRelation(
  task: SchedulerInspection["pendingTasks"][number],
  settledTasks: SchedulerInspection["settledTasks"]
): boolean {
  return (
    task.dependsOn.some(
      (dependencyId) => settlementKindFor(settledTasks, dependencyId) !== "completed"
    ) ||
    task.observes.some(
      (observationId) => settlementKindFor(settledTasks, observationId) === undefined
    )
  );
}

function hasRunningMutex(
  mutexNames: readonly string[],
  runningMutexes: SchedulerInspection["runningMutexes"]
): boolean {
  return mutexNames.some((mutexName) => runningMutexes.includes(mutexName));
}

function settlementKindFor(
  settledTasks: SchedulerInspection["settledTasks"],
  taskId: string
): SchedulerInspection["settledTasks"][number]["kind"] | undefined {
  return settledTasks.find((task) => task.taskId === taskId)?.kind;
}

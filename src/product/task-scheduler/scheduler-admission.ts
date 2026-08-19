import type { PlannedTask } from "./graph.ts";
import {
  cancelPendingTasks,
  scopeForTask,
  type RunningTaskCompletion,
  type SchedulerState,
  type TaskSettlement
} from "./scheduler-model.ts";

/** Admits ready work according to dependencies, mutexes, and active scope caps. */
export function admitReadyTasks<TResult>(state: SchedulerState<TResult>): void {
  while (state.runningById.size < state.maxParallel) {
    if (state.signal?.aborted === true) {
      state.isCancelled = true;
      cancelPendingTasks(state);
      return;
    }
    const task = selectNextReadyTask(state);
    if (task === undefined) return;
    admitTask(state, task);
  }
}

function selectNextReadyTask<TResult>(state: SchedulerState<TResult>): PlannedTask | undefined {
  const readyTasks = state.pending.filter((task) => canAdmitTask(task, state));
  if (readyTasks.length === 0) return undefined;

  const effectiveMaxParallel = effectiveMaxParallelFor(state);
  const reservation = reservedTask(state, readyTasks);
  if (reservation !== undefined) {
    return state.runningById.size < prospectiveMaxParallel(state, reservation)
      ? reservation
      : undefined;
  }

  const tightening = readyTasks
    .filter((task) => activatesTighteningScope(task, state, effectiveMaxParallel))
    .sort((left, right) => compareConstrainedTasks(left, right, state));
  if (tightening.length > 0) {
    const task = tightening[0];
    if (state.runningById.size < prospectiveMaxParallel(state, task)) return task;
    state.reservationTaskId = task.id;
    return undefined;
  }

  const constrainedContinuations = readyTasks
    .filter((task) => isConstrainedContinuation(task, state, effectiveMaxParallel))
    .sort((left, right) => compareConstrainedTasks(left, right, state));
  if (constrainedContinuations.length > 0) {
    return state.runningById.size < effectiveMaxParallel ? constrainedContinuations[0] : undefined;
  }

  return state.runningById.size < effectiveMaxParallel ? readyTasks[0] : undefined;
}

function reservedTask<TResult>(
  state: SchedulerState<TResult>,
  readyTasks: readonly PlannedTask[]
): PlannedTask | undefined {
  if (state.reservationTaskId === undefined) return undefined;

  const task = readyTasks.find((candidate) => candidate.id === state.reservationTaskId);
  if (task !== undefined) return task;

  state.reservationTaskId = undefined;
  return undefined;
}

function canAdmitTask<TResult>(task: PlannedTask, state: SchedulerState<TResult>): boolean {
  return (
    task.dependsOn.every(
      (dependencyId) => state.settlementsByTaskId.get(dependencyId)?.kind === "completed"
    ) && task.mutex.every((mutex) => !state.runningMutexes.has(mutex))
  );
}

function effectiveMaxParallelFor<TResult>(state: SchedulerState<TResult>): number {
  let effective = state.maxParallel;
  for (const runtimeScope of state.scopesById.values()) {
    if (runtimeScope.isActive) {
      effective = Math.min(effective, runtimeScope.scope.maxParallel);
    }
  }
  return effective;
}

function prospectiveMaxParallel<TResult>(
  state: SchedulerState<TResult>,
  task: PlannedTask
): number {
  const scope = scopeForTask(task, state);
  return scope?.activationTaskIds.has(task.id) === true && !scope.isActive
    ? Math.min(effectiveMaxParallelFor(state), scope.scope.maxParallel)
    : effectiveMaxParallelFor(state);
}

function activatesTighteningScope<TResult>(
  task: PlannedTask,
  state: SchedulerState<TResult>,
  effectiveMaxParallel: number
): boolean {
  const scope = scopeForTask(task, state);
  return (
    scope?.activationTaskIds.has(task.id) === true &&
    !scope.isActive &&
    scope.scope.maxParallel < effectiveMaxParallel
  );
}

function isConstrainedContinuation<TResult>(
  task: PlannedTask,
  state: SchedulerState<TResult>,
  effectiveMaxParallel: number
): boolean {
  const scope = scopeForTask(task, state);
  return (
    scope?.isActive === true &&
    scope.scope.maxParallel < state.maxParallel &&
    scope.scope.maxParallel === effectiveMaxParallel
  );
}

function compareConstrainedTasks<TResult>(
  left: PlannedTask,
  right: PlannedTask,
  state: SchedulerState<TResult>
): number {
  const leftScope = scopeForTask(left, state);
  const rightScope = scopeForTask(right, state);
  if (leftScope === undefined || rightScope === undefined) {
    throw new Error("constrained task is missing a scope");
  }
  return (
    leftScope.scope.maxParallel - rightScope.scope.maxParallel ||
    compareText(leftScope.scope.id, rightScope.scope.id) ||
    compareText(left.id, right.id)
  );
}

function compareText(left: string, right: string): number {
  if (left < right) return -1;
  if (left > right) return 1;
  return 0;
}

function admitTask<TResult>(state: SchedulerState<TResult>, task: PlannedTask): void {
  const index = state.pending.indexOf(task);
  if (index < 0) {
    throw new Error(`task ${task.id} is not pending at admission`);
  }
  state.pending.splice(index, 1);
  for (const mutex of task.mutex) {
    state.runningMutexes.add(mutex);
  }

  const scope = scopeForTask(task, state);
  if (scope?.activationTaskIds.has(task.id) === true) {
    scope.isActive = true;
  }
  if (state.reservationTaskId === task.id) {
    state.reservationTaskId = undefined;
  }

  const completion = Promise.resolve()
    .then(() => state.execute(task, Object.freeze({ signal: state.signal })))
    .then((value) => completedTaskCompletion(task.id, value))
    .catch((error: unknown) => failedTaskCompletion<TResult>(task.id, error));
  state.runningById.set(task.id, { task, completion });
}

function completedTaskCompletion<TResult>(
  taskId: string,
  value: TResult
): RunningTaskCompletion<TResult> {
  const settlement: TaskSettlement<TResult> = { kind: "completed", value };
  return Object.freeze({ taskId, settlement: Object.freeze(settlement) });
}

function failedTaskCompletion<TResult>(
  taskId: string,
  error: unknown
): RunningTaskCompletion<TResult> {
  const settlement: TaskSettlement<TResult> = { kind: "failed", error };
  return Object.freeze({ taskId, settlement: Object.freeze(settlement) });
}

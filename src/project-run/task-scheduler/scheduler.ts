import { prepareTaskGraph, type PlannedTask } from "./graph.ts";
import { admitReadyTasks } from "./scheduler-admission.ts";
import {
  cancelPendingTasks,
  createSchedulerState,
  recordSettlement,
  type RunningTaskCompletion,
  type RunTaskGraphOptions,
  type SchedulerState,
  type TaskGraphRun,
  type TaskSettlement
} from "./execution-state.ts";

export type {
  RunTaskGraphOptions,
  SettledTask,
  TaskExecutionContext,
  TaskGraphRun,
  TaskSettlement
} from "./execution-state.ts";

export async function runTaskGraph<TResult>(
  options: RunTaskGraphOptions<TResult>
): Promise<TaskGraphRun<TResult>> {
  const graph = prepareTaskGraph(options.graph, options.maxParallel);
  const state = createSchedulerState(graph, options);

  while (state.pending.length > 0 || state.runningById.size > 0) {
    if (state.signal?.aborted === true) {
      state.isCancelled = true;
      cancelPendingTasks(state);
    } else {
      settleBlockedPendingTasks(state);
      admitReadyTasks(state);
    }

    if (state.runningById.size === 0) {
      if (state.pending.length > 0) {
        throw new Error(`unable to settle task graph: ${describePendingTasks(state)}`);
      }
      continue;
    }

    settleRunningTask(state, await nextRunningSettlement(state));
  }

  return Object.freeze({
    cancelled: state.isCancelled,
    settlements: Object.freeze(
      graph.tasks.map((task) => {
        const settlement = state.settlementsByTaskId.get(task.id);
        if (settlement === undefined) {
          throw new Error(`task ${task.id} was not settled`);
        }
        return Object.freeze({ task, settlement });
      })
    )
  });
}

function settleBlockedPendingTasks<TResult>(state: SchedulerState<TResult>): void {
  let didSettleBlockedTask = true;
  while (didSettleBlockedTask) {
    didSettleBlockedTask = false;
    for (let index = state.pending.length - 1; index >= 0; index -= 1) {
      const task = state.pending[index];
      const dependencyIds = blockingDependencyIds(task, state.settlementsByTaskId);
      if (dependencyIds === undefined) {
        continue;
      }
      state.pending.splice(index, 1);
      recordSettlement(
        state,
        task,
        Object.freeze({
          kind: "blocked",
          dependencyIds: Object.freeze(dependencyIds)
        })
      );
      didSettleBlockedTask = true;
    }
  }
}

function blockingDependencyIds<TResult>(
  task: PlannedTask,
  settlementsByTaskId: ReadonlyMap<string, TaskSettlement<TResult>>
): string[] | undefined {
  const settlements = task.dependsOn.map(
    (dependencyId) => [dependencyId, settlementsByTaskId.get(dependencyId)] as const
  );
  if (settlements.some(([, settlement]) => settlement === undefined)) {
    return undefined;
  }
  const dependencyIds = settlements.flatMap(([dependencyId, settlement]) =>
    settlement?.kind === "completed" ? [] : [dependencyId]
  );
  return dependencyIds.length === 0 ? undefined : dependencyIds;
}

async function nextRunningSettlement<TResult>(
  state: SchedulerState<TResult>
): Promise<RunningTaskCompletion<TResult>> {
  return Promise.race([...state.runningById.values()].map((running) => running.completion));
}

function settleRunningTask<TResult>(
  state: SchedulerState<TResult>,
  result: RunningTaskCompletion<TResult>
): void {
  const running = state.runningById.get(result.taskId);
  if (running === undefined) {
    throw new Error(`task ${result.taskId} settled without admission`);
  }
  state.runningById.delete(result.taskId);
  for (const mutex of running.task.mutex) {
    state.runningMutexes.delete(mutex);
  }
  recordSettlement(state, running.task, result.settlement);
}

function describePendingTasks<TResult>(state: SchedulerState<TResult>): string {
  return state.pending
    .map((task) => {
      const unsettled = task.dependsOn.filter(
        (dependencyId) => !state.settlementsByTaskId.has(dependencyId)
      );
      return unsettled.length > 0 ? `${task.id} waits for ${unsettled.join(", ")}` : task.id;
    })
    .join("; ");
}

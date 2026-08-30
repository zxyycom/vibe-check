import { prepareTaskGraph, type PlannedTask } from "./graph.ts";
import { diagnosticTags } from "../diagnostic-logging/logger.ts";
import {
  decideScheduler,
  type SchedulerDecision,
  type SchedulerTrigger
} from "./scheduler-decision.ts";
import {
  cancelPendingTasks,
  createSchedulerState,
  recordSettlement,
  snapshotSchedulerState,
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
  let trigger: SchedulerTrigger = Object.freeze({ kind: "execution-started" });

  while (true) {
    const decision = decideScheduler(snapshotSchedulerState(state), trigger);
    observeSchedulerDecision(state, decision);

    switch (decision.kind) {
      case "admit":
        applyAdmission(state, decision);
        trigger = Object.freeze({ kind: "admission-continued" });
        continue;
      case "settle-blocked":
        applyBlockedSettlement(state, decision);
        trigger = Object.freeze({ kind: "blocked-settled", taskId: decision.taskId });
        continue;
      case "cancel-pending":
        applyCancellation(state, decision);
        trigger = Object.freeze({ kind: "cancellation-applied" });
        continue;
      case "await-running": {
        applyReservationUpdate(state, decision.reservationUpdate);
        const completion = await nextRunningSettlement(state);
        settleRunningTask(state, completion);
        trigger = Object.freeze({
          kind: "task-settled",
          settlementKind: completion.settlement.kind,
          taskId: completion.taskId
        });
        continue;
      }
      case "complete":
        return buildTaskGraphRun(state);
    }
  }
}

function observeSchedulerDecision<TResult>(
  state: SchedulerState<TResult>,
  decision: SchedulerDecision
): void {
  state.diagnosticLogger?.observe({
    event: "scheduler.decision",
    tags: schedulerDecisionTags(decision),
    details: decision
  });
}

function schedulerDecisionTags(decision: SchedulerDecision): readonly string[] {
  return diagnosticTags(
    "SCHEDULER",
    decision.kind.toUpperCase(),
    ...("taskId" in decision ? [`TASK:${decision.taskId}`] : [])
  );
}

function applyAdmission<TResult>(
  state: SchedulerState<TResult>,
  decision: Extract<SchedulerDecision, { readonly kind: "admit" }>
): void {
  const task = takePendingTask(state, decision.taskId, "admission");
  applyReservationUpdate(state, decision.reservationUpdate);
  for (const mutex of task.mutex) {
    state.runningMutexes.add(mutex);
  }
  activateScope(state, decision.scopeToActivate);

  const completion = Promise.resolve()
    .then(() => state.execute(task, Object.freeze({ signal: state.signal })))
    .then((value) => completedTaskCompletion(task.id, value))
    .catch((error: unknown) => failedTaskCompletion<TResult>(task.id, error));
  state.runningById.set(task.id, { task, completion });
}

function activateScope<TResult>(state: SchedulerState<TResult>, scopeId: string | null): void {
  if (scopeId === null) return;
  const scope = state.scopesById.get(scopeId);
  if (scope === undefined)
    throw new Error(`scheduler admission references unknown scope ${scopeId}`);
  scope.isActive = true;
}

function applyBlockedSettlement<TResult>(
  state: SchedulerState<TResult>,
  decision: Extract<SchedulerDecision, { readonly kind: "settle-blocked" }>
): void {
  const task = takePendingTask(state, decision.taskId, "blocked settlement");
  recordSettlement(
    state,
    task,
    Object.freeze({ kind: "blocked", dependencyIds: decision.dependencyIds })
  );
}

function applyCancellation<TResult>(
  state: SchedulerState<TResult>,
  decision: Extract<SchedulerDecision, { readonly kind: "cancel-pending" }>
): void {
  const pendingTaskIds = state.pending.map((task) => task.id);
  if (!sameTaskIds(pendingTaskIds, decision.taskIds)) {
    throw new Error("scheduler cancellation decision no longer matches pending tasks");
  }
  if ((state.reservationTaskId ?? null) !== decision.reservation.taskId) {
    throw new Error("scheduler cancellation decision no longer matches reservation state");
  }
  cancelPendingTasks(state);
}

function applyReservationUpdate<TResult>(
  state: SchedulerState<TResult>,
  reservation: Extract<
    SchedulerDecision,
    { readonly kind: "admit" | "await-running" }
  >["reservationUpdate"]
): void {
  switch (reservation.kind) {
    case "unchanged":
      return;
    case "set":
      state.reservationTaskId = reservation.taskId;
      return;
    case "clear":
      state.reservationTaskId = undefined;
      return;
  }
}

function takePendingTask<TResult>(
  state: SchedulerState<TResult>,
  taskId: string,
  action: string
): PlannedTask {
  const index = state.pending.findIndex((task) => task.id === taskId);
  if (index < 0) throw new Error(`task ${taskId} is not pending for ${action}`);
  const [task] = state.pending.splice(index, 1);
  if (task === undefined) throw new Error(`task ${taskId} disappeared during ${action}`);
  return task;
}

async function nextRunningSettlement<TResult>(
  state: SchedulerState<TResult>
): Promise<RunningTaskCompletion<TResult>> {
  if (state.runningById.size === 0) {
    throw new Error("scheduler cannot await a task when no task is running");
  }
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

function buildTaskGraphRun<TResult>(state: SchedulerState<TResult>): TaskGraphRun<TResult> {
  return Object.freeze({
    cancelled: state.isCancelled,
    settlements: Object.freeze(
      state.graph.tasks.map((task) => {
        const settlement = state.settlementsByTaskId.get(task.id);
        if (settlement === undefined) {
          throw new Error(`task ${task.id} was not settled`);
        }
        return Object.freeze({ task, settlement });
      })
    )
  });
}

function sameTaskIds(left: readonly string[], right: readonly string[]): boolean {
  return left.length === right.length && left.every((taskId, index) => taskId === right[index]);
}

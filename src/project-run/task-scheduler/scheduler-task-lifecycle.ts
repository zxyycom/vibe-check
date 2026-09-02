import type { PlannedTask } from "./graph.ts";
import {
  cancelPendingTasks,
  recordSettlement,
  type RunningTaskCompletion,
  type RunTaskGraphOptions,
  type SchedulerState,
  type TaskGraphRun,
  type TaskSettlement
} from "./execution-state.ts";
import type { SchedulerDecision } from "./scheduler-decision.ts";
import type { AdmissionPolicyFault } from "./scheduler-admission-decision.ts";

export function applyAdmissionPolicyFault<TResult>(
  state: SchedulerState<TResult>,
  fault: AdmissionPolicyFault
): void {
  if (state.admissionPolicyFault !== undefined) {
    throw new Error("scheduler received more than one admission policy fault");
  }
  state.admissionPolicyFault = fault.category;
  cancelPendingTasks(state);
}

export function applyAdmission<TResult>(
  state: SchedulerState<TResult>,
  decision: Extract<SchedulerDecision, { readonly kind: "admit" }>
): void {
  const task = takePendingTask(state, decision.taskId, "admission");
  for (const mutex of task.mutex) state.runningMutexes.add(mutex);
  activateScope(state, decision.scopeToActivate);

  const completion = Promise.resolve()
    .then(() => state.execute(task, Object.freeze({ signal: state.signal })))
    .then((value) => completedTaskCompletion(task.id, value, state.isPrerequisiteSatisfied))
    .catch((error: unknown) => failedTaskCompletion<TResult>(task.id, error));
  state.runningById.set(task.id, { task, completion });
}

export function applyBlockedSettlement<TResult>(
  state: SchedulerState<TResult>,
  decision: Extract<SchedulerDecision, { readonly kind: "settle-blocked" }>
): void {
  const task = takePendingTask(state, decision.taskId, "blocked settlement");
  recordSettlement(
    state,
    task,
    Object.freeze({ kind: "blocked", dependencyIds: decision.dependencyIds })
  );
  state.onTaskBlocked?.(task, decision.dependencyIds);
}

export function applyCancellation<TResult>(
  state: SchedulerState<TResult>,
  decision: Extract<SchedulerDecision, { readonly kind: "cancel-pending" }>
): void {
  const pendingTaskIds = state.pending.map((task) => task.id);
  if (!sameTaskIds(pendingTaskIds, decision.taskIds)) {
    throw new Error("scheduler cancellation decision no longer matches pending tasks");
  }
  cancelPendingTasks(state);
}

export async function nextRunningSettlement<TResult>(
  state: SchedulerState<TResult>
): Promise<RunningTaskCompletion<TResult>> {
  if (state.runningById.size === 0) {
    throw new Error("scheduler cannot await a task when no task is running");
  }
  return Promise.race([...state.runningById.values()].map((running) => running.completion));
}

export function settleRunningTask<TResult>(
  state: SchedulerState<TResult>,
  result: RunningTaskCompletion<TResult>
): void {
  const running = state.runningById.get(result.taskId);
  if (running === undefined) throw new Error(`task ${result.taskId} settled without admission`);
  state.runningById.delete(result.taskId);
  for (const mutex of running.task.mutex) state.runningMutexes.delete(mutex);
  recordSettlement(state, running.task, result.settlement);
}

export function buildTaskGraphRun<TResult>(state: SchedulerState<TResult>): TaskGraphRun<TResult> {
  return Object.freeze({
    admissionPolicyFault: state.admissionPolicyFault,
    cancelled: state.isCancelled,
    settlements: Object.freeze(
      state.graph.tasks.map((task) => {
        const settlement = state.settlementsByTaskId.get(task.id);
        if (settlement === undefined) throw new Error(`task ${task.id} was not settled`);
        return Object.freeze({ task, settlement });
      })
    )
  });
}

function activateScope<TResult>(state: SchedulerState<TResult>, scopeId: string | null): void {
  if (scopeId === null) return;
  const scope = state.scopesById.get(scopeId);
  if (scope === undefined) {
    throw new Error(`scheduler admission references unknown scope ${scopeId}`);
  }
  scope.isActive = true;
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

function completedTaskCompletion<TResult>(
  taskId: string,
  value: TResult,
  isPrerequisiteSatisfied: RunTaskGraphOptions<TResult>["isPrerequisiteSatisfied"]
): RunningTaskCompletion<TResult> {
  const settlement: TaskSettlement<TResult> =
    isPrerequisiteSatisfied?.(value) === false
      ? { kind: "prerequisite-unsatisfied", value }
      : { kind: "completed", value };
  return Object.freeze({ taskId, settlement: Object.freeze(settlement) });
}

function failedTaskCompletion<TResult>(
  taskId: string,
  error: unknown
): RunningTaskCompletion<TResult> {
  const settlement: TaskSettlement<TResult> = { kind: "failed", error };
  return Object.freeze({ taskId, settlement: Object.freeze(settlement) });
}

function sameTaskIds(left: readonly string[], right: readonly string[]): boolean {
  return left.length === right.length && left.every((taskId, index) => taskId === right[index]);
}

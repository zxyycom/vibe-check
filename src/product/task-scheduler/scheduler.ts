import {
  prepareTaskGraph,
  type PlannedTask,
  type PlannedTaskGraph,
  type PlannedTaskScope,
  type TaskGraph
} from "./graph.ts";

export type TaskSettlement<TResult> = Readonly<
  | { readonly kind: "completed"; readonly value: TResult }
  | { readonly kind: "failed"; readonly error: unknown }
  | { readonly kind: "blocked"; readonly dependencyIds: readonly string[] }
  | { readonly kind: "cancelled-before-start" }
>;

export interface SettledTask<TResult> {
  readonly task: PlannedTask;
  readonly settlement: TaskSettlement<TResult>;
}

export interface TaskExecutionContext {
  readonly signal: AbortSignal | undefined;
}

export interface TaskGraphRun<TResult> {
  readonly cancelled: boolean;
  /** One entry per static graph Task, in static graph order. */
  readonly settlements: readonly SettledTask<TResult>[];
}

export interface RunTaskGraphOptions<TResult> {
  readonly graph: TaskGraph;
  readonly maxParallel: number;
  readonly signal?: AbortSignal;
  readonly execute: (
    task: PlannedTask,
    context: TaskExecutionContext
  ) => TResult | Promise<TResult>;
}

type RunningTaskCompletion<TResult> = Readonly<{
  readonly taskId: string;
  readonly settlement: TaskSettlement<TResult>;
}>;

interface RunningTask<TResult> {
  readonly task: PlannedTask;
  readonly completion: Promise<RunningTaskCompletion<TResult>>;
}

interface RuntimeScope {
  readonly scope: PlannedTaskScope;
  readonly activationTaskIds: ReadonlySet<string>;
  isActive: boolean;
}

interface SchedulerState<TResult> {
  readonly graph: PlannedTaskGraph;
  readonly maxParallel: number;
  readonly signal: AbortSignal | undefined;
  readonly execute: RunTaskGraphOptions<TResult>["execute"];
  readonly pending: PlannedTask[];
  readonly runningById: Map<string, RunningTask<TResult>>;
  readonly runningMutexes: Set<string>;
  readonly settlementsByTaskId: Map<string, TaskSettlement<TResult>>;
  readonly scopesById: ReadonlyMap<string, RuntimeScope>;
  reservationTaskId: string | undefined;
  isCancelled: boolean;
}

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

function createSchedulerState<TResult>(
  graph: PlannedTaskGraph,
  options: RunTaskGraphOptions<TResult>
): SchedulerState<TResult> {
  const scopesById = new Map<string, RuntimeScope>();
  for (const scope of graph.scopes) {
    scopesById.set(scope.id, {
      scope,
      activationTaskIds: new Set(scope.activationTaskIds),
      isActive: false
    });
  }
  return {
    graph,
    maxParallel: options.maxParallel,
    signal: options.signal,
    execute: options.execute,
    pending: [...graph.tasks],
    runningById: new Map(),
    runningMutexes: new Set(),
    settlementsByTaskId: new Map(),
    scopesById,
    reservationTaskId: undefined,
    isCancelled: false
  };
}

function cancelPendingTasks<TResult>(state: SchedulerState<TResult>): void {
  state.reservationTaskId = undefined;
  while (state.pending.length > 0) {
    const task = state.pending.shift();
    if (task === undefined) {
      throw new Error("task graph pending queue changed unexpectedly");
    }
    recordSettlement(state, task, Object.freeze({ kind: "cancelled-before-start" }));
  }
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

function admitReadyTasks<TResult>(state: SchedulerState<TResult>): void {
  while (state.runningById.size < state.maxParallel) {
    if (state.signal?.aborted === true) {
      state.isCancelled = true;
      cancelPendingTasks(state);
      return;
    }
    const task = selectNextReadyTask(state);
    if (task === undefined) {
      return;
    }
    admitTask(state, task);
  }
}

function selectNextReadyTask<TResult>(state: SchedulerState<TResult>): PlannedTask | undefined {
  const readyTasks = state.pending.filter((task) => canAdmitTask(task, state));
  if (readyTasks.length === 0) {
    return undefined;
  }

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
    if (state.runningById.size < prospectiveMaxParallel(state, task)) {
      return task;
    }
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
  if (state.reservationTaskId === undefined) {
    return undefined;
  }
  const task = readyTasks.find((candidate) => candidate.id === state.reservationTaskId);
  if (task !== undefined) {
    return task;
  }
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

function recordSettlement<TResult>(
  state: SchedulerState<TResult>,
  task: PlannedTask,
  settlement: TaskSettlement<TResult>
): void {
  if (state.settlementsByTaskId.has(task.id)) {
    throw new Error(`task ${task.id} settled more than once`);
  }
  state.settlementsByTaskId.set(task.id, settlement);
  const scope = scopeForTask(task, state);
  if (scope?.scope.terminalTaskId === task.id) {
    scope.isActive = false;
  }
}

function scopeForTask<TResult>(
  task: PlannedTask,
  state: SchedulerState<TResult>
): RuntimeScope | undefined {
  return task.scopeId === undefined ? undefined : state.scopesById.get(task.scopeId);
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

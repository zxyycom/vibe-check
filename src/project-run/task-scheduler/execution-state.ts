import type { PlannedTask, PlannedTaskGraph, PlannedTaskScope, TaskGraph } from "./graph.ts";

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

export type RunningTaskCompletion<TResult> = Readonly<{
  readonly taskId: string;
  readonly settlement: TaskSettlement<TResult>;
}>;

export interface RunningTask<TResult> {
  readonly task: PlannedTask;
  readonly completion: Promise<RunningTaskCompletion<TResult>>;
}

export interface RuntimeScope {
  readonly scope: PlannedTaskScope;
  readonly activationTaskIds: ReadonlySet<string>;
  isActive: boolean;
}

export interface SchedulerState<TResult> {
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

export function createSchedulerState<TResult>(
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

export function scopeForTask<TResult>(
  task: PlannedTask,
  state: SchedulerState<TResult>
): RuntimeScope | undefined {
  return task.scopeId === undefined ? undefined : state.scopesById.get(task.scopeId);
}

export function cancelPendingTasks<TResult>(state: SchedulerState<TResult>): void {
  state.reservationTaskId = undefined;
  while (state.pending.length > 0) {
    const task = state.pending.shift();
    if (task === undefined) {
      throw new Error("task graph pending queue changed unexpectedly");
    }
    recordSettlement(state, task, Object.freeze({ kind: "cancelled-before-start" }));
  }
}

export function recordSettlement<TResult>(
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

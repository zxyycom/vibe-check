import type { PlannedTask, PlannedTaskGraph, PlannedTaskScope, TaskGraph } from "./graph.ts";
import {
  staticAdmissionSelectionPolicy,
  type AdmissionSelectionPolicy
} from "./admission-selection-policy.ts";
import type { DiagnosticLogger } from "../diagnostic-logging/logger.ts";
import type { SchedulerSnapshot } from "./scheduler-decision.ts";
import type { AdmissionPolicyFaultCategory } from "./scheduler-admission-decision.ts";
import type { SchedulerPerformanceDiagnosticsInput } from "./scheduler-performance-diagnostics.ts";

export type TaskSettlement<TResult> = Readonly<
  | { readonly kind: "completed"; readonly value: TResult }
  | { readonly kind: "prerequisite-unsatisfied"; readonly value: TResult }
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
  readonly admissionPolicyFault: AdmissionPolicyFaultCategory | undefined;
  readonly cancelled: boolean;
  /** One entry per static graph Task, in static graph order. */
  readonly settlements: readonly SettledTask<TResult>[];
}

export interface RunTaskGraphOptions<TResult> {
  /** Product-private policy handoff; package consumers cannot author this through the public API. */
  readonly admissionPolicy?: AdmissionSelectionPolicy;
  readonly diagnosticLogger?: DiagnosticLogger;
  /** Explicit enabled-only handoff; no Scheduler behavior is inferred from a logger shape. */
  readonly performanceDiagnostics?: SchedulerPerformanceDiagnosticsInput;
  readonly graph: TaskGraph;
  readonly maxParallel: number;
  readonly signal?: AbortSignal;
  readonly execute: (
    task: PlannedTask,
    context: TaskExecutionContext
  ) => TResult | Promise<TResult>;
  /** Maps a completed Task's opaque product value to prerequisite satisfaction. */
  readonly isPrerequisiteSatisfied?: (value: TResult) => boolean;
  /** Lets a product close a blocked Task before any terminal observer can be admitted. */
  readonly onTaskBlocked?: (task: PlannedTask, dependencyIds: readonly string[]) => void;
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
  readonly admissionPolicy: AdmissionSelectionPolicy;
  readonly diagnosticLogger: DiagnosticLogger | undefined;
  readonly graph: PlannedTaskGraph;
  readonly isPrerequisiteSatisfied: RunTaskGraphOptions<TResult>["isPrerequisiteSatisfied"];
  readonly maxParallel: number;
  readonly signal: AbortSignal | undefined;
  readonly execute: RunTaskGraphOptions<TResult>["execute"];
  readonly onTaskBlocked: RunTaskGraphOptions<TResult>["onTaskBlocked"];
  readonly pending: PlannedTask[];
  readonly runningById: Map<string, RunningTask<TResult>>;
  readonly runningMutexes: Set<string>;
  readonly settlementsByTaskId: Map<string, TaskSettlement<TResult>>;
  readonly scopesById: ReadonlyMap<string, RuntimeScope>;
  isCancelled: boolean;
  admissionPolicyFault: AdmissionPolicyFaultCategory | undefined;
}

export function createSchedulerState<TResult>(
  graph: PlannedTaskGraph,
  options: RunTaskGraphOptions<TResult>
): SchedulerState<TResult> {
  const admissionPolicy = options.admissionPolicy ?? staticAdmissionSelectionPolicy;
  if (!Object.isFrozen(admissionPolicy) || typeof admissionPolicy.decide !== "function") {
    throw new TypeError("task engine admission policy must be a frozen policy value");
  }
  const scopesById = new Map<string, RuntimeScope>();
  for (const scope of graph.scopes) {
    scopesById.set(scope.id, {
      scope,
      activationTaskIds: new Set(scope.activationTaskIds),
      isActive: false
    });
  }
  return {
    admissionPolicy,
    diagnosticLogger: options.diagnosticLogger,
    graph,
    isPrerequisiteSatisfied: options.isPrerequisiteSatisfied,
    maxParallel: options.maxParallel,
    onTaskBlocked: options.onTaskBlocked,
    signal: options.signal,
    execute: options.execute,
    pending: [...graph.tasks],
    runningById: new Map(),
    runningMutexes: new Set(),
    settlementsByTaskId: new Map(),
    scopesById,
    isCancelled: false,
    admissionPolicyFault: undefined
  };
}

/** Projects mutable execution state into the pure scheduler-decision input. */
export function snapshotSchedulerState<TResult>(state: SchedulerState<TResult>): SchedulerSnapshot {
  return Object.freeze({
    activeScopeIds: Object.freeze(
      [...state.scopesById.values()]
        .filter((scope) => scope.isActive)
        .map((scope) => scope.scope.id)
    ),
    graph: state.graph,
    isAbortRequested: state.signal?.aborted === true,
    isCancelled: state.isCancelled,
    maxParallel: state.maxParallel,
    pendingTaskIds: Object.freeze(state.pending.map((task) => task.id)),
    runningMutexes: Object.freeze([...state.runningMutexes]),
    runningTaskIds: Object.freeze([...state.runningById.keys()]),
    settledTasks: Object.freeze(
      [...state.settlementsByTaskId].map(([taskId, settlement]) =>
        Object.freeze({ kind: settlement.kind, taskId })
      )
    )
  });
}

export function scopeForTask<TResult>(
  task: PlannedTask,
  state: SchedulerState<TResult>
): RuntimeScope | undefined {
  return task.scopeId === undefined ? undefined : state.scopesById.get(task.scopeId);
}

export function cancelPendingTasks<TResult>(state: SchedulerState<TResult>): void {
  state.isCancelled = true;
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

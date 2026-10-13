import { ShellAdmissionFacts } from "./shell-admission-facts.ts";
import type { SealedSchedulerTerminalContext } from "./scheduler-terminal-context.ts";
import type {
  SchedulerMeasurementContext,
  SchedulerTerminalEffect
} from "../../project-definition/project-definition.ts";
import type { PlannedTask, PlannedTaskGraph, TaskGraph } from "./graph.ts";
import {
  staticAdmissionSelectionPolicy,
  type AdmissionSelectionPolicy
} from "./admission-selection-policy.ts";
import type { DiagnosticLogger } from "../diagnostic-logging/logger.ts";
import type { AdmissionPolicyFaultCategory } from "./scheduler-admission-decision.ts";
import type { SchedulerPerformanceDiagnosticsInput } from "./measurement/diagnostics.ts";
import {
  compilePreparedAdmissionGraph,
  createAdmissionCoreFromSettlements,
  type AdmissionCoreEffect,
  type AdmissionCoreState
} from "./admission-core/core.ts";

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

export interface PreAdmissionTaskResult<TResult> {
  readonly taskId: string;
  readonly value: TResult;
}

/** Product-private effect hook used to prove that the real shell replays the shared core. */
export interface SchedulerAdmissionCoreEffect {
  readonly effect: AdmissionCoreEffect;
  readonly state: AdmissionCoreState;
}

export interface TaskGraphRun<TResult> {
  readonly admissionPolicyFault: AdmissionPolicyFaultCategory | undefined;
  readonly cancelled: boolean;
  /** One entry per static graph Task, in static graph order. */
  readonly settlements: readonly SettledTask<TResult>[];
  /** Product-private terminal facts retained after terminal Hooks have been drained. */
  readonly terminalContext?: SealedSchedulerTerminalContext;
}

export interface RunTaskGraphOptions<TResult> {
  /** Product-private policy handoff; package consumers cannot author this through the public API. */
  readonly admissionPolicy?: AdmissionSelectionPolicy;
  readonly diagnosticLogger?: DiagnosticLogger;
  /** Explicit enabled-only handoff; no Scheduler behavior is inferred from a logger shape. */
  readonly performanceDiagnostics?: SchedulerPerformanceDiagnosticsInput;
  /** Runtime-only terminal consumers; their context is formed after Scheduler drain. */
  readonly terminalEffects?: readonly SchedulerTerminalEffect[];
  readonly terminalContextNeeds?: readonly (keyof SchedulerMeasurementContext)[];
  /** Private production dependency, determined before execution starts. */
  readonly captureAdmissionFacts?: boolean;
  readonly onTerminalEffectFailure?: () => void;
  readonly onTerminalEffectsSettled?: () => void;
  /** Product-private test observer; no package consumer can supply this through `run`. */
  readonly onAdmissionCoreEffect?: (effect: SchedulerAdmissionCoreEffect) => void;
  readonly graph: TaskGraph;
  /** Product-private Task results formed without Scheduler admission in the current Run. */
  readonly preAdmissionTaskResults?: readonly PreAdmissionTaskResult<TResult>[];
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

export interface SchedulerState<TResult> {
  /** The shared immutable legality/transition state; Task and Promise ownership remains below. */
  admissionCore: AdmissionCoreState;
  readonly admissionPolicy: AdmissionSelectionPolicy;
  readonly admissionFacts: ShellAdmissionFacts | undefined;
  readonly diagnosticLogger: DiagnosticLogger | undefined;
  readonly graph: PlannedTaskGraph;
  /** Lazily computed from the immutable graph DTO; retained only for this Scheduler invocation. */
  graphFingerprint: string | undefined;
  readonly isPrerequisiteSatisfied: RunTaskGraphOptions<TResult>["isPrerequisiteSatisfied"];
  readonly signal: AbortSignal | undefined;
  readonly execute: RunTaskGraphOptions<TResult>["execute"];
  readonly onTaskBlocked: RunTaskGraphOptions<TResult>["onTaskBlocked"];
  readonly onAdmissionCoreEffect: RunTaskGraphOptions<TResult>["onAdmissionCoreEffect"];
  readonly pending: PlannedTask[];
  readonly runningById: Map<string, RunningTask<TResult>>;
  readonly settlementsByTaskId: Map<string, TaskSettlement<TResult>>;
  isCancelled: boolean;
  admissionPolicyFault: AdmissionPolicyFaultCategory | undefined;
}

export function createSchedulerState<TResult>(
  graph: PlannedTaskGraph,
  options: Omit<RunTaskGraphOptions<TResult>, "graph">
): SchedulerState<TResult> {
  const admissionPolicy = options.admissionPolicy ?? staticAdmissionSelectionPolicy;
  if (!Object.isFrozen(admissionPolicy) || typeof admissionPolicy.decide !== "function") {
    throw new TypeError("task engine admission policy must be a frozen policy value");
  }
  const compiledAdmissionGraph = compilePreparedAdmissionGraph(graph, options.maxParallel);
  const pending = [...graph.tasks];
  const settlementsByTaskId = new Map<string, TaskSettlement<TResult>>();
  recordPreAdmissionTaskResults(pending, settlementsByTaskId, options);
  const state: SchedulerState<TResult> = {
    admissionCore: createAdmissionCoreFromSettlements(
      compiledAdmissionGraph,
      [...settlementsByTaskId].map(([taskId, settlement]) => ({ taskId, kind: settlement.kind }))
    ),
    admissionPolicy,
    admissionFacts: options.captureAdmissionFacts === true ? new ShellAdmissionFacts() : undefined,
    diagnosticLogger: options.diagnosticLogger,
    graph,
    graphFingerprint: undefined,
    isPrerequisiteSatisfied: options.isPrerequisiteSatisfied,
    onTaskBlocked: options.onTaskBlocked,
    onAdmissionCoreEffect: options.onAdmissionCoreEffect,
    signal: options.signal,
    execute: options.execute,
    pending,
    runningById: new Map(),
    settlementsByTaskId,
    isCancelled: false,
    admissionPolicyFault: undefined
  };
  return state;
}

function recordPreAdmissionTaskResults<TResult>(
  pending: PlannedTask[],
  settlementsByTaskId: Map<string, TaskSettlement<TResult>>,
  options: Omit<RunTaskGraphOptions<TResult>, "graph">
): void {
  for (const result of options.preAdmissionTaskResults ?? []) {
    const pendingIndex = pending.findIndex((task) => task.id === result.taskId);
    if (pendingIndex < 0) {
      throw new TypeError(
        `pre-admission task result references unknown or duplicate task ${result.taskId}`
      );
    }
    const [task] = pending.splice(pendingIndex, 1);
    if (task === undefined) {
      throw new Error(`pre-admission task ${result.taskId} disappeared before settlement`);
    }
    const settlement: TaskSettlement<TResult> =
      options.isPrerequisiteSatisfied?.(result.value) === false
        ? { kind: "prerequisite-unsatisfied", value: result.value }
        : { kind: "completed", value: result.value };
    settlementsByTaskId.set(task.id, Object.freeze(settlement));
  }
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
}

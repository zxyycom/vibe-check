import { prepareTaskGraph, type PlannedTask } from "./graph.ts";
import { diagnosticTags, type DiagnosticObservation } from "../diagnostic-logging/logger.ts";
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
import { AdmissionPolicyFault } from "./scheduler-admission-decision.ts";
import {
  canAdmit,
  capacityFor,
  inspectSnapshot,
  isRelationEligible,
  isRelationMutexEligible,
  type SchedulerInspection
} from "./scheduler-decision-inspection.ts";
import {
  SchedulerPerformanceDiagnostics,
  type AdmissionViablePendingTask,
  type SchedulerPerformanceState
} from "./scheduler-performance-diagnostics.ts";

export async function runTaskGraph<TResult>(
  options: RunTaskGraphOptions<TResult>
): Promise<TaskGraphRun<TResult>> {
  const graph = prepareTaskGraph(options.graph, options.maxParallel);
  const state = createSchedulerState(graph, options);
  const diagnostics =
    options.performanceDiagnostics === undefined
      ? undefined
      : new SchedulerPerformanceDiagnostics(
          options.performanceDiagnostics,
          performanceState(state)
        );
  let trigger: SchedulerTrigger = Object.freeze({ kind: "execution-started" });

  while (true) {
    let decision: SchedulerDecision;
    try {
      decision =
        diagnostics?.measureControlPath(() =>
          decideScheduler(snapshotSchedulerState(state), trigger, state.admissionPolicy)
        ) ?? decideScheduler(snapshotSchedulerState(state), trigger, state.admissionPolicy);
    } catch (error) {
      if (!(error instanceof AdmissionPolicyFault)) throw error;
      diagnostics?.beforePendingSettlement(state.pending.map((task) => task.id));
      if (diagnostics === undefined) applyAdmissionPolicyFault(state, error);
      else diagnostics.measureControlPath(() => applyAdmissionPolicyFault(state, error));
      diagnostics?.captureState(performanceState(state));
      observeAdmissionPolicyFault(state, error);
      trigger = Object.freeze({ kind: "cancellation-applied" });
      continue;
    }
    observeSchedulerDecision(state, decision, diagnostics);

    switch (decision.kind) {
      case "admit":
        if (state.signal?.aborted === true) {
          diagnostics?.beforePendingSettlement(state.pending.map((task) => task.id));
          const lifecycleFault = new AdmissionPolicyFault("lifecycle-invalid-select");
          if (diagnostics === undefined) applyAdmissionPolicyFault(state, lifecycleFault);
          else
            diagnostics.measureControlPath(() => applyAdmissionPolicyFault(state, lifecycleFault));
          diagnostics?.captureState(performanceState(state));
          observeAdmissionPolicyFault(state, lifecycleFault);
          trigger = Object.freeze({ kind: "cancellation-applied" });
          continue;
        }
        diagnostics?.beforeAdmission(decision.taskId, [...state.runningById.keys()]);
        if (diagnostics === undefined) applyAdmission(state, decision);
        else diagnostics.measureControlPath(() => applyAdmission(state, decision));
        diagnostics?.captureState(performanceState(state));
        trigger = Object.freeze({ kind: "admission-continued" });
        continue;
      case "settle-blocked":
        diagnostics?.beforePendingSettlement([decision.taskId]);
        if (diagnostics === undefined) applyBlockedSettlement(state, decision);
        else diagnostics.measureControlPath(() => applyBlockedSettlement(state, decision));
        diagnostics?.captureState(performanceState(state));
        trigger = Object.freeze({ kind: "blocked-settled", taskId: decision.taskId });
        continue;
      case "cancel-pending":
        diagnostics?.beforePendingSettlement(decision.taskIds);
        if (diagnostics === undefined) applyCancellation(state, decision);
        else diagnostics.measureControlPath(() => applyCancellation(state, decision));
        diagnostics?.captureState(performanceState(state));
        trigger = Object.freeze({ kind: "cancellation-applied" });
        continue;
      case "await-running": {
        if (decision.proposal?.kind === "wait") {
          diagnostics?.beforeAcceptedWait();
        }
        const completion = await nextRunningSettlement(state);
        diagnostics?.beforeRunningSettlement(completion.taskId);
        if (diagnostics === undefined) settleRunningTask(state, completion);
        else diagnostics.measureControlPath(() => settleRunningTask(state, completion));
        diagnostics?.captureState(performanceState(state));
        trigger = Object.freeze({
          kind: "task-settled",
          settlementKind: completion.settlement.kind,
          taskId: completion.taskId
        });
        continue;
      }
      case "complete": {
        if (diagnostics === undefined) return buildTaskGraphRun(state);
        const run = diagnostics.measureControlPath(() => buildTaskGraphRun(state));
        diagnostics.observeSummary();
        return run;
      }
    }
  }
}

function applyAdmissionPolicyFault<TResult>(
  state: SchedulerState<TResult>,
  fault: AdmissionPolicyFault
): void {
  if (state.admissionPolicyFault !== undefined) {
    throw new Error("scheduler received more than one admission policy fault");
  }
  state.admissionPolicyFault = fault.category;
  cancelPendingTasks(state);
}

/** Fault logging is observational and therefore excluded from Scheduler control-path timing. */
function observeAdmissionPolicyFault<TResult>(
  state: SchedulerState<TResult>,
  fault: AdmissionPolicyFault
): void {
  observeSchedulerDiagnostic(state, {
    event: "scheduler.admission-policy-failed",
    tags: diagnosticTags("SCHEDULER", "ADMISSION_POLICY_FAILED", fault.category.toUpperCase()),
    details: Object.freeze({ category: fault.category })
  });
}

function observeSchedulerDecision<TResult>(
  state: SchedulerState<TResult>,
  decision: SchedulerDecision,
  diagnostics: SchedulerPerformanceDiagnostics | undefined
): void {
  const observation: DiagnosticObservation = {
    event: "scheduler.decision",
    tags: schedulerDecisionTags(decision),
    details: decision
  };
  const observe = () => observeSchedulerDiagnostic(state, observation);
  if (diagnostics === undefined) observe();
  else diagnostics.observeDecision(observe);
}

/** Logger failures are observational and must not revise Scheduler lifecycle state. */
function observeSchedulerDiagnostic<TResult>(
  state: SchedulerState<TResult>,
  observation: DiagnosticObservation
): void {
  try {
    state.diagnosticLogger?.observe(observation);
  } catch {
    // Invocation logging has its own containment; retain it for direct Scheduler seams as well.
  }
}

function performanceState<TResult>(state: SchedulerState<TResult>): SchedulerPerformanceState {
  const inspection = inspectSnapshot(snapshotSchedulerState(state));
  const admissionViablePendingTasks: AdmissionViablePendingTask[] = [];
  for (const task of inspection.pendingTasks) {
    if (!isRelationEligible(task, inspection)) continue;
    admissionViablePendingTasks.push(
      Object.freeze({ kind: admissionViablePendingKind(task, inspection), taskId: task.id })
    );
  }
  const capacity = capacityFor(inspection);
  return Object.freeze({
    admissionViablePendingTasks: Object.freeze(admissionViablePendingTasks),
    effectiveMaxParallel: capacity.effectiveMaxParallel,
    rootMaxParallel: capacity.maxParallel,
    running: capacity.running
  });
}

function admissionViablePendingKind(
  task: PlannedTask,
  inspection: SchedulerInspection
): AdmissionViablePendingTask["kind"] {
  if (!isRelationMutexEligible(task, inspection)) return "mutex-blocked";
  return canAdmit(inspection, task) ? "admissible-pending" : "capacity-blocked";
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
  for (const mutex of task.mutex) {
    state.runningMutexes.add(mutex);
  }
  activateScope(state, decision.scopeToActivate);

  const completion = Promise.resolve()
    .then(() => state.execute(task, Object.freeze({ signal: state.signal })))
    .then((value) => completedTaskCompletion(task.id, value, state.isPrerequisiteSatisfied))
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
  state.onTaskBlocked?.(task, decision.dependencyIds);
}

function applyCancellation<TResult>(
  state: SchedulerState<TResult>,
  decision: Extract<SchedulerDecision, { readonly kind: "cancel-pending" }>
): void {
  const pendingTaskIds = state.pending.map((task) => task.id);
  if (!sameTaskIds(pendingTaskIds, decision.taskIds)) {
    throw new Error("scheduler cancellation decision no longer matches pending tasks");
  }
  cancelPendingTasks(state);
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

function buildTaskGraphRun<TResult>(state: SchedulerState<TResult>): TaskGraphRun<TResult> {
  return Object.freeze({
    admissionPolicyFault: state.admissionPolicyFault,
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

import type { TaskDefinition } from "../../../task-orchestration/src/index.ts";

import type {
  CheckExecutionPorts,
  ResolvedCheck,
  TaskExecutionPorts
} from "./catalog.ts";
import type {
  CheckRunSettlement,
  CheckTerminalReport
} from "./check-manager.ts";
import {
  hasExactPlainRecordKeys,
  snapshotClosedRecord
} from "./plain-record-values.ts";
import type {
  ResolvedCheckTaskPlan,
  ResolvedTaskLeaf
} from "./task-planning.ts";

type PrivateOutcome = Readonly<
  | { kind: "leaf-fulfilled"; value: unknown }
  | { kind: "leaf-failed" }
  | { kind: "leaf-blocked" }
  | { kind: "terminal"; availability: CheckRunSettlement["availability"] }
  | { kind: "fatal" }
>;

const FATAL_OUTCOME: PrivateOutcome = Object.freeze({ kind: "fatal" });

export interface CheckOrchestrationContribution {
  readonly check: ResolvedCheck;
  readonly ports: CheckExecutionPorts;
  readonly settle: (report: CheckTerminalReport) => CheckRunSettlement;
}

export interface InvocationState {
  readonly outcomes: Map<string, PrivateOutcome>;
  fatalCause: unknown | undefined;
}

export interface InvocationContext {
  readonly terminalTaskIdsByCheckId: ReadonlyMap<string, string | null>;
  readonly state: InvocationState;
}

export interface PlannedCheckContext {
  readonly contribution: CheckOrchestrationContribution;
  readonly plan: ResolvedCheckTaskPlan;
  readonly localTaskIds: ReadonlyMap<string, string>;
  readonly requiredTaskIds: readonly string[];
  readonly invocation: InvocationContext;
}

function parseUnavailableDependencyId(value: unknown): string | undefined {
  const data = snapshotClosedRecord(value);
  return data !== undefined
    && hasExactPlainRecordKeys(data, ["status", "dependencyId"])
    && data.status === "unavailable"
    && typeof data.dependencyId === "string"
    ? data.dependencyId
    : undefined;
}

function requireLocalTaskId(
  localTaskIds: ReadonlyMap<string, string>,
  localId: string
): string {
  const taskId = localTaskIds.get(localId);
  if (taskId === undefined) throw new TypeError(`Planned Task ID is missing: ${localId}`);
  return taskId;
}

function findUnavailableRequiredCheckId(
  check: ResolvedCheck,
  context: InvocationContext
): string | undefined {
  for (const requiredCheckId of check.requiresChecks) {
    const taskId = context.terminalTaskIdsByCheckId.get(requiredCheckId);
    if (taskId === undefined) throw new TypeError("Resolved Check dependency is missing");
    if (taskId === null) continue;
    const outcome = context.state.outcomes.get(taskId);
    if (outcome?.kind !== "terminal" || outcome.availability !== "available") {
      return requiredCheckId;
    }
  }
  return undefined;
}

function latchFatalOutcome(state: InvocationState, cause: unknown): PrivateOutcome {
  state.fatalCause ??= cause;
  return FATAL_OUTCOME;
}

function createGuardedTaskRun(
  state: InvocationState,
  body: () => PrivateOutcome | Promise<PrivateOutcome>
): () => Promise<PrivateOutcome> {
  return async () => {
    if (state.fatalCause !== undefined) return FATAL_OUTCOME;
    try {
      return await body();
    } catch (error) {
      return latchFatalOutcome(state, error);
    }
  };
}

function settleContribution(
  contribution: CheckOrchestrationContribution,
  taskId: string,
  report: CheckTerminalReport,
  state: InvocationState
): PrivateOutcome {
  if (state.fatalCause !== undefined) return FATAL_OUTCOME;
  try {
    const settlement = contribution.settle(report);
    const outcome: PrivateOutcome = Object.freeze({
      kind: "terminal",
      availability: settlement.availability
    });
    state.outcomes.set(taskId, outcome);
    return outcome;
  } catch (error) {
    return latchFatalOutcome(state, error);
  }
}

export function createDirectTask(
  contribution: CheckOrchestrationContribution,
  taskId: string,
  dependsOn: readonly string[],
  invocation: InvocationContext
): TaskDefinition {
  const { check } = contribution;
  const { state } = invocation;
  if (check.binding.kind !== "direct") throw new TypeError("Direct task requires direct binding");
  const binding = check.binding;
  return Object.freeze({
    id: taskId,
    dependsOn,
    mutex: check.mutex,
    run: createGuardedTaskRun(state, async () => {
      const unavailableRequiredCheckId = findUnavailableRequiredCheckId(check, invocation);
      if (unavailableRequiredCheckId !== undefined) {
        return settleContribution(contribution, taskId, Object.freeze({
          status: "unavailable",
          dependencyId: unavailableRequiredCheckId
        }), state);
      }
      let returned: unknown;
      try {
        returned = await binding.execute(contribution.ports);
      } catch {
        return settleContribution(contribution, taskId, Object.freeze({
          status: "execution-failed",
          executionId: `execution/v1:runner-${check.definition.checkId}`
        }), state);
      }
      if (state.fatalCause !== undefined) return FATAL_OUTCOME;
      const unavailableDependencyId = parseUnavailableDependencyId(returned);
      return settleContribution(contribution, taskId, unavailableDependencyId === undefined
        ? Object.freeze({ status: "returned", result: returned })
        : Object.freeze({
          status: "unavailable",
          dependencyId: unavailableDependencyId
        }), state);
    })
  });
}

export function createLeafTask(
  leaf: ResolvedTaskLeaf,
  taskId: string,
  context: PlannedCheckContext
): TaskDefinition {
  const { contribution, plan, localTaskIds, requiredTaskIds, invocation } = context;
  const { state } = invocation;
  const dependsOn = Object.freeze([
    ...requiredTaskIds,
    ...leaf.dependsOn.map((dependency) => requireLocalTaskId(localTaskIds, dependency))
  ]);
  return Object.freeze({
    id: taskId,
    dependsOn,
    mutex: Object.freeze([...new Set([...leaf.mutex, ...contribution.check.mutex])]),
    run: createGuardedTaskRun(state, async () => {
      if (findUnavailableRequiredCheckId(contribution.check, invocation) !== undefined
        || leaf.dependsOn.some((dependency) => (
          state.outcomes.get(requireLocalTaskId(localTaskIds, dependency))?.kind
            !== "leaf-fulfilled"
        ))) {
        const outcome: PrivateOutcome = Object.freeze({ kind: "leaf-blocked" });
        state.outcomes.set(taskId, outcome);
        return outcome;
      }
      let isRecordSinkOpen = true;
      let hasRecordFailure = false;
      const ports: TaskExecutionPorts = Object.freeze({
        workHandles: leaf.workHandles,
        submitRecord: (candidate: Parameters<TaskExecutionPorts["submitRecord"]>[0]) => {
          if (!isRecordSinkOpen) return "rejected";
          const result = contribution.ports.submitRecord(candidate);
          if (result === "conflicted" || result === "rejected") hasRecordFailure = true;
          return result;
        }
      });
      let value: unknown;
      try {
        value = await leaf.run(ports);
      } catch {
        const outcome: PrivateOutcome = Object.freeze({ kind: "leaf-failed" });
        state.outcomes.set(taskId, outcome);
        return outcome;
      } finally {
        isRecordSinkOpen = false;
      }
      if (hasRecordFailure) {
        const outcome: PrivateOutcome = Object.freeze({ kind: "leaf-failed" });
        state.outcomes.set(taskId, outcome);
        return outcome;
      }
      if (state.fatalCause !== undefined) return FATAL_OUTCOME;
      for (const workHandle of leaf.workHandles) {
        if (contribution.ports.acknowledge(workHandle) !== "accepted") {
          const outcome = latchFatalOutcome(state, new TypeError(
            `Task acknowledgement invariant failed for ${plan.checkId}`
          ));
          state.outcomes.set(taskId, outcome);
          return outcome;
        }
      }
      const outcome: PrivateOutcome = Object.freeze({ kind: "leaf-fulfilled", value });
      state.outcomes.set(taskId, outcome);
      return outcome;
    })
  });
}

export function createCompletionTask(
  taskId: string,
  context: PlannedCheckContext
): TaskDefinition {
  const { contribution, plan, localTaskIds, requiredTaskIds, invocation } = context;
  const { state } = invocation;
  return Object.freeze({
    id: taskId,
    dependsOn: Object.freeze([...requiredTaskIds, ...localTaskIds.values()]),
    mutex: contribution.check.mutex,
    run: createGuardedTaskRun(state, async () => {
      const unavailableRequiredCheckId = findUnavailableRequiredCheckId(
        contribution.check,
        invocation
      );
      const hasUnfulfilledLeaf = plan.leaves.some((leaf) => (
        state.outcomes.get(requireLocalTaskId(localTaskIds, leaf.id))?.kind !== "leaf-fulfilled"
      ));
      if (unavailableRequiredCheckId !== undefined || hasUnfulfilledLeaf) {
        return unavailableRequiredCheckId !== undefined
          ? settleContribution(contribution, taskId, Object.freeze({
            status: "unavailable",
            dependencyId: unavailableRequiredCheckId
          }), state)
          : settleContribution(contribution, taskId, Object.freeze({
            status: "execution-failed",
            executionId: `execution/v1:runner-${contribution.check.definition.checkId}`
          }), state);
      }

      const leafOutcomesById: Record<string, unknown> = {};
      for (const leaf of plan.leaves) {
        const outcome = state.outcomes.get(requireLocalTaskId(localTaskIds, leaf.id));
        if (outcome?.kind !== "leaf-fulfilled") {
          return latchFatalOutcome(state, new TypeError("Task outcome assembly invariant failed"));
        }
        leafOutcomesById[leaf.id] = outcome.value;
      }
      let returned: unknown;
      try {
        returned = await plan.complete(Object.freeze(leafOutcomesById));
      } catch {
        return settleContribution(contribution, taskId, Object.freeze({
          status: "execution-failed",
          executionId: `execution/v1:runner-${contribution.check.definition.checkId}`
        }), state);
      }
      if (state.fatalCause !== undefined) return FATAL_OUTCOME;
      const unavailableDependencyId = parseUnavailableDependencyId(returned);
      return settleContribution(contribution, taskId, unavailableDependencyId === undefined
        ? Object.freeze({ status: "returned", result: returned })
        : Object.freeze({
          status: "unavailable",
          dependencyId: unavailableDependencyId
        }), state);
    })
  });
}

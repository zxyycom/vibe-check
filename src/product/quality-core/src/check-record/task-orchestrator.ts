import {
  runParallelTasks,
  type TaskDefinition
} from "../../../task-orchestration/src/index.ts";

import type {
  ResolvedCheck,
  ResolvedCheckCatalog
} from "./catalog.ts";
import {
  createCompletionTask,
  createDirectTask,
  createLeafTask,
  type CheckOrchestrationContribution,
  type InvocationContext,
  type InvocationState,
  type PlannedCheckContext
} from "./task-execution.ts";
import {
  resolveCheckTaskPlans,
  type ResolvedCheckTaskPlan
} from "./task-planning.ts";
import {
  hasExactPlainRecordKeys,
  snapshotClosedRecord
} from "./plain-record-values.ts";

export type { CheckOrchestrationContribution } from "./task-execution.ts";

export interface SchedulerPolicy {
  readonly maxParallel: number;
}

function resolveSchedulerPolicy(raw: unknown): SchedulerPolicy {
  const data = snapshotClosedRecord(raw);
  const maxParallel = data?.maxParallel;
  if (data === undefined || !hasExactPlainRecordKeys(data, ["maxParallel"])
    || typeof maxParallel !== "number" || !Number.isSafeInteger(maxParallel)
    || maxParallel <= 0) {
    throw new TypeError("Check orchestration scheduler policy is invalid");
  }
  return Object.freeze({ maxParallel });
}

function createOrchestrationTaskId(
  index: number,
  kind: "direct" | "leaf" | "terminal",
  localId?: string
): string {
  const prefix = `check-${String(index + 1).padStart(6, "0")}`;
  return localId === undefined ? `${prefix}-${kind}` : `${prefix}-${kind}-${localId}`;
}

function createTerminalTaskIdIndex(
  catalog: ResolvedCheckCatalog
): ReadonlyMap<string, string | null> {
  return new Map(catalog.checks.map((check, index) => {
    const taskId = check.applicability !== "applicable"
      ? null
      : createOrchestrationTaskId(
        index,
        check.binding.kind === "direct" ? "direct" : "terminal"
      );
    return [check.definition.checkId, taskId] as const;
  }));
}

function resolveRequiredTaskIds(
  check: ResolvedCheck,
  terminalTaskIdsByCheckId: ReadonlyMap<string, string | null>
): readonly string[] {
  return Object.freeze(check.requiresChecks.flatMap((requiredCheckId) => {
    const taskId = terminalTaskIdsByCheckId.get(requiredCheckId);
    if (taskId === undefined) throw new TypeError("Resolved Check dependency is missing");
    return taskId === null ? [] : [taskId];
  }));
}

function buildCheckTasks(
  check: ResolvedCheck,
  index: number,
  contributions: ReadonlyMap<string, CheckOrchestrationContribution>,
  plans: ReadonlyMap<string, ResolvedCheckTaskPlan>,
  invocation: InvocationContext
): readonly TaskDefinition[] {
  const contribution = contributions.get(check.definition.checkId);
  if (contribution === undefined) throw new TypeError("Applicable Check contribution is missing");
  const requiredTaskIds = resolveRequiredTaskIds(
    check,
    invocation.terminalTaskIdsByCheckId
  );
  if (check.binding.kind === "direct") {
    return Object.freeze([
      createDirectTask(
        contribution,
        createOrchestrationTaskId(index, "direct"),
        requiredTaskIds,
        invocation
      )
    ]);
  }

  const plan = plans.get(check.definition.checkId);
  if (plan === undefined) throw new TypeError("Applicable TaskPlan is missing");
  const localTaskIds = new Map(plan.leaves.map((leaf) => (
    [leaf.id, createOrchestrationTaskId(index, "leaf", leaf.id)] as const
  )));
  const context: PlannedCheckContext = {
    contribution,
    plan,
    localTaskIds,
    requiredTaskIds,
    invocation
  };
  return Object.freeze([
    ...plan.leaves.map((leaf) => {
      const taskId = localTaskIds.get(leaf.id);
      if (taskId === undefined) throw new TypeError("Planned leaf task ID is missing");
      return createLeafTask(leaf, taskId, context);
    }),
    createCompletionTask(createOrchestrationTaskId(index, "terminal"), context)
  ]);
}

function buildTaskList(
  catalog: ResolvedCheckCatalog,
  contributions: ReadonlyMap<string, CheckOrchestrationContribution>,
  plans: ReadonlyMap<string, ResolvedCheckTaskPlan>,
  state: InvocationState
): readonly TaskDefinition[] {
  const invocation: InvocationContext = {
    terminalTaskIdsByCheckId: createTerminalTaskIdIndex(catalog),
    state
  };
  const tasks: TaskDefinition[] = [];
  for (const [index, check] of catalog.checks.entries()) {
    if (check.applicability === "applicable") {
      tasks.push(...buildCheckTasks(check, index, contributions, plans, invocation));
    }
  }
  return Object.freeze(tasks);
}

function resolveContributions(
  catalog: ResolvedCheckCatalog,
  contributions: readonly CheckOrchestrationContribution[]
): ReadonlyMap<string, CheckOrchestrationContribution> {
  const byCheckId = new Map(contributions.map((contribution) => (
    [contribution.check.definition.checkId, contribution] as const
  )));
  const applicable = catalog.checks.filter((check) => check.applicability === "applicable");
  if (byCheckId.size !== contributions.length || byCheckId.size !== applicable.length
    || applicable.some((check) => byCheckId.get(check.definition.checkId)?.check !== check)) {
    throw new TypeError("Check orchestration contribution set is inconsistent");
  }
  return byCheckId;
}

export async function runCheckOrchestration(input: Readonly<{
  catalog: ResolvedCheckCatalog;
  contributions: readonly CheckOrchestrationContribution[];
  schedulerPolicy: unknown;
}>): Promise<void> {
  const policy: SchedulerPolicy = resolveSchedulerPolicy(input.schedulerPolicy);
  const plans = resolveCheckTaskPlans(input.catalog);
  const contributions = resolveContributions(input.catalog, input.contributions);
  const state: InvocationState = { outcomes: new Map(), fatalCause: undefined };
  const tasks = buildTaskList(input.catalog, contributions, plans, state);
  await runParallelTasks(tasks, { concurrency: policy.maxParallel });
  if (state.fatalCause !== undefined) {
    throw new TypeError("Trusted Check orchestration invariant failed", { cause: state.fatalCause });
  }
}

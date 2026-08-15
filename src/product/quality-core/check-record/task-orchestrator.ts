import { runParallelTasks, type TaskDefinition } from "../../task-scheduler/index.ts";

import {
  createCheckAdmissionController,
  createCheckTaskRegistry,
  registerCheckTask,
  type CheckTaskConcurrency,
  type CheckTaskRegistry
} from "./check-concurrency.ts";
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

function resolveCheckMaxParallelById(
  catalog: ResolvedCheckCatalog,
  raw: unknown,
  rootMaxParallel: number
): ReadonlyMap<string, number> {
  if (raw === undefined) {
    return new Map(catalog.checks.map((check) => [check.definition.checkId, rootMaxParallel] as const));
  }
  const data = snapshotClosedRecord(raw);
  const checkIds = catalog.checks.map((check) => check.definition.checkId);
  if (data === undefined || !hasExactPlainRecordKeys(data, checkIds)) {
    throw new TypeError("Check maxParallel map is invalid");
  }
  const entries: [string, number][] = [];
  for (const checkId of checkIds) {
    const maxParallel = data[checkId];
    if (typeof maxParallel !== "number" || !Number.isSafeInteger(maxParallel)
      || maxParallel <= 0 || maxParallel > rootMaxParallel) {
      throw new TypeError("Check maxParallel map is invalid");
    }
    entries.push([checkId, maxParallel]);
  }
  return new Map(entries);
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

interface TaskAssembly {
  readonly contributions: ReadonlyMap<string, CheckOrchestrationContribution>;
  readonly invocation: InvocationContext;
  readonly maxParallelByCheckId: ReadonlyMap<string, number>;
  readonly plans: ReadonlyMap<string, ResolvedCheckTaskPlan>;
  readonly registry: CheckTaskRegistry;
}

interface CheckTaskBuildInput {
  readonly assembly: TaskAssembly;
  readonly check: ResolvedCheck;
  readonly contribution: CheckOrchestrationContribution;
  readonly index: number;
  readonly maxParallel: number;
  readonly requiredTaskIds: readonly string[];
}

function appendDirectCheckTask(input: CheckTaskBuildInput): void {
  const { assembly, check, contribution, index, maxParallel, requiredTaskIds } = input;
  registerCheckTask(assembly.registry, {
    activatesCap: true,
    checkId: check.definition.checkId,
    definition: createDirectTask(
      contribution,
      createOrchestrationTaskId(index, "direct"),
      requiredTaskIds,
      assembly.invocation
    ),
    maxParallel,
    terminal: true
  });
}

function appendPlannedCheckTasks(input: CheckTaskBuildInput): void {
  const { assembly, check, contribution, index, maxParallel, requiredTaskIds } = input;
  const checkId = check.definition.checkId;
  const plan = assembly.plans.get(checkId);
  if (plan === undefined) throw new TypeError("Applicable TaskPlan is missing");
  const localTaskIds = new Map(plan.leaves.map((leaf) => (
    [leaf.id, createOrchestrationTaskId(index, "leaf", leaf.id)] as const
  )));
  const context: PlannedCheckContext = {
    contribution,
    plan,
    localTaskIds,
    requiredTaskIds,
    invocation: assembly.invocation
  };
  for (const leaf of plan.leaves) {
    const taskId = localTaskIds.get(leaf.id);
    if (taskId === undefined) throw new TypeError("Planned leaf task ID is missing");
    registerCheckTask(assembly.registry, {
      activatesCap: true,
      checkId,
      definition: createLeafTask(leaf, taskId, context),
      maxParallel,
      terminal: false
    });
  }
  registerCheckTask(assembly.registry, {
    activatesCap: false,
    checkId,
    definition: createCompletionTask(createOrchestrationTaskId(index, "terminal"), context),
    maxParallel,
    terminal: true
  });
}

function buildCheckTasks(
  check: ResolvedCheck,
  index: number,
  assembly: TaskAssembly
): void {
  const checkId = check.definition.checkId;
  const contribution = assembly.contributions.get(checkId);
  const maxParallel = assembly.maxParallelByCheckId.get(checkId);
  if (contribution === undefined) throw new TypeError("Applicable Check contribution is missing");
  if (maxParallel === undefined) throw new TypeError("Check maxParallel is missing");
  const input: CheckTaskBuildInput = {
    assembly,
    check,
    contribution,
    index,
    maxParallel,
    requiredTaskIds: resolveRequiredTaskIds(check, assembly.invocation.terminalTaskIdsByCheckId)
  };
  if (check.binding.kind === "direct") {
    appendDirectCheckTask(input);
    return;
  }
  appendPlannedCheckTasks(input);
}

function buildTaskList(input: Readonly<{
  readonly catalog: ResolvedCheckCatalog;
  readonly contributions: ReadonlyMap<string, CheckOrchestrationContribution>;
  readonly maxParallelByCheckId: ReadonlyMap<string, number>;
  readonly plans: ReadonlyMap<string, ResolvedCheckTaskPlan>;
  readonly state: InvocationState;
}>): Readonly<{
  readonly definitions: readonly TaskDefinition[];
  readonly concurrencyByTaskId: ReadonlyMap<string, CheckTaskConcurrency>;
}> {
  const registry = createCheckTaskRegistry();
  const assembly: TaskAssembly = {
    contributions: input.contributions,
    invocation: {
      terminalTaskIdsByCheckId: createTerminalTaskIdIndex(input.catalog),
      state: input.state
    },
    maxParallelByCheckId: input.maxParallelByCheckId,
    plans: input.plans,
    registry
  };
  for (const [index, check] of input.catalog.checks.entries()) {
    if (check.applicability === "applicable") buildCheckTasks(check, index, assembly);
  }
  return Object.freeze({
    definitions: Object.freeze(registry.definitions),
    concurrencyByTaskId: registry.concurrencyByTaskId
  });
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
  checkMaxParallelById?: unknown;
}>): Promise<void> {
  const policy: SchedulerPolicy = resolveSchedulerPolicy(input.schedulerPolicy);
  const maxParallelByCheckId = resolveCheckMaxParallelById(
    input.catalog,
    input.checkMaxParallelById,
    policy.maxParallel
  );
  const plans = resolveCheckTaskPlans(input.catalog);
  const contributions = resolveContributions(input.catalog, input.contributions);
  const state: InvocationState = { outcomes: new Map(), fatalCause: undefined };
  const tasks = buildTaskList({
    catalog: input.catalog,
    contributions,
    maxParallelByCheckId,
    plans,
    state
  });
  await runParallelTasks(tasks.definitions, {
    concurrency: policy.maxParallel,
    admissionController: createCheckAdmissionController(
      policy.maxParallel,
      tasks.concurrencyByTaskId
    )
  });
  if (state.fatalCause !== undefined) {
    throw new TypeError("Trusted Check orchestration invariant failed", { cause: state.fatalCause });
  }
}

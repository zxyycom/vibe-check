import {
  expandTasks,
  validateTaskGraph,
  type TaskDefinition
} from "../../task-scheduler/index.ts";

import type {
  CheckTaskPlanningInput,
  ResolvedCheckCatalog,
  TaskExecutionPorts
} from "./catalog.ts";
import { snapshotClosedArray, snapshotClosedRecord } from "./plain-record-values.ts";

const LOCAL_ID_PATTERN = /^[a-z][a-z0-9]*(?:-[a-z0-9]+)*$/;

export type TaskFunction = (
  ports: TaskExecutionPorts
) => unknown | Promise<unknown>;

export type CheckCompletionFunction = (
  outcomes: Readonly<Record<string, unknown>>
) => unknown | Promise<unknown>;

export interface ResolvedTaskLeaf {
  readonly id: string;
  readonly dependsOn: readonly string[];
  readonly mutex: readonly string[];
  readonly workHandles: readonly string[];
  readonly run: TaskFunction;
}

export interface ResolvedCheckTaskPlan {
  readonly checkId: string;
  readonly leaves: readonly ResolvedTaskLeaf[];
  readonly complete: CheckCompletionFunction;
}

interface ParsedTaskLeaf extends ParsedTaskHeader {
  readonly productKind: "leaf";
  readonly productRun: TaskFunction;
  readonly workHandles: readonly string[];
}

interface ParsedTaskGroup extends ParsedTaskHeader {
  readonly tasks: readonly ParsedTask[];
}

type ParsedTask = ParsedTaskGroup | ParsedTaskLeaf;

function isParsedTaskGroup(task: ParsedTask): task is ParsedTaskGroup {
  return Array.isArray(task.tasks);
}

interface ParsedTaskList {
  readonly tasks: readonly ParsedTask[];
  readonly leafOrder: readonly string[];
}

interface ParsedTaskHeader extends TaskDefinition {
  readonly id: string;
  readonly dependsOn: readonly string[];
  readonly mutex: readonly string[];
}

function ownData(
  value: unknown,
  requiredKeys: readonly string[],
  optionalKeys: readonly string[] = []
): Readonly<Record<string, unknown>> | undefined {
  const data = snapshotClosedRecord(value);
  if (data === undefined) return undefined;
  const keys = Object.keys(data);
  if (requiredKeys.some((key) => !keys.includes(key))
    || keys.some((key) => !requiredKeys.includes(key) && !optionalKeys.includes(key))) {
    return undefined;
  }
  return data;
}

function stringList(value: unknown): readonly string[] | undefined {
  if (value === undefined) return Object.freeze([]);
  const items = snapshotClosedArray(value);
  if (items === undefined) return undefined;
  const result: string[] = [];
  const seen = new Set<string>();
  for (const item of items) {
    if (typeof item !== "string" || !LOCAL_ID_PATTERN.test(item) || seen.has(item)) {
      return undefined;
    }
    seen.add(item);
    result.push(item);
  }
  return Object.freeze(result);
}

function mutexList(value: unknown): readonly string[] | undefined {
  if (value === undefined) return Object.freeze([]);
  const items = snapshotClosedArray(value);
  if (items === undefined) return undefined;
  const result: string[] = [];
  const seen = new Set<string>();
  for (const item of items) {
    if (typeof item !== "string" || item.length === 0 || seen.has(item)) return undefined;
    seen.add(item);
    result.push(item);
  }
  return Object.freeze(result);
}

function parseTaskHeader(
  data: Readonly<Record<string, unknown>>,
  allIds: Set<string>
): ParsedTaskHeader | undefined {
  if (typeof data.id !== "string" || !LOCAL_ID_PATTERN.test(data.id) || allIds.has(data.id)) {
    return undefined;
  }
  const dependsOn = stringList(data.dependsOn);
  const mutex = mutexList(data.mutex);
  if (dependsOn === undefined || mutex === undefined || dependsOn.includes(data.id)) return undefined;
  allIds.add(data.id);
  return Object.freeze({ id: data.id, dependsOn, mutex });
}

function parseTaskGroup(
  header: ParsedTaskHeader,
  rawTasks: unknown,
  allIds: Set<string>,
  leafOrder: string[]
): ParsedTaskGroup | undefined {
  const childItems = snapshotClosedArray(rawTasks);
  if (childItems === undefined || childItems.length === 0) return undefined;
  const tasks: ParsedTask[] = [];
  for (const child of childItems) {
    const parsed = parseTask(child, allIds, leafOrder);
    if (parsed === undefined) return undefined;
    tasks.push(parsed);
  }
  return Object.freeze({ ...header, tasks: Object.freeze(tasks) });
}

function parseTaskLeaf(
  header: ParsedTaskHeader,
  leaf: Readonly<Record<string, unknown>>,
  leafOrder: string[]
): ParsedTaskLeaf | undefined {
  const handleItems = snapshotClosedArray(leaf.workHandles);
  if (handleItems === undefined || typeof leaf.run !== "function") return undefined;
  const workHandles: string[] = [];
  const seen = new Set<string>();
  for (const handle of handleItems) {
    if (typeof handle !== "string" || seen.has(handle)) return undefined;
    seen.add(handle);
    workHandles.push(handle);
  }
  workHandles.sort();
  leafOrder.push(header.id);
  return Object.freeze({
    ...header,
    productKind: "leaf",
    productRun: leaf.run as TaskFunction,
    workHandles: Object.freeze(workHandles)
  });
}

function parseTask(
  raw: unknown,
  allIds: Set<string>,
  leafOrder: string[]
): ParsedTask | undefined {
  const commonKeys = ["dependsOn", "mutex"] as const;
  const group = ownData(raw, ["id", "tasks"], commonKeys);
  const leaf = ownData(raw, ["id", "workHandles", "run"], commonKeys);
  const data = group ?? leaf;
  if (data === undefined) return undefined;
  const header = parseTaskHeader(data, allIds);
  if (header === undefined) return undefined;
  if (group !== undefined) return parseTaskGroup(header, group.tasks, allIds, leafOrder);
  return leaf === undefined ? undefined : parseTaskLeaf(header, leaf, leafOrder);
}

function hasCycle(leaves: readonly ResolvedTaskLeaf[]): boolean {
  const byId = new Map(leaves.map((leaf) => [leaf.id, leaf]));
  const visiting = new Set<string>();
  const visited = new Set<string>();
  const visit = (id: string): boolean => {
    if (visiting.has(id)) return true;
    if (visited.has(id)) return false;
    visiting.add(id);
    for (const dependency of byId.get(id)?.dependsOn ?? []) {
      if (visit(dependency)) return true;
    }
    visiting.delete(id);
    visited.add(id);
    return false;
  };
  return leaves.some((leaf) => visit(leaf.id));
}

function hasExpandedSelfDependency(tasks: readonly ParsedTask[]): boolean {
  const groupLeaves = new Map<string, readonly string[]>();
  const collect = (task: ParsedTask): readonly string[] => {
    if (!isParsedTaskGroup(task)) return [task.id];
    const leaves = task.tasks.flatMap(collect);
    groupLeaves.set(task.id, leaves);
    return leaves;
  };
  tasks.forEach(collect);

  const inspect = (task: ParsedTask, inherited: readonly string[]): boolean => {
    const dependencies = [...inherited, ...task.dependsOn];
    if (isParsedTaskGroup(task)) {
      return task.tasks.some((child) => inspect(child, dependencies));
    }
    return dependencies.some((dependency) => (
      dependency === task.id || groupLeaves.get(dependency)?.includes(task.id) === true
    ));
  };
  return tasks.some((task) => inspect(task, []));
}

function parseTaskList(rawTasks: readonly unknown[]): ParsedTaskList | undefined {
  const allIds = new Set<string>();
  const leafOrder: string[] = [];
  const tasks: ParsedTask[] = [];
  for (const task of rawTasks) {
    const parsed = parseTask(task, allIds, leafOrder);
    if (parsed === undefined) return undefined;
    tasks.push(parsed);
  }
  return Object.freeze({
    tasks: Object.freeze(tasks),
    leafOrder: Object.freeze(leafOrder)
  });
}

function resolveExpandedLeaves(
  tasks: readonly ParsedTask[],
  leafOrder: readonly string[]
): readonly ResolvedTaskLeaf[] | undefined {
  if (hasExpandedSelfDependency(tasks)) return undefined;
  let expanded: ReturnType<typeof expandTasks>;
  try {
    expanded = expandTasks(tasks);
    validateTaskGraph(expanded);
  } catch {
    return undefined;
  }
  const byId = new Map(expanded.map((task) => [task.id, task]));
  const leaves: ResolvedTaskLeaf[] = [];
  for (const id of leafOrder) {
    const task = byId.get(id) as ParsedTaskLeaf | undefined;
    if (task?.productKind !== "leaf" || typeof task.productRun !== "function") return undefined;
    leaves.push(Object.freeze({
      id,
      dependsOn: Object.freeze([...task.dependsOn]),
      mutex: Object.freeze([...task.mutex]),
      workHandles: Object.freeze([...task.workHandles]),
      run: task.productRun
    }));
  }
  return hasCycle(leaves) ? undefined : Object.freeze(leaves);
}

function hasExactWorkPartition(
  leaves: readonly ResolvedTaskLeaf[],
  ownedWorkHandles: readonly string[]
): boolean {
  const assigned = leaves.flatMap((leaf) => leaf.workHandles).sort();
  const owned = [...ownedWorkHandles].sort();
  return assigned.length === owned.length
    && assigned.every((handle, index) => handle === owned[index]);
}

function parsePlan(
  checkId: string,
  raw: unknown,
  ownedWorkHandles: readonly string[]
): ResolvedCheckTaskPlan | undefined {
  const data = ownData(raw, ["tasks", "complete"]);
  const rawTasks = data === undefined ? undefined : snapshotClosedArray(data.tasks);
  if (data === undefined || rawTasks === undefined || typeof data.complete !== "function") {
    return undefined;
  }
  const parsed = parseTaskList(rawTasks);
  if (parsed === undefined) return undefined;
  const leaves = resolveExpandedLeaves(parsed.tasks, parsed.leafOrder);
  if (leaves === undefined || !hasExactWorkPartition(leaves, ownedWorkHandles)) return undefined;
  return Object.freeze({
    checkId,
    leaves,
    complete: data.complete as CheckCompletionFunction
  });
}

export function resolveCheckTaskPlans(
  catalog: ResolvedCheckCatalog
): ReadonlyMap<string, ResolvedCheckTaskPlan> {
  const plans = new Map<string, ResolvedCheckTaskPlan>();
  for (const check of catalog.checks) {
    if (check.applicability !== "applicable" || check.binding.kind !== "task-plan") continue;
    const input: CheckTaskPlanningInput = Object.freeze({
      definition: check.definition,
      checkRunId: check.checkRunId,
      workHandles: check.workHandles
    });
    let raw: unknown;
    try {
      raw = check.binding.createTaskPlan(input);
    } catch {
      throw new TypeError(
        `Check TaskPlan factory failed during closed planning: ${check.definition.checkId}`
      );
    }
    const plan = parsePlan(check.definition.checkId, raw, check.workHandles);
    if (plan === undefined) {
      throw new TypeError(
        `Check TaskPlan failed closed planning validation: ${check.definition.checkId}`
      );
    }
    plans.set(check.definition.checkId, plan);
  }
  return plans;
}

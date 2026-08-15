import type {
  CheckExecutionContext,
  TaskPlan
} from "../definition/custom-check.ts";
import {
  snapshotClosedArray,
  snapshotClosedRecord
} from "../quality-core/check-record/plain-record-values.ts";

const LOCAL_ID_PATTERN = /^[a-z][a-z0-9]*(?:-[a-z0-9]+)*$/;

/**
 * Package Run's detached, executable projection of a Definition-owned
 * TaskPlan. Scheduler task identity stays private to the Run adapter.
 */
export interface ResolvedTaskPlan {
  readonly complete: TaskPlan["complete"];
  readonly tasks: readonly ResolvedTaskPlanTask[];
}

export interface ResolvedTaskPlanTask {
  readonly dependsOn: readonly string[];
  readonly id: string;
  readonly mutex: readonly string[];
  readonly run: (context: CheckExecutionContext) => unknown | Promise<unknown>;
}

interface ParsedTaskHeader {
  readonly dependsOn: readonly string[];
  readonly id: string;
  readonly mutex: readonly string[];
}

interface ParsedTaskGroup extends ParsedTaskHeader {
  readonly kind: "group";
  readonly tasks: readonly ParsedTask[];
}

interface ParsedTaskLeaf extends ParsedTaskHeader {
  readonly kind: "leaf";
  readonly run: ResolvedTaskPlanTask["run"];
}

type ParsedTask = ParsedTaskGroup | ParsedTaskLeaf;

/** Named state for one recursive leaf projection; only `resolved` changes during this phase. */
interface TaskPlanLeafResolution {
  readonly groups: ReadonlyMap<string, readonly string[]>;
  readonly inheritedDependencies: readonly string[];
  readonly inheritedMutex: readonly string[];
  readonly leaves: ReadonlyMap<string, ParsedTaskLeaf>;
  readonly resolved: ResolvedTaskPlanTask[];
}

interface DependencyExpansionInput {
  readonly dependencies: readonly string[];
  readonly groups: ReadonlyMap<string, readonly string[]>;
  readonly leaves: ReadonlyMap<string, ParsedTaskLeaf>;
  readonly taskId: string;
}

export function resolveTaskPlan(value: unknown): ResolvedTaskPlan | undefined {
  const data = exactData(value, ["tasks", "complete"]);
  const rawTasks = data === undefined ? undefined : snapshotClosedArray(data.tasks);
  const complete = data === undefined ? undefined : data.complete;
  if (rawTasks === undefined || !isTaskPlanComplete(complete)) return undefined;

  const parsed = parseTasks(rawTasks);
  if (parsed === undefined) return undefined;
  const resolved = resolveLeaves(parsed);
  if (resolved === undefined || hasDependencyCycle(resolved)) return undefined;

  return Object.freeze({
    complete,
    tasks: Object.freeze(resolved)
  });
}

function isTaskPlanComplete(value: unknown): value is TaskPlan["complete"] {
  return typeof value === "function";
}

function parseTasks(value: readonly unknown[]): readonly ParsedTask[] | undefined {
  const ids = new Set<string>();
  const tasks: ParsedTask[] = [];
  for (const raw of value) {
    const task = parseTask(raw, ids);
    if (task === undefined) return undefined;
    tasks.push(task);
  }
  return Object.freeze(tasks);
}

function parseTask(value: unknown, ids: Set<string>): ParsedTask | undefined {
  const group = exactData(value, ["id", "tasks"], ["dependsOn", "mutex"]);
  if (group !== undefined) {
    return parseTaskGroup(group, ids);
  }
  const leaf = exactData(value, ["id", "run"], ["dependsOn", "mutex"]);
  return leaf === undefined ? undefined : parseTaskLeaf(leaf, ids);
}

function parseTaskGroup(
  data: Readonly<Record<string, unknown>>,
  ids: Set<string>
): ParsedTaskGroup | undefined {
  const header = parseHeader(data, ids);
  if (header === undefined) return undefined;
  const children = snapshotClosedArray(data.tasks);
  if (children === undefined || children.length === 0) return undefined;
  const tasks: ParsedTask[] = [];
  for (const child of children) {
    const parsed = parseTask(child, ids);
    if (parsed === undefined) return undefined;
    tasks.push(parsed);
  }
  return Object.freeze({ ...header, kind: "group", tasks: Object.freeze(tasks) });
}

function parseTaskLeaf(
  data: Readonly<Record<string, unknown>>,
  ids: Set<string>
): ParsedTaskLeaf | undefined {
  const header = parseHeader(data, ids);
  if (header === undefined || !isTaskPlanRun(data.run)) return undefined;
  return Object.freeze({
    ...header,
    kind: "leaf",
    run: data.run
  });
}

function isTaskPlanRun(value: unknown): value is ResolvedTaskPlanTask["run"] {
  return typeof value === "function";
}

function parseHeader(
  data: Readonly<Record<string, unknown>>,
  ids: Set<string>
): ParsedTaskHeader | undefined {
  if (typeof data.id !== "string" || !LOCAL_ID_PATTERN.test(data.id) || ids.has(data.id)) {
    return undefined;
  }
  const dependsOn = localIdList(data.dependsOn);
  const mutex = mutexList(data.mutex);
  if (dependsOn === undefined || mutex === undefined || dependsOn.includes(data.id)) return undefined;
  ids.add(data.id);
  return Object.freeze({ id: data.id, dependsOn, mutex });
}

function resolveLeaves(tasks: readonly ParsedTask[]): readonly ResolvedTaskPlanTask[] | undefined {
  const groups = new Map<string, readonly string[]>();
  const leaves = new Map<string, ParsedTaskLeaf>();
  for (const task of tasks) collectTask(task, groups, leaves);

  const resolved: ResolvedTaskPlanTask[] = [];
  const resolution: TaskPlanLeafResolution = {
    groups,
    inheritedDependencies: [],
    inheritedMutex: [],
    leaves,
    resolved
  };
  for (const task of tasks) {
    if (!resolveTaskLeaves(task, resolution)) return undefined;
  }
  return Object.freeze(resolved);
}

function resolveTaskLeaves(
  task: ParsedTask,
  resolution: TaskPlanLeafResolution
): boolean {
  const dependencies = [...resolution.inheritedDependencies, ...task.dependsOn];
  const mutex = unique([...resolution.inheritedMutex, ...task.mutex]);
  if (task.kind === "group") {
    const children: TaskPlanLeafResolution = {
      ...resolution,
      inheritedDependencies: dependencies,
      inheritedMutex: mutex
    };
    for (const child of task.tasks) {
      if (!resolveTaskLeaves(child, children)) return false;
    }
    return true;
  }
  const expandedDependencies = expandDependencies({
    dependencies,
    groups: resolution.groups,
    leaves: resolution.leaves,
    taskId: task.id
  });
  if (expandedDependencies === undefined) return false;
  resolution.resolved.push(Object.freeze({
    dependsOn: expandedDependencies,
    id: task.id,
    mutex,
    run: task.run
  }));
  return true;
}

function collectTask(
  task: ParsedTask,
  groups: Map<string, readonly string[]>,
  leaves: Map<string, ParsedTaskLeaf>
): readonly string[] {
  if (task.kind === "leaf") {
    leaves.set(task.id, task);
    return [task.id];
  }
  const memberIds: string[] = [];
  for (const child of task.tasks) {
    memberIds.push(...collectTask(child, groups, leaves));
  }
  groups.set(task.id, Object.freeze(memberIds));
  return memberIds;
}

function expandDependencies(input: DependencyExpansionInput): readonly string[] | undefined {
  const expanded: string[] = [];
  for (const dependency of input.dependencies) {
    const targets = input.groups.get(dependency)
      ?? (input.leaves.has(dependency) ? [dependency] : undefined);
    if (targets === undefined || targets.includes(input.taskId)) return undefined;
    for (const target of targets) {
      if (!expanded.includes(target)) expanded.push(target);
    }
  }
  return Object.freeze(expanded);
}

function hasDependencyCycle(tasks: readonly ResolvedTaskPlanTask[]): boolean {
  const byId = new Map(tasks.map((task) => [task.id, task] as const));
  const visiting = new Set<string>();
  const visited = new Set<string>();

  const visit = (taskId: string): boolean => {
    if (visiting.has(taskId)) return true;
    if (visited.has(taskId)) return false;
    const task = byId.get(taskId);
    if (task === undefined) return true;
    visiting.add(taskId);
    for (const dependencyId of task.dependsOn) {
      if (visit(dependencyId)) return true;
    }
    visiting.delete(taskId);
    visited.add(taskId);
    return false;
  };

  for (const task of tasks) {
    if (visit(task.id)) return true;
  }
  return false;
}

function exactData(
  value: unknown,
  requiredKeys: readonly string[],
  optionalKeys: readonly string[] = []
): Readonly<Record<string, unknown>> | undefined {
  const data = snapshotClosedRecord(value);
  if (data === undefined) return undefined;
  const keys = Object.keys(data);
  return requiredKeys.every((key) => keys.includes(key))
    && keys.every((key) => requiredKeys.includes(key) || optionalKeys.includes(key))
    ? data
    : undefined;
}

function localIdList(value: unknown): readonly string[] | undefined {
  return stringList(value, (item) => LOCAL_ID_PATTERN.test(item));
}

function mutexList(value: unknown): readonly string[] | undefined {
  return stringList(value, (item) => item.length > 0);
}

function stringList(
  value: unknown,
  accepts: (item: string) => boolean
): readonly string[] | undefined {
  if (value === undefined) return Object.freeze([]);
  const items = snapshotClosedArray(value);
  if (items === undefined) return undefined;
  const result: string[] = [];
  for (const item of items) {
    if (typeof item !== "string" || !accepts(item) || result.includes(item)) return undefined;
    result.push(item);
  }
  return Object.freeze(result);
}

function unique(values: readonly string[]): readonly string[] {
  return Object.freeze([...new Set(values)]);
}

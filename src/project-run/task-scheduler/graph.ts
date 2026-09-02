import { validatePreparedTaskGraph } from "./graph-validation.ts";
import type { SchedulerGraphSnapshot } from "../../project-definition/project-definition.ts";

export interface TaskNode {
  readonly admissionPriority?: number;
  readonly id: string;
  readonly dependsOn?: readonly string[];
  readonly mutex?: readonly string[];
  readonly observes?: readonly string[];
  readonly scopeId?: string;
}

/**
 * A scheduling scope is intentionally product-agnostic. Product adapters may
 * use its opaque id to bind local Check semantics, but the engine only uses
 * membership, a cap, activation candidates, and the terminal relation.
 */
export interface TaskScope {
  readonly id: string;
  readonly maxParallel: number;
  readonly activationTaskIds: readonly string[];
  readonly terminalTaskId: string;
}

export interface TaskGraph {
  readonly tasks: readonly TaskNode[];
  readonly scopes?: readonly TaskScope[];
}

export interface PlannedTask {
  readonly admissionPriority: number;
  readonly id: string;
  readonly dependsOn: readonly string[];
  readonly mutex: readonly string[];
  readonly observes: readonly string[];
  readonly scopeId: string | undefined;
}

export interface PlannedTaskScope {
  readonly id: string;
  readonly maxParallel: number;
  readonly activationTaskIds: readonly string[];
  readonly terminalTaskId: string;
}

export interface PlannedTaskGraph {
  /** Immutable public projection shared by every decision and terminal measurement in one run. */
  readonly schedulerGraphSnapshot: SchedulerGraphSnapshot;
  readonly tasks: readonly PlannedTask[];
  readonly scopes: readonly PlannedTaskScope[];
}

const TASK_GRAPH_KEYS = ["tasks", "scopes"] as const;
const TASK_NODE_KEYS = [
  "admissionPriority",
  "id",
  "dependsOn",
  "mutex",
  "observes",
  "scopeId"
] as const;
const TASK_SCOPE_KEYS = ["id", "maxParallel", "activationTaskIds", "terminalTaskId"] as const;

/** Validates untrusted graph-shaped input without admitting it to scheduler execution. */
export function validateTaskGraph(graph: unknown): void {
  prepareTaskGraph(graph);
}

export function prepareTaskGraph(graph: unknown, rootMaxParallel?: number): PlannedTaskGraph {
  const data = record(graph, "task graph", TASK_GRAPH_KEYS);
  const tasks = normalizeTasks(data.tasks);
  const scopes = normalizeScopes(data.scopes);
  const taskById = new Map(tasks.map((task) => [task.id, task] as const));
  const scopeById = new Map(scopes.map((scope) => [scope.id, scope] as const));

  validatePreparedTaskGraph({ rootMaxParallel, scopeById, scopes, taskById, tasks });

  return Object.freeze({
    schedulerGraphSnapshot: schedulerGraphSnapshot(tasks, scopes),
    tasks: Object.freeze(tasks),
    scopes: Object.freeze(scopes)
  });
}

function schedulerGraphSnapshot(
  tasks: readonly PlannedTask[],
  scopes: readonly PlannedTaskScope[]
): SchedulerGraphSnapshot {
  return Object.freeze({
    scopes: Object.freeze(
      scopes.map((scope) =>
        Object.freeze({
          activationTaskIds: Object.freeze([...scope.activationTaskIds]),
          id: scope.id,
          maxParallel: scope.maxParallel,
          terminalTaskId: scope.terminalTaskId
        })
      )
    ),
    tasks: Object.freeze(
      tasks.map((task) =>
        Object.freeze({
          admissionPriority: task.admissionPriority,
          dependsOn: Object.freeze([...task.dependsOn]),
          mutex: Object.freeze([...task.mutex]),
          observes: Object.freeze([...task.observes]),
          scopeId: task.scopeId ?? null,
          taskId: task.id
        })
      )
    )
  });
}

function normalizeTasks(value: unknown): PlannedTask[] {
  if (!Array.isArray(value)) {
    throw new TypeError("task graph tasks must be an array");
  }

  const ids = new Set<string>();
  const tasks: PlannedTask[] = [];
  for (const [index, candidate] of value.entries()) {
    const data = record(candidate, `task graph tasks[${index}]`, TASK_NODE_KEYS);
    const id = nonEmptyString(data.id, `task graph tasks[${index}].id`);
    if (ids.has(id)) {
      throw new TypeError(`duplicate task id: ${id}`);
    }
    ids.add(id);
    const admissionPriority = admissionPriorityOrDefault(data.admissionPriority, id);
    const scopeId = optionalNonEmptyString(data.scopeId, `task ${id}.scopeId`);
    tasks.push(
      Object.freeze({
        admissionPriority,
        id,
        dependsOn: Object.freeze(stringList(data.dependsOn, `task ${id}.dependsOn`)),
        mutex: Object.freeze(stringList(data.mutex, `task ${id}.mutex`)),
        observes: Object.freeze(stringList(data.observes, `task ${id}.observes`)),
        scopeId
      })
    );
  }
  return tasks;
}

function normalizeScopes(value: unknown): PlannedTaskScope[] {
  if (value === undefined) {
    return [];
  }
  if (!Array.isArray(value)) {
    throw new TypeError("task graph scopes must be an array");
  }

  const ids = new Set<string>();
  const scopes: PlannedTaskScope[] = [];
  for (const [index, candidate] of value.entries()) {
    const data = record(candidate, `task graph scopes[${index}]`, TASK_SCOPE_KEYS);
    const id = nonEmptyString(data.id, `task graph scopes[${index}].id`);
    if (ids.has(id)) {
      throw new TypeError(`duplicate task scope id: ${id}`);
    }
    ids.add(id);
    const maxParallel = positiveSafeInteger(data.maxParallel, `task scope ${id}.maxParallel`);
    const activationTaskIds = requiredStringList(
      data.activationTaskIds,
      `task scope ${id}.activationTaskIds`
    );
    const terminalTaskId = nonEmptyString(data.terminalTaskId, `task scope ${id}.terminalTaskId`);
    scopes.push(
      Object.freeze({
        id,
        maxParallel,
        activationTaskIds: Object.freeze(activationTaskIds),
        terminalTaskId
      })
    );
  }
  return scopes;
}

function record(
  value: unknown,
  fieldName: string,
  allowedKeys: readonly string[]
): Readonly<Record<string, unknown>> {
  if (!isTaskGraphRecord(value)) {
    throw new TypeError(`${fieldName} must be an object`);
  }
  for (const key of Object.keys(value)) {
    if (!allowedKeys.includes(key)) {
      throw new TypeError(`${fieldName} has unknown property: ${key}`);
    }
  }
  return value;
}

function isTaskGraphRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function nonEmptyString(value: unknown, fieldName: string): string {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new TypeError(`${fieldName} must be a non-empty string`);
  }
  return value;
}

function optionalNonEmptyString(value: unknown, fieldName: string): string | undefined {
  return value === undefined ? undefined : nonEmptyString(value, fieldName);
}

function stringList(value: unknown, fieldName: string): string[] {
  if (value === undefined) {
    return [];
  }
  if (!Array.isArray(value)) {
    throw new TypeError(`${fieldName} must be an array of non-empty strings`);
  }
  return value.map((item, index) => nonEmptyString(item, `${fieldName}[${index}]`));
}

function requiredStringList(value: unknown, fieldName: string): string[] {
  if (value === undefined) {
    throw new TypeError(`${fieldName} must be an array of non-empty strings`);
  }
  return stringList(value, fieldName);
}

function positiveSafeInteger(value: unknown, fieldName: string): number {
  if (typeof value !== "number" || !Number.isSafeInteger(value) || value <= 0) {
    throw new TypeError(`${fieldName} must be a positive safe integer`);
  }
  return value;
}

function admissionPriorityOrDefault(value: unknown, taskId: string): number {
  if (value === undefined) return 0;
  if (typeof value !== "number" || !Number.isSafeInteger(value)) {
    throw new TypeError(`task ${taskId}.admissionPriority must be a safe integer`);
  }
  return value;
}

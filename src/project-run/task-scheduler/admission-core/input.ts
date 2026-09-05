import type { AdmissionGraphInput } from "../../../project-definition/scheduler-policy.ts";
import { prepareTaskGraph, type TaskGraph, type TaskScope } from "../graph.ts";
import { compilePreparedAdmissionGraph, type CompiledAdmissionGraph } from "./compiled-graph.ts";

/** Validates the exact standalone boundary before compiling the Scheduler-owned graph. */
export function compileAdmissionGraphInput(input: AdmissionGraphInput): CompiledAdmissionGraph {
  const data = exactRecord(input, "admission graph input", ["graph", "maxParallel"]);
  const maxParallel = data.maxParallel;
  if (typeof maxParallel !== "number" || !Number.isSafeInteger(maxParallel) || maxParallel <= 0) {
    throw new TypeError("admission graph maxParallel must be a positive safe integer");
  }
  return compilePreparedAdmissionGraph(
    prepareTaskGraph(taskGraphFromSchedulerSnapshot(data.graph), maxParallel),
    maxParallel
  );
}

function taskGraphFromSchedulerSnapshot(value: unknown): TaskGraph {
  const graph = exactRecord(value, "admission graph", ["scopes", "tasks"]);
  const rawTasks = requiredArray(graph.tasks, "admission graph tasks");
  const rawScopes = requiredArray(graph.scopes, "admission graph scopes");
  const tasks = rawTasks.map(taskFromInput);
  const scopes = rawScopes.map(scopeFromInput);
  return Object.freeze({
    scopes: Object.freeze(scopes),
    tasks: Object.freeze(tasks)
  });
}

function taskFromInput(candidate: unknown, index: number): TaskGraph["tasks"][number] {
  const label = `admission graph tasks[${index}]`;
  const task = exactRecord(candidate, label, [
    "admissionPriority",
    "dependsOn",
    "mutex",
    "observes",
    "scopeId",
    "taskId"
  ]);
  if (task.scopeId !== null && typeof task.scopeId !== "string") {
    throw new TypeError(`${label}.scopeId must be a string or null`);
  }
  return Object.freeze({
    admissionPriority: requiredNumber(task.admissionPriority, `${label}.admissionPriority`),
    dependsOn: stringArray(task.dependsOn, `${label}.dependsOn`),
    id: requiredString(task.taskId, `${label}.taskId`),
    mutex: stringArray(task.mutex, `${label}.mutex`),
    observes: stringArray(task.observes, `${label}.observes`),
    ...(task.scopeId === null ? {} : { scopeId: requiredString(task.scopeId, `${label}.scopeId`) })
  });
}

function scopeFromInput(candidate: unknown, index: number): TaskScope {
  const label = `admission graph scopes[${index}]`;
  const scope = exactRecord(candidate, label, [
    "activationTaskIds",
    "id",
    "maxParallel",
    "terminalTaskId"
  ]);
  return Object.freeze({
    activationTaskIds: stringArray(scope.activationTaskIds, `${label}.activationTaskIds`),
    id: requiredString(scope.id, `${label}.id`),
    maxParallel: requiredNumber(scope.maxParallel, `${label}.maxParallel`),
    terminalTaskId: requiredString(scope.terminalTaskId, `${label}.terminalTaskId`)
  });
}

function exactRecord(
  value: unknown,
  label: string,
  expectedKeys: readonly string[]
): Readonly<Record<string, unknown>> {
  if (!isPlainRecord(value)) throw new TypeError(`${label} must be a plain object`);
  if (
    Reflect.getPrototypeOf(value) !== Object.prototype &&
    Reflect.getPrototypeOf(value) !== null
  ) {
    throw new TypeError(`${label} must be a plain object`);
  }
  const keys = Reflect.ownKeys(value);
  if (
    keys.length !== expectedKeys.length ||
    keys.some((key) => typeof key !== "string" || !expectedKeys.includes(key))
  ) {
    throw new TypeError(`${label} must have exactly: ${expectedKeys.join(", ")}`);
  }
  return value;
}

function isPlainRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function requiredArray(value: unknown, label: string): readonly unknown[] {
  if (!Array.isArray(value)) throw new TypeError(`${label} must be an array`);
  return value;
}

function requiredNumber(value: unknown, label: string): number {
  if (typeof value !== "number") throw new TypeError(`${label} must be a number`);
  return value;
}

function requiredString(value: unknown, label: string): string {
  if (typeof value !== "string") throw new TypeError(`${label} must be a string`);
  return value;
}

function stringArray(value: unknown, label: string): readonly string[] {
  const strings: string[] = [];
  for (const item of requiredArray(value, label)) {
    if (typeof item !== "string") throw new TypeError(`${label} must contain only strings`);
    strings.push(item);
  }
  return Object.freeze(strings);
}

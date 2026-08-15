export interface TaskNode {
  readonly id: string;
  readonly dependsOn?: readonly string[];
  readonly mutex?: readonly string[];
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
  readonly id: string;
  readonly dependsOn: readonly string[];
  readonly mutex: readonly string[];
  readonly scopeId: string | undefined;
}

export interface PlannedTaskScope {
  readonly id: string;
  readonly maxParallel: number;
  readonly activationTaskIds: readonly string[];
  readonly terminalTaskId: string;
}

export interface PlannedTaskGraph {
  readonly tasks: readonly PlannedTask[];
  readonly scopes: readonly PlannedTaskScope[];
}

interface ScopeValidationInput {
  readonly rootMaxParallel: number | undefined;
  readonly scopeById: ReadonlyMap<string, PlannedTaskScope>;
  readonly scopes: readonly PlannedTaskScope[];
  readonly taskById: ReadonlyMap<string, PlannedTask>;
  readonly tasks: readonly PlannedTask[];
}

interface DependencyPathQuery {
  readonly requiredDependencyId: string;
  readonly taskById: ReadonlyMap<string, PlannedTask>;
  readonly taskId: string;
}

const TASK_GRAPH_KEYS = ["tasks", "scopes"] as const;
const TASK_NODE_KEYS = ["id", "dependsOn", "mutex", "scopeId"] as const;
const TASK_SCOPE_KEYS = ["id", "maxParallel", "activationTaskIds", "terminalTaskId"] as const;

export function validateTaskGraph(graph: TaskGraph): void {
  prepareTaskGraph(graph);
}

export function prepareTaskGraph(graph: TaskGraph, rootMaxParallel?: number): PlannedTaskGraph {
  const data = record(graph, "task graph", TASK_GRAPH_KEYS);
  const tasks = normalizeTasks(data.tasks);
  const scopes = normalizeScopes(data.scopes);
  const taskById = new Map(tasks.map((task) => [task.id, task] as const));
  const scopeById = new Map(scopes.map((scope) => [scope.id, scope] as const));

  validateDependencies(tasks, taskById);
  validateDependencyCycles(tasks, taskById);
  validateScopes({ rootMaxParallel, scopeById, scopes, taskById, tasks });

  return Object.freeze({
    tasks: Object.freeze(tasks),
    scopes: Object.freeze(scopes)
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
    const scopeId = optionalNonEmptyString(data.scopeId, `task ${id}.scopeId`);
    tasks.push(Object.freeze({
      id,
      dependsOn: Object.freeze(stringList(data.dependsOn, `task ${id}.dependsOn`)),
      mutex: Object.freeze(stringList(data.mutex, `task ${id}.mutex`)),
      scopeId
    }));
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
    scopes.push(Object.freeze({
      id,
      maxParallel,
      activationTaskIds: Object.freeze(activationTaskIds),
      terminalTaskId
    }));
  }
  return scopes;
}

function validateDependencies(
  tasks: readonly PlannedTask[],
  taskById: ReadonlyMap<string, PlannedTask>
): void {
  for (const task of tasks) {
    for (const dependency of task.dependsOn) {
      if (!taskById.has(dependency)) {
        throw new Error(`task ${task.id} depends on unknown task ${dependency}`);
      }
    }
  }
}

function validateDependencyCycles(
  tasks: readonly PlannedTask[],
  taskById: ReadonlyMap<string, PlannedTask>
): void {
  const visiting = new Set<string>();
  const visited = new Set<string>();

  const visit = (task: PlannedTask): void => {
    if (visiting.has(task.id)) {
      throw new Error(`task dependency cycle includes ${task.id}`);
    }
    if (visited.has(task.id)) {
      return;
    }
    visiting.add(task.id);
    for (const dependency of task.dependsOn) {
      const dependencyTask = taskById.get(dependency);
      if (dependencyTask === undefined) {
        throw new Error(`task ${task.id} depends on unknown task ${dependency}`);
      }
      visit(dependencyTask);
    }
    visiting.delete(task.id);
    visited.add(task.id);
  };

  for (const task of tasks) {
    visit(task);
  }
}

function validateScopes(input: ScopeValidationInput): void {
  validateRootMaxParallel(input.rootMaxParallel);
  validateTaskScopeMembership(input.tasks, input.scopeById);
  for (const scope of input.scopes) {
    validateScopeCap(scope, input.rootMaxParallel);
    validateScopeTerminal(scope, input.taskById);
    validateScopeActivation(scope, input.taskById);
    validateScopeTerminalReachability(scope, input.tasks, input.taskById);
  }
}

function validateRootMaxParallel(rootMaxParallel: number | undefined): void {
  if (rootMaxParallel !== undefined) {
    positiveSafeInteger(rootMaxParallel, "task engine maxParallel");
  }
}

function validateTaskScopeMembership(
  tasks: readonly PlannedTask[],
  scopeById: ReadonlyMap<string, PlannedTaskScope>
): void {
  for (const task of tasks) {
    if (task.scopeId !== undefined && !scopeById.has(task.scopeId)) {
      throw new Error(`task ${task.id} references unknown scope ${task.scopeId}`);
    }
  }
}

function validateScopeCap(scope: PlannedTaskScope, rootMaxParallel: number | undefined): void {
  if (rootMaxParallel !== undefined && scope.maxParallel > rootMaxParallel) {
    throw new Error(`task scope ${scope.id} maxParallel exceeds task engine maxParallel`);
  }
}

function validateScopeTerminal(
  scope: PlannedTaskScope,
  taskById: ReadonlyMap<string, PlannedTask>
): void {
  const terminal = taskById.get(scope.terminalTaskId);
  if (terminal?.scopeId !== scope.id) {
    throw new Error(`task scope ${scope.id} terminal task must belong to the scope`);
  }
}

function validateScopeActivation(
  scope: PlannedTaskScope,
  taskById: ReadonlyMap<string, PlannedTask>
): void {
  const activationIds = new Set<string>();
  for (const taskId of scope.activationTaskIds) {
    if (activationIds.has(taskId)) {
      throw new Error(`task scope ${scope.id} repeats activation task ${taskId}`);
    }
    activationIds.add(taskId);
    const task = taskById.get(taskId);
    if (task?.scopeId !== scope.id) {
      throw new Error(`task scope ${scope.id} activation task must belong to the scope: ${taskId}`);
    }
  }
}

function validateScopeTerminalReachability(
  scope: PlannedTaskScope,
  tasks: readonly PlannedTask[],
  taskById: ReadonlyMap<string, PlannedTask>
): void {
  for (const task of tasks) {
    if (task.scopeId !== scope.id || task.id === scope.terminalTaskId) {
      continue;
    }
    if (!dependsOnTask({
      requiredDependencyId: task.id,
      taskById,
      taskId: scope.terminalTaskId
    })) {
      throw new Error(`task scope ${scope.id} terminal task must depend on scoped task ${task.id}`);
    }
  }
}

function dependsOnTask(query: DependencyPathQuery): boolean {
  const pending = [...(query.taskById.get(query.taskId)?.dependsOn ?? [])];
  const visited = new Set<string>();
  while (pending.length > 0) {
    const dependencyId = pending.pop();
    if (dependencyId === undefined || visited.has(dependencyId)) {
      continue;
    }
    if (dependencyId === query.requiredDependencyId) {
      return true;
    }
    visited.add(dependencyId);
    pending.push(...(query.taskById.get(dependencyId)?.dependsOn ?? []));
  }
  return false;
}

function record(
  value: unknown,
  fieldName: string,
  allowedKeys: readonly string[]
): Readonly<Record<string, unknown>> {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    throw new TypeError(`${fieldName} must be an object`);
  }
  for (const key of Object.keys(value)) {
    if (!allowedKeys.includes(key)) {
      throw new TypeError(`${fieldName} has unknown property: ${key}`);
    }
  }
  return value as Readonly<Record<string, unknown>>;
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

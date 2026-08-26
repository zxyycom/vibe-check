import type { PlannedTask, PlannedTaskScope } from "./graph.ts";

interface PreparedTaskGraphValidationInput {
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

interface DependencyTraversal {
  readonly pending: string[];
  readonly query: DependencyPathQuery;
  readonly visited: Set<string>;
}

/** Validates dependency and scope relations after graph-shaped input is normalized. */
export function validatePreparedTaskGraph(input: PreparedTaskGraphValidationInput): void {
  validateDependencies(input.tasks, input.taskById);
  validateDependencyCycles(input.tasks, input.taskById);
  validateScopes(input);
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
    if (visited.has(task.id)) return;

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

function validateScopes(input: PreparedTaskGraphValidationInput): void {
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
  if (
    rootMaxParallel !== undefined &&
    (!Number.isSafeInteger(rootMaxParallel) || rootMaxParallel <= 0)
  ) {
    throw new TypeError("task engine maxParallel must be a positive safe integer");
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
    if (task.scopeId !== scope.id || task.id === scope.terminalTaskId) continue;
    if (!dependsOnTask({ requiredDependencyId: task.id, taskById, taskId: scope.terminalTaskId })) {
      throw new Error(`task scope ${scope.id} terminal task must depend on scoped task ${task.id}`);
    }
  }
}

function dependsOnTask(query: DependencyPathQuery): boolean {
  return traverseDependencies({
    pending: [...taskDependencies(query.taskById, query.taskId)],
    query,
    visited: new Set()
  });
}

function traverseDependencies(traversal: DependencyTraversal): boolean {
  while (traversal.pending.length > 0) {
    const dependencyId = traversal.pending.pop();
    if (dependencyId === undefined || traversal.visited.has(dependencyId)) continue;
    if (dependencyId === traversal.query.requiredDependencyId) return true;

    traversal.visited.add(dependencyId);
    traversal.pending.push(...taskDependencies(traversal.query.taskById, dependencyId));
  }
  return false;
}

function taskDependencies(
  taskById: ReadonlyMap<string, PlannedTask>,
  taskId: string
): readonly string[] {
  const task = taskById.get(taskId);
  return task === undefined ? [] : task.dependsOn;
}

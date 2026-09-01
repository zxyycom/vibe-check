import type { PlannedTask, PlannedTaskScope } from "./graph.ts";

interface PreparedTaskGraphValidationInput {
  readonly rootMaxParallel: number | undefined;
  readonly scopeById: ReadonlyMap<string, PlannedTaskScope>;
  readonly scopes: readonly PlannedTaskScope[];
  readonly taskById: ReadonlyMap<string, PlannedTask>;
  readonly tasks: readonly PlannedTask[];
}

type TaskRelationField = "dependsOn" | "observes";

interface TaskRelationPathQuery {
  readonly requiredRelatedTaskId: string;
  readonly taskById: ReadonlyMap<string, PlannedTask>;
  readonly taskId: string;
}

interface TaskRelationTraversal {
  readonly pending: string[];
  readonly query: TaskRelationPathQuery;
  readonly visited: Set<string>;
}

/** Validates direct relations and scope structure after graph-shaped input is normalized. */
export function validatePreparedTaskGraph(input: PreparedTaskGraphValidationInput): void {
  validateTaskRelations(input.tasks, input.taskById);
  validateTaskRelationCycles(input.tasks, input.taskById);
  validateScopes(input);
}

function validateTaskRelations(
  tasks: readonly PlannedTask[],
  taskById: ReadonlyMap<string, PlannedTask>
): void {
  for (const task of tasks) {
    validateRelatedTaskIds(task, "dependsOn", task.dependsOn, taskById);
    validateRelatedTaskIds(task, "observes", task.observes, taskById);
    for (const dependencyId of task.dependsOn) {
      if (task.observes.includes(dependencyId)) {
        throw new Error(`task ${task.id} cannot both depend on and observe task ${dependencyId}`);
      }
    }
  }
}

function validateRelatedTaskIds(
  task: PlannedTask,
  relation: TaskRelationField,
  relationTargetIds: readonly string[],
  taskById: ReadonlyMap<string, PlannedTask>
): void {
  const action = relation === "dependsOn" ? "depends on" : "observes";
  for (const relatedTaskId of relationTargetIds) {
    if (!taskById.has(relatedTaskId)) {
      throw new Error(`task ${task.id} ${action} unknown task ${relatedTaskId}`);
    }
  }
}

function validateTaskRelationCycles(
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
    for (const relatedTaskId of relatedTaskIds(task)) {
      const relatedTask = taskById.get(relatedTaskId);
      if (relatedTask === undefined) {
        throw new Error(`task ${task.id} relates to unknown task ${relatedTaskId}`);
      }
      visit(relatedTask);
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
    if (
      !isRelatedToTask({ requiredRelatedTaskId: task.id, taskById, taskId: scope.terminalTaskId })
    ) {
      throw new Error(`task scope ${scope.id} terminal task must relate to scoped task ${task.id}`);
    }
  }
}

function isRelatedToTask(query: TaskRelationPathQuery): boolean {
  return traverseTaskRelations({
    pending: [...relatedTaskIdsFor(query.taskById, query.taskId)],
    query,
    visited: new Set()
  });
}

function traverseTaskRelations(traversal: TaskRelationTraversal): boolean {
  while (traversal.pending.length > 0) {
    const relatedTaskId = traversal.pending.pop();
    if (relatedTaskId === undefined || traversal.visited.has(relatedTaskId)) continue;
    if (relatedTaskId === traversal.query.requiredRelatedTaskId) return true;

    traversal.visited.add(relatedTaskId);
    traversal.pending.push(...relatedTaskIdsFor(traversal.query.taskById, relatedTaskId));
  }
  return false;
}

function relatedTaskIdsFor(
  taskById: ReadonlyMap<string, PlannedTask>,
  taskId: string
): readonly string[] {
  const task = taskById.get(taskId);
  return task === undefined ? [] : relatedTaskIds(task);
}

function relatedTaskIds(task: PlannedTask): readonly string[] {
  return [...task.dependsOn, ...task.observes];
}

import type {
  AdmissionPolicyContext,
  SchedulerGraphSnapshot
} from "../../project-definition/project-definition.ts";

type Candidate = AdmissionPolicyContext["candidates"][number];
type Task = SchedulerGraphSnapshot["tasks"][number];
type Scope = SchedulerGraphSnapshot["scopes"][number];

export interface LearnedSelectionGraph {
  readonly scopeById: ReadonlyMap<string, Scope>;
  readonly taskById: ReadonlyMap<string, Task>;
}

export interface LearnedSelectionLayers extends LearnedSelectionGraph {
  readonly continuation: readonly Candidate[];
  readonly tightening: readonly Candidate[];
}

/** Indexes the immutable public graph separately from each decision's boundary facts. */
export function createLearnedSelectionGraph(graph: SchedulerGraphSnapshot): LearnedSelectionGraph {
  return Object.freeze({
    scopeById: new Map(graph.scopes.map((scope) => [scope.id, scope] as const)),
    taskById: new Map(graph.tasks.map((task) => [task.taskId, task] as const))
  });
}

/** Projects the public graph and boundary facts into the Scheduler's two constrained selection layers. */
export function learnedSelectionLayers(
  context: AdmissionPolicyContext,
  graph: LearnedSelectionGraph = createLearnedSelectionGraph(context.graph)
): LearnedSelectionLayers {
  const { taskById, scopeById } = graph;
  const activeScopeIds = new Set(context.activeScopeIds);
  return Object.freeze({
    continuation: Object.freeze(
      context.candidates.filter((candidate) =>
        isContinuation(candidate, taskById, scopeById, activeScopeIds, context.capacity.maxParallel)
      )
    ),
    scopeById,
    taskById,
    tightening: Object.freeze(
      context.candidates.filter((candidate) =>
        isTightening(candidate, taskById, scopeById, activeScopeIds, context.capacity.maxParallel)
      )
    )
  });
}

function isTightening(
  candidate: Candidate,
  taskById: ReadonlyMap<string, Task>,
  scopeById: ReadonlyMap<string, Scope>,
  activeScopeIds: ReadonlySet<string>,
  maxParallel: number
): boolean {
  const scope = scopeForCandidate(candidate, taskById, scopeById);
  return (
    scope?.activationTaskIds.includes(candidate.taskId) === true &&
    !activeScopeIds.has(scope.id) &&
    scope.maxParallel < maxParallel
  );
}

function isContinuation(
  candidate: Candidate,
  taskById: ReadonlyMap<string, Task>,
  scopeById: ReadonlyMap<string, Scope>,
  activeScopeIds: ReadonlySet<string>,
  maxParallel: number
): boolean {
  const scope = scopeForCandidate(candidate, taskById, scopeById);
  return scope !== undefined && activeScopeIds.has(scope.id) && scope.maxParallel < maxParallel;
}

export function scopeForCandidate(
  candidate: Candidate,
  taskById: ReadonlyMap<string, Task>,
  scopeById: ReadonlyMap<string, Scope>
): Scope | undefined {
  const task = taskById.get(candidate.taskId);
  return task?.scopeId === null || task === undefined ? undefined : scopeById.get(task.scopeId);
}

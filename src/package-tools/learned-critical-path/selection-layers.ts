import type {
  AdmissionPolicyContext,
  SchedulerGraphSnapshot
} from "../../project-definition/project-definition.ts";

type Candidate = AdmissionPolicyContext["candidates"][number];
type Task = SchedulerGraphSnapshot["tasks"][number];
type Scope = SchedulerGraphSnapshot["scopes"][number];

export interface LearnedSelectionGraph {
  readonly activationTaskIdsByScopeId: ReadonlyMap<string, ReadonlySet<string>>;
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
    activationTaskIdsByScopeId: new Map(
      graph.scopes.map((scope) => [scope.id, new Set(scope.activationTaskIds)] as const)
    ),
    scopeById: new Map(graph.scopes.map((scope) => [scope.id, scope] as const)),
    taskById: new Map(graph.tasks.map((task) => [task.taskId, task] as const))
  });
}

/** Projects the public graph and boundary facts into the Scheduler's two constrained selection layers. */
export function learnedSelectionLayers(
  context: AdmissionPolicyContext,
  graph: LearnedSelectionGraph = createLearnedSelectionGraph(context.graph)
): LearnedSelectionLayers {
  const { taskById, scopeById, activationTaskIdsByScopeId } = graph;
  const activeScopeIds = new Set(context.activeScopeIds);
  const continuation: Candidate[] = [];
  const tightening: Candidate[] = [];
  for (const candidate of context.candidates) {
    const scope = scopeForCandidate(candidate, taskById, scopeById);
    if (scope === undefined || scope.maxParallel >= context.capacity.maxParallel) continue;
    if (activeScopeIds.has(scope.id)) continuation.push(candidate);
    else if (activationTaskIdsByScopeId.get(scope.id)?.has(candidate.taskId) === true)
      tightening.push(candidate);
  }
  return Object.freeze({
    ...graph,
    continuation: Object.freeze(continuation),
    tightening: Object.freeze(tightening)
  });
}

/** Stable sort's first item without sorting or allocating an ordered copy. */
export function firstCandidateBy(
  candidates: readonly Candidate[],
  compare: (left: Candidate, right: Candidate) => number
): Candidate | undefined {
  let first: Candidate | undefined;
  for (const candidate of candidates) {
    if (first === undefined || compare(candidate, first) < 0) first = candidate;
  }
  return first;
}

export function scopeForCandidate(
  candidate: Candidate,
  taskById: ReadonlyMap<string, Task>,
  scopeById: ReadonlyMap<string, Scope>
): Scope | undefined {
  const task = taskById.get(candidate.taskId);
  return task?.scopeId === null || task === undefined ? undefined : scopeById.get(task.scopeId);
}

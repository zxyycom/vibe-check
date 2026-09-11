import type {
  AdmissionPolicyContext,
  SchedulerGraphSnapshot
} from "../project-definition/project-definition.ts";

type Candidate = AdmissionPolicyContext["candidates"][number];
type Task = SchedulerGraphSnapshot["tasks"][number];
type Scope = SchedulerGraphSnapshot["scopes"][number];

export interface LearnedSelectionLayers {
  readonly continuation: readonly Candidate[];
  readonly scopeById: ReadonlyMap<string, Scope>;
  readonly taskById: ReadonlyMap<string, Task>;
  readonly tightening: readonly Candidate[];
}

/** Projects the public graph and boundary facts into the Scheduler's two constrained selection layers. */
export function learnedSelectionLayers(context: AdmissionPolicyContext): LearnedSelectionLayers {
  const taskById = new Map(context.graph.tasks.map((task) => [task.taskId, task] as const));
  const scopeById = new Map(context.graph.scopes.map((scope) => [scope.id, scope] as const));
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

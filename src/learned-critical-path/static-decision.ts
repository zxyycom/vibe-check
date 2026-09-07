import type {
  AdmissionPolicyContext,
  AdmissionProposal,
  SchedulerGraphSnapshot
} from "../project-definition/project-definition.ts";
import { learnedSelectionLayers, scopeForCandidate } from "./selection-layers.ts";

type Candidate = AdmissionPolicyContext["candidates"][number];
type Task = SchedulerGraphSnapshot["tasks"][number];
type Scope = SchedulerGraphSnapshot["scopes"][number];

/** Preserves ordinary static selection when learned preparation cannot form a ranking. */
export function staticDecision(context: AdmissionPolicyContext): AdmissionProposal {
  const layers = learnedSelectionLayers(context);
  const selected = selectStaticCandidate(
    context.candidates,
    layers.continuation,
    layers.scopeById,
    layers.taskById,
    layers.tightening
  );
  return selected === undefined || !selected.canAdmit
    ? Object.freeze({ kind: "wait" })
    : Object.freeze({ kind: "select", taskId: selected.taskId });
}

function selectStaticCandidate(
  candidates: readonly Candidate[],
  continuation: readonly Candidate[],
  scopeById: ReadonlyMap<string, Scope>,
  taskById: ReadonlyMap<string, Task>,
  tightening: readonly Candidate[]
): Candidate | undefined {
  if (tightening.length > 0) return first(sortConstrained(tightening, taskById, scopeById));
  if (continuation.length > 0) return first(sortConstrained(continuation, taskById, scopeById));
  return selectOrdinary(candidates, taskById);
}

function selectOrdinary(
  candidates: readonly Candidate[],
  taskById: ReadonlyMap<string, Task>
): Candidate | undefined {
  const admissible = candidates.filter((candidate) => candidate.canAdmit);
  return [...(admissible.length === 0 ? candidates : admissible)].sort(
    (left, right) =>
      priorityDifference(left, right, taskById) || compareText(left.taskId, right.taskId)
  )[0];
}

function sortConstrained(
  candidates: readonly Candidate[],
  taskById: ReadonlyMap<string, Task>,
  scopeById: ReadonlyMap<string, Scope>
): Candidate[] {
  return [...candidates].sort((left, right) =>
    constrainedComparison(left, right, taskById, scopeById)
  );
}

function constrainedComparison(
  left: Candidate,
  right: Candidate,
  taskById: ReadonlyMap<string, Task>,
  scopeById: ReadonlyMap<string, Scope>
): number {
  const leftScope = requiredScope(left, taskById, scopeById);
  const rightScope = requiredScope(right, taskById, scopeById);
  return (
    leftScope.maxParallel - rightScope.maxParallel ||
    priorityDifference(left, right, taskById) ||
    compareText(leftScope.id, rightScope.id) ||
    compareText(left.taskId, right.taskId)
  );
}

function requiredScope(
  candidate: Candidate,
  taskById: ReadonlyMap<string, Task>,
  scopeById: ReadonlyMap<string, Scope>
): Scope {
  const scope = scopeForCandidate(candidate, taskById, scopeById);
  if (scope === undefined) throw new Error("constrained task is missing a scope");
  return scope;
}

function priorityDifference(
  left: Candidate,
  right: Candidate,
  taskById: ReadonlyMap<string, Task>
): number {
  return (
    (taskById.get(right.taskId)?.admissionPriority ?? 0) -
    (taskById.get(left.taskId)?.admissionPriority ?? 0)
  );
}
function compareText(left: string, right: string): number {
  if (left < right) return -1;
  if (left > right) return 1;
  return 0;
}
function first<T>(values: readonly T[]): T {
  const value = values[0];
  if (value === undefined) throw new Error("static strategy requires a candidate");
  return value;
}

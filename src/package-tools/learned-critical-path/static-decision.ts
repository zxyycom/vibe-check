import { defineContextCallback } from "../context-callback/define-context-callback.ts";
import type { LearnedDecisionContext } from "./strategy-contract.ts";
import type {
  AdmissionPolicyContext,
  AdmissionProposal,
  SchedulerGraphSnapshot
} from "../../project-definition/project-definition.ts";
import {
  createLearnedSelectionGraph,
  firstCandidateBy,
  learnedSelectionLayers,
  scopeForCandidate,
  type LearnedSelectionGraph,
  type LearnedSelectionLayers
} from "./selection-layers.ts";

type Candidate = AdmissionPolicyContext["candidates"][number];
type Task = SchedulerGraphSnapshot["tasks"][number];
type Scope = SchedulerGraphSnapshot["scopes"][number];

/** One Run-local index also serves every static fallback boundary. */
export function createStaticDecision(graph: SchedulerGraphSnapshot) {
  const indexes = createLearnedSelectionGraph(graph);
  return defineContextCallback("scheduler.decide", {
    contextNeeds: ["activeScopeIds", "candidates", "capacity"],
    callback: (context) => staticDecision(context, indexes)
  });
}

/** Preserves ordinary static selection when learned preparation cannot form a ranking. */
function staticDecision(
  context: LearnedDecisionContext,
  graph: LearnedSelectionGraph
): AdmissionProposal {
  const layers = learnedSelectionLayers(context, graph);
  const selected = selectStaticCandidate(context.candidates, layers);
  return selected === undefined || !selected.canAdmit
    ? Object.freeze({ kind: "wait" })
    : Object.freeze({ kind: "select", taskId: selected.taskId });
}

function selectStaticCandidate(
  candidates: readonly Candidate[],
  layers: LearnedSelectionLayers
): Candidate | undefined {
  if (layers.tightening.length > 0)
    return firstConstrained(layers.tightening, layers.taskById, layers.scopeById);
  if (layers.continuation.length > 0)
    return firstConstrained(layers.continuation, layers.taskById, layers.scopeById);
  return selectOrdinary(candidates, layers.taskById);
}

function selectOrdinary(
  candidates: readonly Candidate[],
  taskById: ReadonlyMap<string, Task>
): Candidate | undefined {
  return firstCandidateBy(
    candidates,
    (left, right) =>
      Number(right.canAdmit) - Number(left.canAdmit) ||
      priorityDifference(left, right, taskById) ||
      compareText(left.taskId, right.taskId)
  );
}

function firstConstrained(
  candidates: readonly Candidate[],
  taskById: ReadonlyMap<string, Task>,
  scopeById: ReadonlyMap<string, Scope>
): Candidate | undefined {
  return firstCandidateBy(candidates, (left, right) =>
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

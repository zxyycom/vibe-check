import type { PlannedTask, PlannedTaskGraph } from "./graph.ts";
import type { AdmissionCoreState } from "./admission-core/core.ts";
import {
  isConstrainedScopeContinuation,
  scopeForTask,
  tighteningScopeForTask
} from "./admission-scope-layers.ts";
import type { SchedulerInspection } from "./scheduler-decision-inspection.ts";
import type {
  AdmissionPolicyContext,
  SchedulerGraphSnapshot
} from "../../project-definition/project-definition.ts";

export interface AdmissionCandidate {
  readonly canAdmit: boolean;
  readonly task: PlannedTask;
}

export interface AdmissionPolicyInput {
  /** Shared immutable core at this decision boundary; only custom context projects its public handle. */
  readonly admissionCore: AdmissionCoreState;
  /** Scheduler-owned decision-boundary measurement, present only for custom policy. */
  readonly measurement?: AdmissionPolicyContext["measurement"];
  readonly candidates: readonly AdmissionCandidate[];
  readonly graph: PlannedTaskGraph;
  readonly graphSnapshot: SchedulerGraphSnapshot;
  readonly inspection: SchedulerInspection;
}

export type AdmissionPolicyDecision =
  | Readonly<{ readonly kind: "select"; readonly taskId: string }>
  | Readonly<{ readonly kind: "wait" }>;

/** A Product-private pure admission policy; it receives no executor or mutable scheduler state. */
export interface AdmissionSelectionPolicy {
  /** Only custom policies require Scheduler sampling before every callback. */
  readonly requiresMeasurement?: true;
  readonly decide: (input: AdmissionPolicyInput) => AdmissionPolicyDecision;
}

export const staticAdmissionSelectionPolicy: AdmissionSelectionPolicy = Object.freeze({
  decide: decideStaticAdmission
});

function decideStaticAdmission(input: AdmissionPolicyInput): AdmissionPolicyDecision {
  const activeScopeIds = new Set(input.inspection.activeScopeIds);
  const tightening = selectTighteningCandidate(input, activeScopeIds);
  if (tightening !== undefined) return proposalFor(tightening);

  const continuation = selectConstrainedContinuation(input, activeScopeIds);
  if (continuation !== undefined) return proposalFor(continuation);

  return proposalFor(selectOrdinaryReadyCandidate(input.candidates));
}

function proposalFor(candidate: AdmissionCandidate): AdmissionPolicyDecision {
  return candidate.canAdmit
    ? Object.freeze({ kind: "select", taskId: candidate.task.id })
    : Object.freeze({ kind: "wait" });
}

function selectTighteningCandidate(
  input: AdmissionPolicyInput,
  activeScopeIds: ReadonlySet<string>
): AdmissionCandidate | undefined {
  let selected: AdmissionCandidate | undefined;
  for (const candidate of input.candidates) {
    if (
      tighteningScopeForTask(
        input.admissionCore.compiled,
        input.inspection.maxParallel,
        activeScopeIds,
        candidate.task
      ) === undefined
    ) {
      continue;
    }
    if (selected === undefined || compareConstrainedCandidates(input, candidate, selected) < 0) {
      selected = candidate;
    }
  }
  return selected;
}

function selectConstrainedContinuation(
  input: AdmissionPolicyInput,
  activeScopeIds: ReadonlySet<string>
): AdmissionCandidate | undefined {
  let selected: AdmissionCandidate | undefined;
  for (const candidate of input.candidates) {
    if (
      !isConstrainedScopeContinuation(
        input.admissionCore.compiled,
        input.inspection.maxParallel,
        activeScopeIds,
        candidate.task
      )
    ) {
      continue;
    }
    if (selected === undefined || compareConstrainedCandidates(input, candidate, selected) < 0) {
      selected = candidate;
    }
  }
  return selected;
}

function selectOrdinaryReadyCandidate(
  candidates: readonly AdmissionCandidate[]
): AdmissionCandidate {
  const admissible = candidates.filter(({ canAdmit }) => canAdmit);
  const selectable = admissible.length === 0 ? candidates : admissible;
  const [first, ...remaining] = selectable;
  if (first === undefined) throw new Error("static scheduler selection requires a candidate");
  return remaining.reduce(
    (selected, candidate) =>
      candidate.task.admissionPriority > selected.task.admissionPriority ? candidate : selected,
    first
  );
}

function compareConstrainedCandidates(
  input: AdmissionPolicyInput,
  left: AdmissionCandidate,
  right: AdmissionCandidate
): number {
  const leftScope = scopeForTask(input.admissionCore.compiled, left.task);
  const rightScope = scopeForTask(input.admissionCore.compiled, right.task);
  if (leftScope === undefined || rightScope === undefined) {
    throw new Error("constrained task is missing a scope");
  }
  return (
    leftScope.maxParallel - rightScope.maxParallel ||
    right.task.admissionPriority - left.task.admissionPriority ||
    compareText(leftScope.id, rightScope.id) ||
    compareText(left.task.id, right.task.id)
  );
}

function compareText(left: string, right: string): number {
  if (left < right) return -1;
  if (left > right) return 1;
  return 0;
}

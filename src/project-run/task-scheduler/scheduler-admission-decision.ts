import type { AdmissionPolicyContext } from "../../project-definition/project-definition.ts";
import type {
  AdmissionCandidate,
  AdmissionPolicyDecision,
  AdmissionSelectionPolicy
} from "./admission-selection-policy.ts";
import {
  activationScopeFor,
  canAdmit,
  isRelationMutexEligible
} from "./scheduler-decision-inspection.ts";
import {
  freezeDecision,
  type SchedulerAdmissionCandidateFact,
  type SchedulerAdmissionHardGuard,
  type SchedulerDecision,
  type SchedulerDecisionContext,
  type SchedulerTrigger
} from "./scheduler-decision-model.ts";
import type { SchedulerInspection } from "./scheduler-decision-inspection.ts";

export interface SchedulerDecisionCycle {
  readonly context: SchedulerDecisionContext;
  readonly policy: AdmissionSelectionPolicy;
  /** Invoked immediately before the private policy seam enters a custom callback. */
  readonly measurement?: () => AdmissionPolicyContext["measurement"];
  readonly state: SchedulerInspection;
  readonly trigger: SchedulerTrigger;
}

export function decideAdmission(cycle: SchedulerDecisionCycle): SchedulerDecision {
  const candidates = Object.freeze(
    cycle.state.pendingTasks
      .filter((task) => isRelationMutexEligible(task, cycle.state))
      .map((task) => Object.freeze({ canAdmit: canAdmit(cycle.state, task), task }))
  );
  if (candidates.length === 0) return awaitDecision(cycle, candidates);

  const measurement = cycle.measurement?.();
  const result = validatePolicyDecision(
    cycle.policy.decide(
      Object.freeze({
        candidates,
        graph: cycle.state.graph,
        graphSnapshot: cycle.context.graphIdentity,
        inspection: cycle.state,
        ...(measurement === undefined ? {} : { measurement })
      })
    )
  );
  return result.kind === "select"
    ? admitDecision(cycle, candidates, result)
    : awaitDecision(cycle, candidates, result);
}

function admitDecision(
  cycle: SchedulerDecisionCycle,
  candidates: readonly AdmissionCandidate[],
  result: Extract<AdmissionPolicyDecision, { readonly kind: "select" }>
): SchedulerDecision {
  const candidate = candidateFor(result.taskId, candidates);
  if (candidate === undefined) {
    throw new AdmissionPolicyFault("non-candidate-select");
  }
  if (!candidate.canAdmit) {
    throw new AdmissionPolicyFault("capacity-invalid-select");
  }
  return freezeDecision({
    ...cycle.context,
    admissionPriority: candidate.task.admissionPriority,
    candidates: candidateFacts(candidates),
    eligibleCount: candidates.length,
    hardGuard: selectHardGuard(candidate.task.id),
    kind: "admit",
    proposal: result,
    scopeToActivate: activationScopeFor(cycle.state, candidate.task)?.id ?? null,
    taskId: candidate.task.id,
    trigger: cycle.trigger
  });
}

function awaitDecision(
  cycle: SchedulerDecisionCycle,
  candidates: readonly AdmissionCandidate[],
  proposal: AdmissionPolicyDecision | null = null
): SchedulerDecision {
  if (cycle.state.runningTaskIds.length === 0) {
    throw new AdmissionPolicyFault("undrainable-wait");
  }
  return freezeDecision({
    ...cycle.context,
    candidates: candidateFacts(candidates),
    eligibleCount: candidates.length,
    hardGuard: waitHardGuard(),
    kind: "await-running",
    proposal,
    trigger: cycle.trigger
  });
}

function candidateFacts(
  candidates: readonly AdmissionCandidate[]
): readonly SchedulerAdmissionCandidateFact[] {
  return Object.freeze(
    candidates.map((candidate) =>
      Object.freeze({ canAdmit: candidate.canAdmit, taskId: candidate.task.id })
    )
  );
}

function selectHardGuard(
  taskId: string
): Extract<SchedulerAdmissionHardGuard, { readonly kind: "select" }> {
  return Object.freeze({
    canAdmit: true,
    isCandidate: true,
    kind: "select",
    lifecycleOpen: true,
    taskId
  });
}

function waitHardGuard(): Extract<SchedulerAdmissionHardGuard, { readonly kind: "wait" }> {
  return Object.freeze({ kind: "wait", runningCanDrain: true });
}

function validatePolicyDecision(value: unknown): AdmissionPolicyDecision {
  if (!isRecord(value)) throw new AdmissionPolicyFault("malformed-proposal");
  if (value["kind"] === "select") {
    requireExactKeys(value, ["kind", "taskId"]);
    if (typeof value["taskId"] !== "string") {
      throw new AdmissionPolicyFault("malformed-proposal");
    }
    return Object.freeze({ kind: "select", taskId: value["taskId"] });
  }
  if (value["kind"] === "wait") {
    requireExactKeys(value, ["kind"]);
    return Object.freeze({ kind: "wait" });
  }
  throw new AdmissionPolicyFault("malformed-proposal");
}

function candidateFor(
  taskId: string,
  candidates: readonly AdmissionCandidate[]
): AdmissionCandidate | undefined {
  return candidates.find((candidate) => candidate.task.id === taskId);
}

function requireExactKeys(value: Readonly<Record<string, unknown>>, keys: readonly string[]): void {
  const prototype = Reflect.getPrototypeOf(value);
  if (prototype !== Object.prototype && prototype !== null) {
    throw new AdmissionPolicyFault("malformed-proposal");
  }
  const actualKeys = Reflect.ownKeys(value);
  if (
    actualKeys.length !== keys.length ||
    actualKeys.some((key) => typeof key !== "string" || !keys.includes(key))
  ) {
    throw new AdmissionPolicyFault("malformed-proposal");
  }
}

function isRecord(value: unknown): value is Readonly<Record<string, unknown>> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

export type AdmissionPolicyFaultCategory =
  | "callback-threw"
  | "thenable-proposal"
  | "malformed-proposal"
  | "non-candidate-select"
  | "capacity-invalid-select"
  | "lifecycle-invalid-select"
  | "undrainable-wait";

export class AdmissionPolicyFault extends Error {
  public readonly category: AdmissionPolicyFaultCategory;

  public constructor(category: AdmissionPolicyFaultCategory) {
    super("admission policy fault");
    this.category = category;
  }
}

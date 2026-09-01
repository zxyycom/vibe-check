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
  reservationUnchanged,
  type ReservationUpdate,
  type SchedulerAdmissionReason,
  type SchedulerAwaitReason,
  type SchedulerDecision,
  type SchedulerDecisionContext,
  type SchedulerTrigger
} from "./scheduler-decision-model.ts";
import type { SchedulerInspection } from "./scheduler-decision-inspection.ts";

export interface SchedulerDecisionCycle {
  readonly context: SchedulerDecisionContext;
  readonly policy: AdmissionSelectionPolicy;
  readonly state: SchedulerInspection;
  readonly trigger: SchedulerTrigger;
}

export function decideAdmission(cycle: SchedulerDecisionCycle): SchedulerDecision {
  const candidates = Object.freeze(
    cycle.state.pendingTasks
      .filter((task) => isRelationMutexEligible(task, cycle.state))
      .map((task) => Object.freeze({ canAdmit: canAdmit(cycle.state, task), task }))
  );
  if (candidates.length === 0) {
    return awaitDecision(cycle, candidates, "dependency-or-mutex", reservationUnchanged());
  }

  const result = validatePolicyDecision(
    cycle.policy.decide(
      Object.freeze({
        candidates,
        context: cycle.context,
        graph: cycle.state.graph,
        inspection: cycle.state
      })
    ),
    candidates,
    cycle.state
  );
  return result.kind === "select"
    ? admitDecision(cycle, candidates, result)
    : awaitDecision(cycle, candidates, result.reason, result.reservationUpdate);
}

function admitDecision(
  cycle: SchedulerDecisionCycle,
  candidates: readonly AdmissionCandidate[],
  result: Extract<AdmissionPolicyDecision, { readonly kind: "select" }>
): SchedulerDecision {
  const candidate = candidateFor(result.taskId, candidates);
  if (candidate === undefined || !candidate.canAdmit) {
    throw new Error("scheduler policy selected a task that cannot be admitted");
  }
  return freezeDecision({
    ...cycle.context,
    admissionPriority: candidate.task.admissionPriority,
    eligibleCount: candidates.length,
    kind: "admit",
    reason: result.reason,
    reservationUpdate: result.reservationUpdate,
    scopeToActivate: activationScopeFor(cycle.state, candidate.task)?.id ?? null,
    taskId: candidate.task.id,
    trigger: cycle.trigger
  });
}

function awaitDecision(
  cycle: SchedulerDecisionCycle,
  candidates: readonly AdmissionCandidate[],
  reason: SchedulerAwaitReason,
  reservationUpdate: ReservationUpdate
): SchedulerDecision {
  if (cycle.state.runningTaskIds.length === 0) {
    throw new Error("scheduler has pending tasks but no runnable or running task");
  }
  return freezeDecision({
    ...cycle.context,
    eligibleCount: candidates.length,
    kind: "await-running",
    reason,
    reservationUpdate,
    trigger: cycle.trigger
  });
}

function validatePolicyDecision(
  value: unknown,
  candidates: readonly AdmissionCandidate[],
  state: SchedulerInspection
): AdmissionPolicyDecision {
  if (!isRecord(value)) throw new Error("scheduler policy returned an invalid decision");
  const kind = value["kind"];
  if (kind === "select") {
    requireExactKeys(value, ["kind", "reason", "reservationUpdate", "taskId"]);
    if (typeof value["taskId"] !== "string" || !isAdmissionReason(value["reason"])) {
      throw new Error("scheduler policy returned an invalid select decision");
    }
    const reservationUpdate = validateReservationUpdate(value["reservationUpdate"], candidates);
    return Object.freeze({
      kind,
      reason: value["reason"],
      reservationUpdate,
      taskId: value["taskId"]
    });
  }
  if (kind === "wait") {
    requireExactKeys(value, ["kind", "reason", "reservationUpdate"]);
    if (!isAwaitReason(value["reason"])) {
      throw new Error("scheduler policy returned an invalid wait decision");
    }
    if (state.runningTaskIds.length === 0) {
      throw new Error("scheduler policy cannot wait when no task is running");
    }
    return Object.freeze({
      kind,
      reason: value["reason"],
      reservationUpdate: validateReservationUpdate(value["reservationUpdate"], candidates)
    });
  }
  throw new Error("scheduler policy returned an invalid decision");
}

function validateReservationUpdate(
  value: unknown,
  candidates: readonly AdmissionCandidate[]
): ReservationUpdate {
  if (!isRecord(value)) throw new Error("scheduler policy returned an invalid reservation update");
  const kind = value["kind"];
  if (kind === "unchanged" || kind === "clear") {
    requireExactKeys(value, ["kind"]);
    return Object.freeze({ kind });
  }
  if (kind === "set") {
    requireExactKeys(value, ["kind", "taskId"]);
    if (
      typeof value["taskId"] !== "string" ||
      candidateFor(value["taskId"], candidates) === undefined
    ) {
      throw new Error("scheduler policy reserved a task that is not a candidate");
    }
    return Object.freeze({ kind, taskId: value["taskId"] });
  }
  throw new Error("scheduler policy returned an invalid reservation update");
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
    throw new Error("scheduler policy returned an invalid decision shape");
  }
  const actualKeys = Reflect.ownKeys(value);
  if (
    actualKeys.length !== keys.length ||
    actualKeys.some((key) => typeof key !== "string" || !keys.includes(key))
  ) {
    throw new Error("scheduler policy returned an invalid decision shape");
  }
}

function isAdmissionReason(value: unknown): value is SchedulerAdmissionReason {
  return (
    value === "reservation" ||
    value === "tightening-scope" ||
    value === "constrained-continuation" ||
    value === "canonical-order" ||
    value === "policy-selection"
  );
}

function isAwaitReason(value: unknown): value is SchedulerAwaitReason {
  return (
    value === "cancellation-drain" ||
    value === "dependency-or-mutex" ||
    value === "running-drain" ||
    value === "root-capacity" ||
    value === "active-scope-capacity" ||
    value === "reserved-tightening-scope" ||
    value === "policy-wait"
  );
}

function isRecord(value: unknown): value is Readonly<Record<string, unknown>> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

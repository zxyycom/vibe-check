import type { PlannedTaskGraph } from "./graph.ts";

export type SchedulerSettlementKind =
  | "completed"
  | "prerequisite-unsatisfied"
  | "failed"
  | "blocked"
  | "cancelled-before-start";

export type SchedulerTrigger =
  | Readonly<{ readonly kind: "execution-started" }>
  | Readonly<{ readonly kind: "admission-continued" }>
  | Readonly<{ readonly kind: "blocked-settled"; readonly taskId: string }>
  | Readonly<{
      readonly kind: "task-settled";
      readonly settlementKind: SchedulerSettlementKind;
      readonly taskId: string;
    }>
  | Readonly<{ readonly kind: "cancellation-observed" }>
  | Readonly<{ readonly kind: "cancellation-applied" }>;

export interface SchedulerSnapshot {
  readonly graph: PlannedTaskGraph;
  readonly isAbortRequested: boolean;
  readonly isCancelled: boolean;
  readonly pendingTaskIds: readonly string[];
  readonly reservationTaskId: string | undefined;
  readonly runningMutexes: readonly string[];
  readonly runningTaskIds: readonly string[];
  readonly settledTasks: readonly Readonly<{
    readonly kind: SchedulerSettlementKind;
    readonly taskId: string;
  }>[];
  readonly activeScopeIds: readonly string[];
  readonly maxParallel: number;
}

export interface SchedulerCapacity {
  readonly effectiveMaxParallel: number;
  readonly maxParallel: number;
  readonly running: number;
}

export interface SchedulerBlockerSummary {
  readonly dependency: number;
  readonly mutex: number;
  readonly rootCapacity: boolean;
  readonly scopeCapacity: boolean;
}

export interface SchedulerReservationContext {
  readonly taskId: string | null;
}

export interface SchedulerDecisionContext {
  readonly blockers: SchedulerBlockerSummary;
  readonly capacity: SchedulerCapacity;
  readonly reservation: SchedulerReservationContext;
}

export type ReservationUpdate =
  | Readonly<{ readonly kind: "unchanged" }>
  | Readonly<{ readonly kind: "set"; readonly taskId: string }>
  | Readonly<{ readonly kind: "clear" }>;

export type SchedulerAdmissionReason =
  | "reservation"
  | "tightening-scope"
  | "constrained-continuation"
  | "canonical-order"
  | "policy-selection";

export type SchedulerAwaitReason =
  | "cancellation-drain"
  | "dependency-or-mutex"
  | "running-drain"
  | "root-capacity"
  | "active-scope-capacity"
  | "reserved-tightening-scope"
  | "policy-wait";

export type SchedulerDecision = SchedulerDecisionContext &
  (
    | Readonly<{
        readonly admissionPriority: number;
        readonly eligibleCount: number;
        readonly kind: "admit";
        readonly reason: SchedulerAdmissionReason;
        readonly reservationUpdate: ReservationUpdate;
        readonly scopeToActivate: string | null;
        readonly taskId: string;
        readonly trigger: SchedulerTrigger;
      }>
    | Readonly<{
        readonly dependencyIds: readonly string[];
        readonly kind: "settle-blocked";
        readonly taskId: string;
        readonly trigger: SchedulerTrigger;
      }>
    | Readonly<{
        readonly eligibleCount: number;
        readonly kind: "await-running";
        readonly reason: SchedulerAwaitReason;
        readonly reservationUpdate: ReservationUpdate;
        readonly trigger: SchedulerTrigger;
      }>
    | Readonly<{
        readonly kind: "cancel-pending";
        readonly taskIds: readonly string[];
        readonly trigger: SchedulerTrigger;
      }>
    | Readonly<{
        readonly cancelled: boolean;
        readonly kind: "complete";
        readonly trigger: SchedulerTrigger;
      }>
  );

export function reservationUnchanged(): ReservationUpdate {
  return Object.freeze({ kind: "unchanged" });
}

export function reservationSet(taskId: string): ReservationUpdate {
  return Object.freeze({ kind: "set", taskId });
}

export function reservationClear(): ReservationUpdate {
  return Object.freeze({ kind: "clear" });
}

export function freezeDecision(decision: SchedulerDecision): SchedulerDecision {
  const trigger = freezeTrigger(decision.trigger);
  switch (decision.kind) {
    case "admit":
    case "await-running":
      return Object.freeze({ ...decision, trigger });
    case "settle-blocked":
      return Object.freeze({
        ...decision,
        dependencyIds: Object.freeze([...decision.dependencyIds]),
        trigger
      });
    case "cancel-pending":
      return Object.freeze({ ...decision, taskIds: Object.freeze([...decision.taskIds]), trigger });
    case "complete":
      return Object.freeze({ ...decision, trigger });
  }
}

function freezeTrigger(trigger: SchedulerTrigger): SchedulerTrigger {
  switch (trigger.kind) {
    case "execution-started":
    case "admission-continued":
    case "cancellation-observed":
    case "cancellation-applied":
      return Object.freeze({ kind: trigger.kind });
    case "blocked-settled":
      return Object.freeze({ kind: trigger.kind, taskId: trigger.taskId });
    case "task-settled":
      return Object.freeze({
        kind: trigger.kind,
        settlementKind: trigger.settlementKind,
        taskId: trigger.taskId
      });
  }
}

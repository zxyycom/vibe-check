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

/** A collision-free canonical projection of every scheduler-relevant graph field. */
export interface SchedulerGraphIdentity {
  readonly scopes: readonly Readonly<{
    readonly activationTaskIds: readonly string[];
    readonly id: string;
    readonly maxParallel: number;
    readonly terminalTaskId: string;
  }>[];
  readonly tasks: readonly Readonly<{
    readonly admissionPriority: number;
    readonly dependsOn: readonly string[];
    readonly id: string;
    readonly mutex: readonly string[];
    readonly observes: readonly string[];
    readonly scopeId: string | null;
  }>[];
}

export interface SchedulerAdmissionCandidateFact {
  readonly canAdmit: boolean;
  readonly taskId: string;
}

export type SchedulerAdmissionProposal =
  | Readonly<{ readonly kind: "select"; readonly taskId: string }>
  | Readonly<{ readonly kind: "wait" }>;

export type SchedulerAdmissionHardGuard =
  | Readonly<{
      readonly canAdmit: true;
      readonly isCandidate: true;
      readonly kind: "select";
      readonly lifecycleOpen: true;
      readonly taskId: string;
    }>
  | Readonly<{ readonly kind: "wait"; readonly runningCanDrain: true }>;

export interface SchedulerDecisionContext {
  readonly blockers: SchedulerBlockerSummary;
  readonly capacity: SchedulerCapacity;
  readonly graphIdentity: SchedulerGraphIdentity;
}

export type SchedulerDecision = SchedulerDecisionContext &
  (
    | Readonly<{
        readonly admissionPriority: number;
        readonly candidates: readonly SchedulerAdmissionCandidateFact[];
        readonly eligibleCount: number;
        readonly hardGuard: Extract<SchedulerAdmissionHardGuard, { readonly kind: "select" }>;
        readonly kind: "admit";
        readonly proposal: Extract<SchedulerAdmissionProposal, { readonly kind: "select" }>;
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
        readonly candidates: readonly SchedulerAdmissionCandidateFact[];
        readonly eligibleCount: number;
        readonly hardGuard: Extract<SchedulerAdmissionHardGuard, { readonly kind: "wait" }>;
        readonly kind: "await-running";
        readonly proposal: SchedulerAdmissionProposal | null;
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

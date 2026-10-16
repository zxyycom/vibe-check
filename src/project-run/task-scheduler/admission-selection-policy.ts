import { staticAdmissionCandidateForCore } from "./admission-core/static-selection-query.ts";
import type { PlannedTask, PlannedTaskGraph } from "./graph.ts";
import type { AdmissionCoreState } from "./admission-core/core.ts";
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
  readonly measurement?: Readonly<
    Partial<Pick<AdmissionPolicyContext, "cumulative" | "actionHistory">>
  >;
  readonly candidates: readonly AdmissionCandidate[];
  readonly graph: PlannedTaskGraph;
  readonly graphSnapshot: SchedulerGraphSnapshot;
  readonly inspection: SchedulerInspection;
  readonly runtime: Pick<SchedulerInspection, "isAbortRequested" | "isCancelled">;
}

export type AdmissionPolicyDecision =
  | Readonly<{ readonly kind: "select"; readonly taskId: string }>
  | Readonly<{ readonly kind: "wait" }>;

/** A Product-private pure admission policy; it receives no executor or mutable scheduler state. */
export interface AdmissionSelectionPolicy {
  /** Only custom policies require Scheduler sampling before every callback. */
  readonly requiresMeasurement?: true;
  readonly measurementNeeds?: readonly ("cumulative" | "actionHistory")[];
  readonly decide: (input: AdmissionPolicyInput) => AdmissionPolicyDecision;
}

export const staticAdmissionSelectionPolicy: AdmissionSelectionPolicy = Object.freeze({
  decide: decideStaticAdmission
});

function decideStaticAdmission(input: AdmissionPolicyInput): AdmissionPolicyDecision {
  const candidate = staticAdmissionCandidateForCore(input.admissionCore);
  if (candidate === undefined) throw new Error("static scheduler selection requires a candidate");
  return candidate.canAdmit
    ? Object.freeze({ kind: "select", taskId: candidate.task.id })
    : Object.freeze({ kind: "wait" });
}

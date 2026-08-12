import type { FinalCoreSnapshot } from "./model.ts";
import type { DecisionEvidence } from "./policy-model.ts";

export type HumanQualityStatus = "failed" | "passed" | "warning";

export interface HumanStatusProjection {
  readonly normal: HumanQualityStatus;
  readonly selected: HumanQualityStatus;
  readonly verification: HumanQualityStatus;
}

export function projectHumanStatus(input: Readonly<{
  decision: DecisionEvidence;
  snapshot: FinalCoreSnapshot;
  verificationOutput: boolean;
}>): HumanStatusProjection {
  const normal = normalStatus(input.snapshot);
  const verification = verificationStatus(input.snapshot, input.decision, normal);
  return Object.freeze({
    normal,
    verification,
    selected: input.verificationOutput ? verification : normal
  });
}

function normalStatus(snapshot: FinalCoreSnapshot): HumanQualityStatus {
  if (snapshot.completeness.status === "incomplete") return "failed";
  const selectedRuns = snapshot.runs.filter((run) => run.selection === "selected");
  if (!selectedRuns.some((run) => run.applicability === "applicable")) return "warning";
  return selectedRuns.some((run) => run.status === "completed" && run.result?.verdict === "failed")
    ? "warning"
    : "passed";
}

function verificationStatus(
  snapshot: FinalCoreSnapshot,
  decision: DecisionEvidence,
  normal: HumanQualityStatus
): HumanQualityStatus {
  if (normal === "failed") return "failed";
  if (normal === "warning" && !snapshot.runs.some((run) => run.applicability === "applicable")) {
    return "warning";
  }
  const allCurrent = decision.views.find((view) => view.viewId === "all-current");
  if (allCurrent === undefined) return normal;
  const acceptedRecordIds = new Set(decision.acceptance.map((evidence) => evidence.recordId));
  return allCurrent.recordRefs.every((reference) => acceptedRecordIds.has(reference.recordId))
    ? "passed"
    : normal;
}

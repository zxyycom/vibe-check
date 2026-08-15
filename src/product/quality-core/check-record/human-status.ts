import type { CoreSnapshot } from "./model.ts";
import type { DecisionEvidence } from "./policy-model.ts";

export type HumanQualityStatus = "failed" | "passed" | "warning";

export interface HumanStatusProjection {
  readonly normal: HumanQualityStatus;
  readonly selected: HumanQualityStatus;
  readonly verification: HumanQualityStatus;
}

export function projectHumanStatus(input: Readonly<{
  decision: DecisionEvidence;
  snapshot: CoreSnapshot;
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

function normalStatus(snapshot: CoreSnapshot): HumanQualityStatus {
  if (snapshot.checks.some((check) => check.outcome.kind === "unavailable")) return "failed";
  const completedChecks = snapshot.checks.filter((check): check is typeof check & {
    readonly outcome: Extract<typeof check.outcome, { readonly kind: "completed" }>;
  } => check.outcome.kind === "completed");
  if (completedChecks.length === 0) return "warning";
  return completedChecks.some((check) => check.outcome.verdict === "failed")
    ? "warning"
    : "passed";
}

function verificationStatus(
  snapshot: CoreSnapshot,
  decision: DecisionEvidence,
  normal: HumanQualityStatus
): HumanQualityStatus {
  if (normal === "failed") return "failed";
  if (normal === "warning" && !snapshot.checks.some((check) => check.outcome.kind === "completed")) {
    return "warning";
  }
  const allCurrent = decision.views.find((view) => view.viewId === "all-current");
  if (allCurrent === undefined) return normal;
  const acceptedRecordIds = new Set(decision.acceptance.map((evidence) => evidence.recordId));
  return allCurrent.recordRefs.every((reference) => acceptedRecordIds.has(reference.recordId))
    ? "passed"
    : normal;
}

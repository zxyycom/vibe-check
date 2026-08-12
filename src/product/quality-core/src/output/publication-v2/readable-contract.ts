import type { HumanQualityStatus } from "../../check-record/human-status.ts";
import type { AcceptanceEvidence } from "../../check-record/policy-model.ts";
import type { ResolvedQualityConfig } from "../../model/schema.ts";
import type { ValidatedPublicationModelV2 } from "./model.ts";
export { projectReadablePublicationV2 } from "./readable-projection.ts";

const TRUSTED_ARTIFACT_NAMES = ["records.ndjson", "report.md", "run.json"] as const;

export const PUBLICATION_ANNOTATION_INPUT_V2 = Object.freeze({
  argument: "artifact-directory" as const,
  kind: "validated-machine-set" as const,
  requiredFileNames: Object.freeze(["run.json", "records.ndjson"] as const)
});

export const PUBLICATION_V2_LIFECYCLE = Object.freeze({
  candidateStages: Object.freeze([
    "validate-publication-model",
    "serialize-machine-candidates",
    "render-report-candidate",
    "validate-machine-set"
  ] as const),
  artifactStages: Object.freeze([
    "cleanup-prior-owned-artifacts",
    "write-same-directory-owned-temps",
    "rename-machine-files",
    "rename-report",
    "publish-trusted-paths"
  ] as const)
});

export const PUBLICATION_V2_FAILURE_STAGES = Object.freeze([
  ...PUBLICATION_V2_LIFECYCLE.candidateStages,
  ...PUBLICATION_V2_LIFECYCLE.artifactStages.slice(0, -1)
] as const);

export type PublicationFailureStageV2 = typeof PUBLICATION_V2_FAILURE_STAGES[number];

export interface ReadableRecordPreviewV2 {
  readonly acceptance: readonly Pick<AcceptanceEvidence, "acceptanceId" | "reason">[];
  readonly level: "info" | "warning" | "error";
  readonly location: Readonly<{ path: string; line: number; column: number }> | null;
  readonly message: string;
  readonly recordId: string;
}

export interface ReadablePublicationContractV2 {
  readonly statuses: Readonly<{
    quality: Readonly<{ label: "Quality check status"; status: HumanQualityStatus }>;
    verification: Readonly<{
      label: "Quality verification status";
      status: HumanQualityStatus;
    }>;
  }>;
  readonly warningRecords: readonly ReadableRecordPreviewV2[];
  readonly acceptedRecords: readonly ReadableRecordPreviewV2[];
}

export interface ReadableReportContractV2 extends ReadablePublicationContractV2 {
  readonly presentation: ResolvedQualityConfig["report"];
  readonly watchlistRecords: readonly ReadableRecordPreviewV2[];
}

export function mapPublicationFailureV2(stage: PublicationFailureStageV2) {
  return Object.freeze({
    exitCode: 2 as const,
    outcome: "failed" as const,
    stage,
    trustedArtifactNames: Object.freeze([] as string[])
  });
}

export function mapPublicationOutcomeV2(input: Readonly<{
  model: ValidatedPublicationModelV2;
  publicationStatus: "failed" | "succeeded";
}>) {
  if (input.publicationStatus === "failed") {
    return Object.freeze({
      exitCode: 2 as const,
      outcome: "failed" as const,
      trustedArtifactNames: Object.freeze([] as string[])
    });
  }
  const outcome = completedPublicationOutcome(input.model);
  return Object.freeze({
    exitCode: publicationExitCode(outcome),
    outcome,
    trustedArtifactNames: TRUSTED_ARTIFACT_NAMES
  });
}

function completedPublicationOutcome(
  model: ValidatedPublicationModelV2
): "failed" | "gate-failed" | "success" {
  if (model.humanStatus.normal === "failed") return "failed";
  if (model.decision.gate.status === "failed") return "gate-failed";
  if (model.decision.gate.status === "not-evaluated") return "failed";
  return "success";
}

function publicationExitCode(outcome: "failed" | "gate-failed" | "success"): 0 | 1 | 2 {
  if (outcome === "gate-failed") return 1;
  if (outcome === "failed") return 2;
  return 0;
}

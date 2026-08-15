import type { HumanQualityStatus } from "../../check-record/human-status.ts";
import type { AcceptanceEvidence } from "../../check-record/policy-model.ts";
import type { ResolvedQualityConfig } from "../../model/schema.ts";
export { projectReadablePublicationV3 } from "./readable-projection.ts";

export const PUBLICATION_ANNOTATION_INPUT_V3 = Object.freeze({
  argument: "artifact-directory" as const,
  kind: "validated-machine-set" as const,
  requiredFileNames: Object.freeze(["run.json", "records.ndjson"] as const)
});

export const PUBLICATION_V3_LIFECYCLE = Object.freeze({
  candidateStages: Object.freeze([
    "validate-publication-model",
    "serialize-machine-candidates",
    "render-report-candidate",
    "validate-machine-set"
  ] as const),
  artifactStages: Object.freeze([
    "cleanup-stale-owned-temps",
    "write-same-directory-owned-temps",
    "rename-machine-files",
    "rename-report",
    "cleanup-retired-artifacts",
    "publish-trusted-paths"
  ] as const)
});

export const PUBLICATION_V3_FAILURE_STAGES = Object.freeze([
  ...PUBLICATION_V3_LIFECYCLE.candidateStages,
  ...PUBLICATION_V3_LIFECYCLE.artifactStages.slice(0, -1)
] as const);

export type PublicationFailureStageV3 = typeof PUBLICATION_V3_FAILURE_STAGES[number];

export interface ReadableRecordPreviewV3 {
  readonly acceptance: readonly Pick<AcceptanceEvidence, "acceptanceId" | "reason">[];
  readonly level: "info" | "warning" | "error";
  readonly location: Readonly<{ path: string; line: number; column: number }> | null;
  readonly message: string;
  readonly recordId: string;
}

export interface ReadablePublicationContractV3 {
  readonly statuses: Readonly<{
    quality: Readonly<{ label: "Quality check status"; status: HumanQualityStatus }>;
    verification: Readonly<{
      label: "Quality verification status";
      status: HumanQualityStatus;
    }>;
  }>;
  readonly warningRecords: readonly ReadableRecordPreviewV3[];
  readonly acceptedRecords: readonly ReadableRecordPreviewV3[];
}

export interface ReadableReportContractV3 extends ReadablePublicationContractV3 {
  readonly presentation: ResolvedQualityConfig["report"];
  readonly watchlistRecords: readonly ReadableRecordPreviewV3[];
}

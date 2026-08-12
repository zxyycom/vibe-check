import type { HumanQualityStatus } from "../../check-record/human-status.ts";
import type { AcceptanceEvidence } from "../../check-record/policy-model.ts";
import type { ResolvedQualityConfig } from "../../model/schema.ts";
import type { ValidatedPublicationModelV2 } from "./model.ts";

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

export function projectReadablePublicationV2(input: Readonly<{
  model: ValidatedPublicationModelV2;
  report: Readonly<{
    changedFiles: readonly string[];
    presentation: ResolvedQualityConfig["report"];
  }>;
}>): Readonly<{
  console: ReadablePublicationContractV2;
  report: ReadableReportContractV2;
}> {
  const acceptanceByRecord = new Map<string, AcceptanceEvidence[]>();
  for (const evidence of input.model.decision.acceptance) {
    const current = acceptanceByRecord.get(evidence.recordId) ?? [];
    current.push(evidence);
    acceptanceByRecord.set(evidence.recordId, current);
  }
  const allCurrent = input.model.decision.views.find((view) => view.viewId === "all-current");
  const visibleIds = new Set(allCurrent?.recordRefs.map((reference) => reference.recordId)
    ?? input.model.records.map((record) => record.recordId));
  const warningRecords: ReadableRecordPreviewV2[] = [];
  const acceptedRecords: ReadableRecordPreviewV2[] = [];
  for (const record of input.model.records) {
    if (!visibleIds.has(record.recordId)) continue;
    const acceptance = acceptanceByRecord.get(record.recordId) ?? [];
    const preview = {
      acceptance: acceptance.map(({ acceptanceId, reason }) => ({ acceptanceId, reason })),
      level: record.level,
      location: record.location === null ? null : { ...record.location },
      message: record.message,
      recordId: record.recordId
    } satisfies ReadableRecordPreviewV2;
    (acceptance.length === 0 ? warningRecords : acceptedRecords).push(preview);
  }
  const statuses = deepFreeze({
    quality: { label: "Quality check status" as const, status: input.model.humanStatus.normal },
    verification: {
      label: "Quality verification status" as const,
      status: input.model.humanStatus.verification
    }
  });
  const console = deepFreeze({
    statuses,
    warningRecords,
    acceptedRecords
  });
  const presentation = deepFreeze({ ...input.report.presentation });
  const reportRecords = [...warningRecords, ...acceptedRecords];
  const report = deepFreeze({
    statuses,
    warningRecords: warningRecords.slice(0, presentation.topN),
    acceptedRecords: acceptedRecords.slice(0, presentation.topN),
    presentation,
    watchlistRecords: presentation.showWatchlist
      ? reportRecords
        .filter((record) => isChangedRecord(record, input.report.changedFiles))
        .slice(0, presentation.watchlistMax)
      : []
  });
  return Object.freeze({ console, report });
}

function isChangedRecord(
  record: ReadableRecordPreviewV2,
  changedFiles: readonly string[]
): boolean {
  if (record.location === null) return false;
  return changedFiles.includes(record.location.path);
}

function deepFreeze<T>(value: T): T {
  if (value !== null && typeof value === "object" && !Object.isFrozen(value)) {
    Object.freeze(value);
    for (const child of Object.values(value)) deepFreeze(child);
  }
  return value;
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
  const outcome = input.model.humanStatus.normal === "failed"
    ? "failed" as const
    : input.model.decision.gate.status === "failed"
      ? "gate-failed" as const
      : input.model.decision.gate.status === "not-evaluated"
        ? "failed" as const
        : "success" as const;
  return Object.freeze({
    exitCode: outcome === "gate-failed" ? 1 as const : outcome === "failed" ? 2 as const : 0 as const,
    outcome,
    trustedArtifactNames: TRUSTED_ARTIFACT_NAMES
  });
}

import type { AcceptanceEvidence } from "../../check-record/policy-model.ts";
import type { ResolvedQualityConfig } from "../../model/schema.ts";
import type {
  ReadablePublicationContractV2,
  ReadableRecordPreviewV2,
  ReadableReportContractV2
} from "./readable-contract.ts";
import type { ValidatedPublicationModelV2 } from "./model.ts";

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
  const recordPreviews = projectRecordPreviews(input.model);
  const statuses = projectStatuses(input.model);
  const console = deepFreeze({ statuses, ...recordPreviews });
  const report = projectReport(recordPreviews, statuses, input.report);
  return Object.freeze({ console, report });
}

function projectRecordPreviews(model: ValidatedPublicationModelV2): Pick<
  ReadablePublicationContractV2,
  "acceptedRecords" | "warningRecords"
> {
  const acceptanceByRecord = acceptanceEvidenceByRecord(model.decision.acceptance);
  const visibleIds = visibleRecordIds(model);
  const warningRecords: ReadableRecordPreviewV2[] = [];
  const acceptedRecords: ReadableRecordPreviewV2[] = [];
  for (const record of model.records) {
    if (!visibleIds.has(record.recordId)) continue;
    const preview = recordPreview(record, acceptanceByRecord.get(record.recordId) ?? []);
    (preview.acceptance.length === 0 ? warningRecords : acceptedRecords).push(preview);
  }
  return { warningRecords, acceptedRecords };
}

function acceptanceEvidenceByRecord(evidence: readonly AcceptanceEvidence[]) {
  const acceptanceByRecord = new Map<string, AcceptanceEvidence[]>();
  for (const item of evidence) {
    const current = acceptanceByRecord.get(item.recordId) ?? [];
    current.push(item);
    acceptanceByRecord.set(item.recordId, current);
  }
  return acceptanceByRecord;
}

function visibleRecordIds(model: ValidatedPublicationModelV2): ReadonlySet<string> {
  const allCurrent = model.decision.views.find((view) => view.viewId === "all-current");
  return new Set(allCurrent?.recordRefs.map((reference) => reference.recordId)
    ?? model.records.map((record) => record.recordId));
}

function recordPreview(
  record: ValidatedPublicationModelV2["records"][number],
  acceptance: readonly AcceptanceEvidence[]
): ReadableRecordPreviewV2 {
  return {
    acceptance: acceptance.map(({ acceptanceId, reason }) => ({ acceptanceId, reason })),
    level: record.level,
    location: record.location === null ? null : { ...record.location },
    message: record.message,
    recordId: record.recordId
  };
}

function projectStatuses(model: ValidatedPublicationModelV2): ReadablePublicationContractV2["statuses"] {
  return deepFreeze({
    quality: { label: "Quality check status", status: model.humanStatus.normal },
    verification: {
      label: "Quality verification status",
      status: model.humanStatus.verification
    }
  });
}

function projectReport(
  records: Pick<ReadablePublicationContractV2, "acceptedRecords" | "warningRecords">,
  statuses: ReadablePublicationContractV2["statuses"],
  report: Readonly<{
    changedFiles: readonly string[];
    presentation: ResolvedQualityConfig["report"];
  }>
): ReadableReportContractV2 {
  const presentation = deepFreeze({ ...report.presentation });
  return deepFreeze({
    statuses,
    warningRecords: records.warningRecords.slice(0, presentation.topN),
    acceptedRecords: records.acceptedRecords.slice(0, presentation.topN),
    presentation,
    watchlistRecords: projectWatchlist(records, report.changedFiles, presentation)
  });
}

function projectWatchlist(
  records: Pick<ReadablePublicationContractV2, "acceptedRecords" | "warningRecords">,
  changedFiles: readonly string[],
  presentation: ResolvedQualityConfig["report"]
): readonly ReadableRecordPreviewV2[] {
  if (!presentation.showWatchlist) return [];
  return [...records.warningRecords, ...records.acceptedRecords]
    .filter((record) => isChangedRecord(record, changedFiles))
    .slice(0, presentation.watchlistMax);
}

function isChangedRecord(record: ReadableRecordPreviewV2, changedFiles: readonly string[]): boolean {
  return record.location !== null && changedFiles.includes(record.location.path);
}

function deepFreeze<T>(value: T): T {
  if (value !== null && typeof value === "object" && !Object.isFrozen(value)) {
    Object.freeze(value);
    for (const child of Object.values(value)) deepFreeze(child);
  }
  return value;
}

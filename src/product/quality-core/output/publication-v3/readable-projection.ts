import type { AcceptanceEvidence } from "../../check-record/policy-model.ts";
import type { ResolvedQualityConfig } from "../../model/schema.ts";
import type {
  ReadablePublicationContractV3,
  ReadableRecordPreviewV3,
  ReadableReportContractV3
} from "./readable-contract.ts";
import type { ValidatedPublicationModelV3 } from "./model.ts";
import { freezePublicationValue } from "./freeze-publication-value.ts";

export function projectReadablePublicationV3(
  input: Readonly<{
    model: ValidatedPublicationModelV3;
    report: Readonly<{
      changedFiles: readonly string[];
      presentation: ResolvedQualityConfig["report"];
    }>;
  }>
): Readonly<{
  console: ReadablePublicationContractV3;
  report: ReadableReportContractV3;
}> {
  const recordPreviews = projectRecordPreviews(input.model);
  const statuses = projectStatuses(input.model);
  const console = freezePublicationValue({ statuses, ...recordPreviews });
  const report = projectReport(recordPreviews, statuses, input.report);
  return Object.freeze({ console, report });
}

function projectRecordPreviews(
  model: ValidatedPublicationModelV3
): Pick<ReadablePublicationContractV3, "acceptedRecords" | "warningRecords"> {
  const acceptanceByRecord = acceptanceEvidenceByRecord(model.decision.acceptance);
  const visibleIds = visibleRecordIds(model);
  const warningRecords: ReadableRecordPreviewV3[] = [];
  const acceptedRecords: ReadableRecordPreviewV3[] = [];
  for (const record of model.records) {
    if (!visibleIds.has(record.recordId)) continue;
    const preview = recordPreview(record, acceptanceByRecord.get(record.recordId) ?? []);
    if (preview.acceptance.length === 0) {
      warningRecords.push(preview);
    } else {
      acceptedRecords.push(preview);
    }
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

function visibleRecordIds(model: ValidatedPublicationModelV3): ReadonlySet<string> {
  const allCurrent = model.decision.views.find((view) => view.viewId === "all-current");
  return new Set(
    allCurrent?.recordRefs.map((reference) => reference.recordId) ??
      model.records.map((record) => record.recordId)
  );
}

function recordPreview(
  record: ValidatedPublicationModelV3["records"][number],
  acceptance: readonly AcceptanceEvidence[]
): ReadableRecordPreviewV3 {
  return {
    acceptance: acceptance.map(({ acceptanceId, reason }) => ({ acceptanceId, reason })),
    level: record.level,
    location: record.location === null ? null : { ...record.location },
    message: record.message,
    recordId: record.recordId
  };
}

function projectStatuses(
  model: ValidatedPublicationModelV3
): ReadablePublicationContractV3["statuses"] {
  return freezePublicationValue({
    quality: { label: "Quality check status", status: model.humanStatus.normal },
    verification: {
      label: "Quality verification status",
      status: model.humanStatus.verification
    }
  });
}

function projectReport(
  records: Pick<ReadablePublicationContractV3, "acceptedRecords" | "warningRecords">,
  statuses: ReadablePublicationContractV3["statuses"],
  report: Readonly<{
    changedFiles: readonly string[];
    presentation: ResolvedQualityConfig["report"];
  }>
): ReadableReportContractV3 {
  const presentation = freezePublicationValue({ ...report.presentation });
  return freezePublicationValue({
    statuses,
    warningRecords: records.warningRecords.slice(0, presentation.topN),
    acceptedRecords: records.acceptedRecords.slice(0, presentation.topN),
    presentation,
    watchlistRecords: projectWatchlist(records, report.changedFiles, presentation)
  });
}

function projectWatchlist(
  records: Pick<ReadablePublicationContractV3, "acceptedRecords" | "warningRecords">,
  changedFiles: readonly string[],
  presentation: ResolvedQualityConfig["report"]
): readonly ReadableRecordPreviewV3[] {
  if (!presentation.showWatchlist) return [];
  return [...records.warningRecords, ...records.acceptedRecords]
    .filter((record) => isChangedRecord(record, changedFiles))
    .slice(0, presentation.watchlistMax);
}

function isChangedRecord(
  record: ReadableRecordPreviewV3,
  changedFiles: readonly string[]
): boolean {
  return record.location !== null && changedFiles.includes(record.location.path);
}

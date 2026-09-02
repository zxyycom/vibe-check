import type { CheckExecutionContext } from "../../check/check.ts";
import type {
  FindingWaiverAudit,
  FindingWaiverReconciliation
} from "../../finding-waivers/reconciliation.ts";

interface CodeQualityFindingCandidate {
  readonly data: Readonly<{ readonly blocking: boolean }>;
  readonly id: string;
}

type FindingRecordContext = Pick<CheckExecutionContext<object>, "records">;

export type FindingWaiverRecordAudit = Readonly<
  Omit<FindingWaiverAudit, "status"> & {
    readonly status: "overmatched" | "unused";
  }
>;

/** Publishes every reconciled metric Finding while preserving applied waiver evidence. */
export function reportReconciledCodeQualityFindingRecords<
  Finding extends CodeQualityFindingCandidate
>(context: FindingRecordContext, reconciliation: FindingWaiverReconciliation<Finding>): void {
  for (const finding of reconciliation.findings) {
    const data =
      finding.disposition === "waived"
        ? Object.freeze({
            ...finding.finding.data,
            blocking: false,
            waiver: Object.freeze({ reason: finding.waiver.reason })
          })
        : finding.finding.data;
    context.records.report({ id: finding.finding.id }, data);
  }
}

/** Publishes only unused/overmatched audit rows built by the identity-owning Check. */
export function reportFindingWaiverAudits<Finding, AuditData extends object>(
  context: FindingRecordContext,
  reconciliation: FindingWaiverReconciliation<Finding>,
  buildRecord: (
    audit: FindingWaiverRecordAudit
  ) => Readonly<{ readonly data: AuditData; readonly id: string }>
): void {
  for (const audit of reconciliation.waiverAudits) {
    if (audit.status === "applied") continue;
    const record = buildRecord(
      Object.freeze({
        matchCount: audit.matchCount,
        status: audit.status,
        waiver: audit.waiver
      })
    );
    context.records.report({ id: record.id }, record.data);
  }
}

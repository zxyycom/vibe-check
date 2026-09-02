import { createHash } from "node:crypto";

import type { CheckExecutionContext } from "../../check/check.ts";
import { canonicalJsonBytes } from "../../data-boundary/canonical-data.ts";
import type {
  FindingWaiverAudit,
  FindingWaiverReconciliation
} from "../../finding-waivers/reconciliation.ts";

interface CodeQualityFindingCandidate {
  readonly data: Readonly<{ readonly blocking: boolean }>;
  readonly id: string;
}

type FindingRecordContext = Pick<CheckExecutionContext<object>, "records">;

const FINDING_WAIVER_AUDIT_RECORD_ID_PREFIX = "/finding-waiver-audit/";

export type FindingWaiverRecordAudit = Readonly<
  Omit<FindingWaiverAudit, "status"> & {
    readonly status: "overmatched" | "unused";
  }
>;

export type FindingWaiverAuditRecordData<Identity> = Readonly<{
  readonly identity: Identity;
  readonly kind: "finding-waiver-audit";
  readonly matchCount: number;
  readonly reason: string;
  readonly status: "overmatched" | "unused";
}>;

/** Builds the common immutable data shared by Check-owned waiver audit Records. */
export function buildFindingWaiverAuditRecordData<Identity>(
  identity: Identity,
  audit: FindingWaiverRecordAudit
): FindingWaiverAuditRecordData<Identity> {
  return Object.freeze({
    identity,
    kind: "finding-waiver-audit",
    matchCount: audit.matchCount,
    reason: audit.waiver.reason,
    status: audit.status
  });
}

/** Builds the shared hash-addressed audit Record used by structured identities. */
export function buildHashedFindingWaiverAuditRecord<Identity>(
  identity: Identity,
  audit: FindingWaiverRecordAudit
): Readonly<{ readonly data: FindingWaiverAuditRecordData<Identity>; readonly id: string }> {
  const digest = createHash("sha256").update(canonicalJsonBytes(identity)).digest("hex");
  return Object.freeze({
    data: buildFindingWaiverAuditRecordData(identity, audit),
    id: `${FINDING_WAIVER_AUDIT_RECORD_ID_PREFIX}sha256:${digest}`
  });
}

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

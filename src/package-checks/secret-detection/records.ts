import type { MaterializedFindingWaiver } from "../../finding-waivers/reconciliation.ts";
import type {
  FindingWaiverRecordAudit,
  FindingWaiverAuditRecordData
} from "../code-quality-findings/finding-waiver-evidence.ts";
import { buildFindingWaiverAuditRecordData } from "../code-quality-findings/finding-waiver-evidence.ts";
import type { SecretDetectionCoverageGapReason } from "./classification.ts";
import type { SecretDetectionIssue } from "./secretlint/adapter.ts";
import type { SecretDetectionFindingIdentity } from "./options.ts";
import { resolveSecretDetectionFindingIdentity } from "./finding-waiver-identity.ts";

/** An actionable or waived high-confidence secret finding. No detector value or message is retained. */
export interface SecretDetectionFindingRecordData {
  readonly blocking: boolean;
  readonly kind: "secret-finding";
  readonly location: SecretDetectionIssue["location"];
  readonly ordinal: number;
  readonly path: string;
  readonly ruleId: "@secretlint/secretlint-rule-privatekey";
  readonly structuralClass: "text-document";
  readonly waiver?: Readonly<{ readonly reason: string }>;
}

/** A deterministic exact-input coverage gap. It is never reconciled through finding waiver policy. */
export interface SecretDetectionCoverageGapRecordData {
  readonly blocking: true;
  readonly kind: "coverage-gap";
  readonly path: string;
  readonly reason: SecretDetectionCoverageGapReason;
}

/** Unused or overmatched safe secret finding waiver evidence. */
export type SecretDetectionFindingWaiverAuditRecordData =
  FindingWaiverAuditRecordData<SecretDetectionFindingIdentity>;

/** `secretDetection` 发布的全部补充 Record data。 */
export type SecretDetectionRecordData =
  | SecretDetectionCoverageGapRecordData
  | SecretDetectionFindingRecordData
  | SecretDetectionFindingWaiverAuditRecordData;

export function secretFindingIdentity(issue: SecretDetectionIssue): SecretDetectionFindingIdentity {
  return Object.freeze({
    ordinal: issue.ordinal,
    path: issue.path,
    ruleId: issue.ruleId,
    structuralClass: issue.structuralClass
  });
}

export function secretFindingRecordId(identity: SecretDetectionFindingIdentity): string {
  return `/secret-finding/${identity.path}/${identity.ordinal}`;
}

export function secretCoverageGapRecordId(path: string): string {
  return `/coverage-gap/${path}`;
}

export function secretDetectionWaiverAuditRecord(
  audit: FindingWaiverRecordAudit
): Readonly<{ readonly data: SecretDetectionFindingWaiverAuditRecordData; readonly id: string }> {
  const identity = secretDetectionWaiverIdentity(audit.waiver);
  return Object.freeze({
    data: buildFindingWaiverAuditRecordData(identity, audit),
    id: `/finding-waiver-audit/${identity.path}/${identity.ordinal}`
  });
}

function secretDetectionWaiverIdentity(
  waiver: MaterializedFindingWaiver
): SecretDetectionFindingIdentity {
  const identity = resolveSecretDetectionFindingIdentity(waiver.identity);
  if (identity === undefined) {
    throw new TypeError("secretDetection waiver identity must be a safe finding identity");
  }
  return identity;
}

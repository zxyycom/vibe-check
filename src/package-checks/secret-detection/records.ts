import type { MaterializedFindingWaiver } from "../../package-tools/finding-waivers/reconciliation.ts";
import type {
  FindingWaiverRecordAudit,
  FindingWaiverAuditRecordData
} from "../code-quality-findings/finding-waiver-evidence.ts";
import { buildFindingWaiverAuditRecordData } from "../code-quality-findings/finding-waiver-evidence.ts";
import type { SecretDetectionCoverageGapReason } from "./classification.ts";
import type { SecretDetectionIssue } from "./secretlint/adapter.ts";
import type { SecretDetectionFindingIdentity } from "./options.ts";
import { resolveSecretDetectionFindingIdentity } from "./finding-waiver-identity.ts";

/** 待处理或已豁免的高置信 secret finding；不保留检测到的值或 detector message。 */
export interface SecretDetectionFindingRecordData {
  readonly blocking: boolean;
  readonly kind: "secret-finding";
  /** 相对解码后文本的一基行列范围；列按 UTF-16 code unit 计数，end 不包含，起始 UTF-8 BOM 不计入。 */
  readonly location: SecretDetectionIssue["location"];
  /** 当前文件内按 detector 返回顺序分配的一基序号；不是跨文件或跨版本的稳定位置。 */
  readonly ordinal: number;
  readonly path: string;
  readonly ruleId: "@secretlint/secretlint-rule-privatekey";
  readonly structuralClass: "text-document";
  readonly waiver?: Readonly<{ readonly reason: string }>;
}

/** 明确所选输入中未取得检测覆盖的缺口；不参与 finding waiver 对账，始终阻断。 */
export interface SecretDetectionCoverageGapRecordData {
  readonly blocking: true;
  readonly kind: "coverage-gap";
  readonly path: string;
  readonly reason: SecretDetectionCoverageGapReason;
}

/** 未使用或匹配过宽的 secret finding waiver 审计证据，不含检测到的 secret 值。 */
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

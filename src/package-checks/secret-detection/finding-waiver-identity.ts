import { snapshotExactClosedRecord } from "../../data-boundary/closed-values.ts";
import { isPositiveSafeInteger } from "../../data-boundary/value-shapes.ts";
import { isNormalizedProjectRelativePath } from "../host-environment/path.ts";
import type { SecretDetectionFindingIdentity } from "./options.ts";

const PRIVATE_KEY_RULE_ID = "@secretlint/secretlint-rule-privatekey" as const;
const TEXT_DOCUMENT_STRUCTURAL_CLASS = "text-document" as const;

/** 解析只含安全路径、规则、结构标记和 occurrence ordinal 的 waiver identity。 */
export function resolveSecretDetectionFindingIdentity(
  value: unknown
): SecretDetectionFindingIdentity | undefined {
  const identity = snapshotExactClosedRecord(value, [
    "ordinal",
    "path",
    "ruleId",
    "structuralClass"
  ]);
  if (
    identity === undefined ||
    !isPositiveSafeInteger(identity.ordinal) ||
    !isNormalizedProjectRelativePath(identity.path) ||
    identity.ruleId !== PRIVATE_KEY_RULE_ID ||
    identity.structuralClass !== TEXT_DOCUMENT_STRUCTURAL_CLASS
  ) {
    return undefined;
  }
  return Object.freeze({
    ordinal: identity.ordinal,
    path: identity.path,
    ruleId: PRIVATE_KEY_RULE_ID,
    structuralClass: TEXT_DOCUMENT_STRUCTURAL_CLASS
  });
}

export const secretDetectionPrivateKeyRuleId = PRIVATE_KEY_RULE_ID;
export const secretDetectionTextDocumentStructuralClass = TEXT_DOCUMENT_STRUCTURAL_CLASS;

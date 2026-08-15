import type { CheckDefinition } from "../model.ts";
import type {
  BlockWhen,
  CheckReferenceEvidence,
  ReadinessPredicate
} from "../policy-model.ts";
import type { ValidationResult } from "../validation.ts";
import {
  accepted,
  checkReferenceKey,
  closed,
  isRecord,
  isReferenceEvidenceStatus,
  isStableId,
  issue
} from "./validation-helpers.ts";

export interface ReadinessContext {
  readonly definitions: readonly CheckDefinition[];
  readonly viewIds: ReadonlySet<string>;
  readonly requiredPairs: ReadonlySet<string>;
}

function validateCheckIdentity(
  checkId: unknown,
  path: string,
  definitions: readonly CheckDefinition[]
): ValidationResult<string> {
  if (!isStableId(checkId) || !definitions.some((definition) => definition.checkId === checkId)) {
    return issue(path, "identity-mismatch", "Unknown Check operand");
  }
  return accepted(checkId);
}

function validateReferenceStatusPredicate(
  value: Record<string, unknown>,
  path: string,
  requiredPairs: ReadonlySet<string>
): ValidationResult<Readonly<{
  kind: "reference-status";
  checkId: string;
  referenceName: string;
  status: CheckReferenceEvidence["status"];
}>> {
  if (!isStableId(value.checkId) || !isStableId(value.referenceName)
    || !requiredPairs.has(checkReferenceKey(value.checkId, value.referenceName))) {
    return issue(`${path}.referenceName`, "identity-mismatch", "Unknown required Check/reference operand");
  }
  if (!isReferenceEvidenceStatus(value.status)) {
    return issue(`${path}.status`, "invalid-value", "Unknown reference evidence status");
  }
  return accepted({
    kind: "reference-status",
    checkId: value.checkId,
    referenceName: value.referenceName,
    status: value.status
  });
}

function validateCheckOutcome(
  value: Record<string, unknown>,
  path: string,
  definitions: readonly CheckDefinition[]
): ValidationResult<Extract<ReadinessPredicate, { kind: "check-outcome" }>> {
  const shape = closed(value, path, ["kind", "checkId", "outcome"]);
  if (!shape.ok) return shape;
  const checkId = validateCheckIdentity(shape.value.checkId, `${path}.checkId`, definitions);
  if (!checkId.ok) return checkId;
  const outcome = shape.value.outcome;
  if (outcome !== "not-applicable" && outcome !== "completed" && outcome !== "unavailable") {
    return issue(`${path}.outcome`, "invalid-value", "Unknown Core Check outcome");
  }
  return accepted({ kind: "check-outcome", checkId: checkId.value, outcome });
}

function validateCheckVerdict(
  value: Record<string, unknown>,
  path: string,
  definitions: readonly CheckDefinition[]
): ValidationResult<Extract<ReadinessPredicate, { kind: "check-verdict" }>> {
  const shape = closed(value, path, ["kind", "checkId", "verdict"]);
  if (!shape.ok) return shape;
  const checkId = validateCheckIdentity(shape.value.checkId, `${path}.checkId`, definitions);
  if (!checkId.ok) return checkId;
  const verdict = shape.value.verdict;
  if (verdict !== "passed" && verdict !== "failed") {
    return issue(`${path}.verdict`, "invalid-value", "Completed Check verdict must be passed or failed");
  }
  return accepted({ kind: "check-verdict", checkId: checkId.value, verdict });
}

function validateReadinessReferenceStatus(
  value: Record<string, unknown>,
  path: string,
  requiredPairs: ReadonlySet<string>
): ValidationResult<ReadinessPredicate> {
  const shape = closed(value, path, ["kind", "checkId", "referenceName", "status"]);
  return shape.ok ? validateReferenceStatusPredicate(shape.value, path, requiredPairs) : shape;
}

function validateViewEmpty(
  value: Record<string, unknown>,
  path: string,
  viewIds: ReadonlySet<string>
): ValidationResult<Extract<ReadinessPredicate, { kind: "view-empty" }>> {
  const shape = closed(value, path, ["kind", "viewId"]);
  if (!shape.ok) return shape;
  if (!isStableId(shape.value.viewId) || !viewIds.has(shape.value.viewId)) {
    return issue(`${path}.viewId`, "identity-mismatch", "Unknown view operand");
  }
  return accepted({ kind: "view-empty", viewId: shape.value.viewId });
}

function validateKnownReadinessPredicate(
  value: Record<string, unknown> & { kind: string },
  path: string,
  context: ReadinessContext
): ValidationResult<ReadinessPredicate> {
  switch (value.kind) {
    case "check-outcome":
      return validateCheckOutcome(value, path, context.definitions);
    case "check-verdict":
      return validateCheckVerdict(value, path, context.definitions);
    case "reference-status":
      return validateReadinessReferenceStatus(value, path, context.requiredPairs);
    case "view-empty":
      return validateViewEmpty(value, path, context.viewIds);
    default:
      return issue(`${path}.kind`, "invalid-value", "Unknown readiness predicate");
  }
}

export function validateReadinessPredicate(
  value: unknown,
  path: string,
  context: ReadinessContext
): ValidationResult<ReadinessPredicate> {
  if (!isRecord(value) || typeof value.kind !== "string") {
    return issue(path, "invalid-value", "Invalid readiness predicate");
  }
  return validateKnownReadinessPredicate(
    value as Record<string, unknown> & { kind: string },
    path,
    context
  );
}

function validateViewNotEmpty(
  value: Record<string, unknown>,
  path: string,
  viewIds: ReadonlySet<string>
): ValidationResult<Extract<BlockWhen, { kind: "view-not-empty" }>> {
  const shape = closed(value, path, ["kind", "viewId"]);
  if (!shape.ok) return shape;
  if (!isStableId(shape.value.viewId) || !viewIds.has(shape.value.viewId)) {
    return issue(`${path}.viewId`, "identity-mismatch", "Unknown view operand");
  }
  return accepted({ kind: "view-not-empty", viewId: shape.value.viewId });
}

function validateBlockReferenceStatus(
  value: Record<string, unknown>,
  path: string,
  requiredPairs: ReadonlySet<string>
): ValidationResult<BlockWhen> {
  const shape = closed(value, path, ["kind", "checkId", "referenceName", "status"]);
  return shape.ok ? validateReferenceStatusPredicate(shape.value, path, requiredPairs) : shape;
}

function validateKnownBlockWhen(
  value: Record<string, unknown> & { kind: string },
  path: string,
  context: ReadinessContext
): ValidationResult<BlockWhen> {
  switch (value.kind) {
    case "view-not-empty":
      return validateViewNotEmpty(value, path, context.viewIds);
    case "check-outcome":
      return validateCheckOutcome(value, path, context.definitions);
    case "reference-status":
      return validateBlockReferenceStatus(value, path, context.requiredPairs);
    default:
      return issue(`${path}.kind`, "invalid-value", "Unknown blockWhen predicate");
  }
}

export function validateBlockWhen(
  value: unknown,
  context: ReadinessContext
): ValidationResult<BlockWhen> {
  const path = "$.policy.blockWhen";
  if (!isRecord(value) || typeof value.kind !== "string") {
    return issue(path, "invalid-value", "Invalid blockWhen predicate");
  }
  return validateKnownBlockWhen(value as Record<string, unknown> & { kind: string }, path, context);
}

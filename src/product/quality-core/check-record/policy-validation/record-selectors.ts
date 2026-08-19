import type { CheckDefinition } from "../model.ts";
import type { RecordSelector } from "../policy-model.ts";
import type { ValidationResult } from "../validation.ts";
import { accepted, closed, isStableId, issue } from "./validation-helpers.ts";

function findRecordType(definitions: readonly CheckDefinition[], selector: RecordSelector) {
  return definitions
    .find((definition) => definition.checkId === selector.checkId)
    ?.recordTypes.find((recordType) => recordType.recordTypeId === selector.recordTypeId);
}

/** Validates a policy selector against the materialized Check/record-type catalog. */
export function validateSelector(
  value: unknown,
  path: string,
  definitions: readonly CheckDefinition[]
): ValidationResult<RecordSelector> {
  const shape = closed(value, path, ["checkId", "recordTypeId"]);
  if (!shape.ok) return shape;
  if (!isStableId(shape.value.checkId) || !isStableId(shape.value.recordTypeId)) {
    return issue(path, "invalid-value", "Selector identities must use stable kebab-case grammar");
  }
  const selector = { checkId: shape.value.checkId, recordTypeId: shape.value.recordTypeId };
  if (findRecordType(definitions, selector) === undefined) {
    return issue(path, "identity-mismatch", "Unknown qualified record selector");
  }
  return accepted(selector);
}

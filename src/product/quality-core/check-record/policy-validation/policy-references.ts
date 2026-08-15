import type { CheckDefinition } from "../model.ts";
import type {
  NamedReferenceIdentity,
  PolicyReferenceRequirement
} from "../policy-model.ts";
import type { ValidationResult } from "../validation.ts";
import {
  accepted,
  closed,
  isStableId,
  issue
} from "./validation-helpers.ts";

function validateReferenceCheckIds(
  value: unknown,
  path: string,
  definitions: readonly CheckDefinition[]
): ValidationResult<readonly string[]> {
  if (!Array.isArray(value) || value.length === 0) {
    return issue(path, "invalid-value", "Reference requirement needs at least one Check");
  }
  const rawCheckIds = value as readonly unknown[];
  const checkIds: string[] = [];
  const seenCheckIds = new Set<string>();
  for (let index = 0; index < rawCheckIds.length; index += 1) {
    const checkId = rawCheckIds[index];
    if (!isStableId(checkId) || !definitions.some((definition) => definition.checkId === checkId)) {
      return issue(`${path}[${index}]`, "identity-mismatch", "Unknown reference Check");
    }
    if (seenCheckIds.has(checkId)) {
      return issue(`${path}[${index}]`, "duplicate", "Duplicate reference Check");
    }
    seenCheckIds.add(checkId);
    checkIds.push(checkId);
  }
  return accepted(checkIds);
}

function validateReferenceRequirement(
  value: unknown,
  path: string,
  referencesByName: ReadonlyMap<string, NamedReferenceIdentity>,
  definitions: readonly CheckDefinition[],
  names: Set<string>
): ValidationResult<PolicyReferenceRequirement> {
  const shape = closed(value, path, ["referenceName", "checkIds"]);
  if (!shape.ok) return shape;
  if (!isStableId(shape.value.referenceName) || !referencesByName.has(shape.value.referenceName)) {
    return issue(`${path}.referenceName`, "identity-mismatch", "Policy reference must have an explicit frozen identity");
  }
  if (names.has(shape.value.referenceName)) {
    return issue(`${path}.referenceName`, "duplicate", "Duplicate policy reference requirement");
  }
  const checkIds = validateReferenceCheckIds(shape.value.checkIds, `${path}.checkIds`, definitions);
  if (!checkIds.ok) return checkIds;
  names.add(shape.value.referenceName);
  return accepted({ referenceName: shape.value.referenceName, checkIds: checkIds.value });
}

export function validateReferenceRequirements(
  value: unknown,
  referencesByName: ReadonlyMap<string, NamedReferenceIdentity>,
  definitions: readonly CheckDefinition[]
): ValidationResult<readonly PolicyReferenceRequirement[]> {
  if (!Array.isArray(value)) {
    return issue("$.policy.references", "invalid-value", "Policy references must be an array");
  }
  const requirements: PolicyReferenceRequirement[] = [];
  const names = new Set<string>();
  for (let index = 0; index < value.length; index += 1) {
    const requirement = validateReferenceRequirement(
      value[index],
      `$.policy.references[${index}]`,
      referencesByName,
      definitions,
      names
    );
    if (!requirement.ok) return requirement;
    requirements.push(requirement.value);
  }
  return accepted(requirements);
}

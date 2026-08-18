import type { CheckDefinition } from "../model.ts";
import type {
  NamedReferenceIdentity,
  PolicyResolution,
  RecordPolicySurface
} from "../policy-model.ts";
import type { ValidationResult } from "../validation.ts";
import { validateDecisionPolicy } from "./decision-policy.ts";
import { safePolicyInput } from "./safe-input.ts";
import { accepted, closed, compareText, isStableId, issue } from "./validation-helpers.ts";

const REFERENCE_ID_PATTERN = /^reference\/v1\/sha256:[a-f0-9]{64}$/;

interface ResolutionContext {
  readonly catalogFingerprint: string;
  readonly definitions: readonly CheckDefinition[];
  readonly surfaces: readonly RecordPolicySurface[];
}

function validateNamedReference(
  value: unknown,
  path: string,
  referenceNames: Set<string>,
  referenceIds: Set<string>
): ValidationResult<NamedReferenceIdentity> {
  const shape = closed(value, path, ["referenceName", "referenceId"]);
  if (!shape.ok) return shape;
  if (!isStableId(shape.value.referenceName)) {
    return issue(`${path}.referenceName`, "invalid-value", "Invalid referenceName");
  }
  if (
    typeof shape.value.referenceId !== "string" ||
    !REFERENCE_ID_PATTERN.test(shape.value.referenceId)
  ) {
    return issue(
      `${path}.referenceId`,
      "invalid-value",
      "referenceId must be a safe opaque identity"
    );
  }
  if (referenceNames.has(shape.value.referenceName) || referenceIds.has(shape.value.referenceId)) {
    return issue(`${path}.referenceName`, "duplicate", "Duplicate named reference identity");
  }
  referenceNames.add(shape.value.referenceName);
  referenceIds.add(shape.value.referenceId);
  return accepted({
    referenceName: shape.value.referenceName,
    referenceId: shape.value.referenceId
  });
}

function validateNamedReferences(
  value: unknown
): ValidationResult<readonly NamedReferenceIdentity[]> {
  if (!Array.isArray(value))
    return issue("$.references", "invalid-value", "references must be an array");
  const references: NamedReferenceIdentity[] = [];
  const referenceNames = new Set<string>();
  const referenceIds = new Set<string>();
  for (let index = 0; index < value.length; index += 1) {
    const reference = validateNamedReference(
      value[index],
      `$.references[${index}]`,
      referenceNames,
      referenceIds
    );
    if (!reference.ok) return reference;
    references.push(reference.value);
  }
  return accepted(references);
}

function validateEnabledPolicyResolution(
  policy: unknown,
  references: readonly NamedReferenceIdentity[],
  context: ResolutionContext
): ValidationResult<PolicyResolution> {
  const validatedPolicy = validateDecisionPolicy(
    policy,
    references,
    context.surfaces,
    context.definitions
  );
  if (!validatedPolicy.ok) return validatedPolicy;
  return accepted({
    catalogFingerprint: context.catalogFingerprint,
    policy: validatedPolicy.value,
    references: [...references].sort((left, right) =>
      compareText(left.referenceName, right.referenceName)
    )
  });
}

function validateDisabledPolicyResolution(
  references: readonly NamedReferenceIdentity[],
  catalogFingerprint: string
): ValidationResult<PolicyResolution> {
  if (references.length > 0) {
    return issue(
      "$.policy",
      "invalid-value",
      "Disabled policy resolution must not retain unused policy inputs"
    );
  }
  return accepted({ catalogFingerprint, policy: null, references: [] });
}

export function validatePolicyResolutionData(
  value: unknown,
  context: ResolutionContext
): ValidationResult<PolicyResolution> {
  const materialized = safePolicyInput(value);
  if (!materialized.ok) return materialized;
  const shape = closed(materialized.value, "$", ["policy", "references"]);
  if (!shape.ok) return shape;
  const references = validateNamedReferences(shape.value.references);
  if (!references.ok) return references;
  return shape.value.policy === null
    ? validateDisabledPolicyResolution(references.value, context.catalogFingerprint)
    : validateEnabledPolicyResolution(shape.value.policy, references.value, context);
}

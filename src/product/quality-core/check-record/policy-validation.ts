import { createCatalogFingerprint } from "./identity.ts";
import type { CoreSnapshot, JsonPrimitive, QualityRecord } from "./model.ts";
import type {
  PolicyResolution,
  RecordOperandDefinition,
  RecordPolicySurface,
  ReferenceFacts,
  ValidatedPolicyCatalog,
  ValidatedPolicySurfaceRegistry
} from "./policy-model.ts";
import { validatePolicyResolutionData } from "./policy-validation/policy-resolution.ts";
import { validateReferenceFactsData } from "./policy-validation/reference-facts.ts";
import {
  accepted,
  compareText,
  deepFreeze,
  issue,
  selectorKey
} from "./policy-validation/validation-helpers.ts";
import type { ValidationResult } from "./validation.ts";

function createRecordPolicySurface(
  definition: ValidatedPolicyCatalog["definitions"][number],
  recordType: ValidatedPolicyCatalog["definitions"][number]["recordTypes"][number]
): RecordPolicySurface {
  const policy = recordType.policy ?? { operands: [], relations: [] };
  return {
    checkId: definition.checkId,
    recordTypeId: recordType.recordTypeId,
    operands: policy.operands.map((operand) => ({
      operandId: operand.operandId,
      valueType: operand.valueType,
      source:
        operand.source.kind === "field"
          ? { kind: "field", fieldId: operand.source.fieldId }
          : { kind: operand.source.kind }
    })),
    relations: [...policy.relations]
  };
}

export function createPolicySurfaceRegistry(
  catalog: ValidatedPolicyCatalog
): ValidatedPolicySurfaceRegistry {
  const expectedFingerprint = createCatalogFingerprint(catalog.definitions).catalogFingerprint;
  if (catalog.catalogFingerprint !== expectedFingerprint) {
    throw new TypeError("Policy surface catalog fingerprint mismatch");
  }
  const recordTypes = catalog.definitions.flatMap((definition) =>
    definition.recordTypes.map((recordType) => createRecordPolicySurface(definition, recordType))
  );
  return deepFreeze({
    catalogFingerprint: catalog.catalogFingerprint,
    recordTypes: recordTypes.sort((left, right) =>
      compareText(selectorKey(left), selectorKey(right))
    )
  });
}

function resolvePolicySurfaceRegistry(
  catalog: ValidatedPolicyCatalog,
  errorMessage: string
): ValidationResult<ValidatedPolicySurfaceRegistry> {
  try {
    return accepted(createPolicySurfaceRegistry(catalog));
  } catch {
    return issue("$.catalogFingerprint", "identity-mismatch", errorMessage);
  }
}

export function validatePolicyResolution(
  value: unknown,
  catalog: ValidatedPolicyCatalog
): ValidationResult<PolicyResolution> {
  const registry = resolvePolicySurfaceRegistry(catalog, "Policy catalog fingerprint is invalid");
  if (!registry.ok) return registry;
  return validatePolicyResolutionData(value, {
    catalogFingerprint: catalog.catalogFingerprint,
    definitions: catalog.definitions,
    surfaces: registry.value.recordTypes
  });
}

export function validateReferenceFacts(
  value: unknown,
  resolution: PolicyResolution,
  snapshot: CoreSnapshot
): ValidationResult<ReferenceFacts> {
  const catalogFingerprint = createCatalogFingerprint(snapshot.checks).catalogFingerprint;
  if (resolution.catalogFingerprint !== catalogFingerprint) {
    return issue(
      "$.catalogFingerprint",
      "identity-mismatch",
      "Policy resolution catalog does not match the final snapshot"
    );
  }
  const registry = resolvePolicySurfaceRegistry(
    {
      catalogFingerprint,
      definitions: snapshot.checks
    },
    "Final snapshot catalog fingerprint is invalid"
  );
  if (!registry.ok) return registry;
  return validateReferenceFactsData(value, resolution, snapshot, registry.value.recordTypes);
}

export function readRecordOperand(
  record: QualityRecord,
  operand: RecordOperandDefinition
): Exclude<JsonPrimitive, null> | null {
  if (operand.source.kind === "level") return record.level;
  if (operand.source.kind === "message") return record.message;
  if (operand.source.kind === "location-path") return record.location?.path ?? null;
  return record.fields[operand.source.fieldId] ?? null;
}

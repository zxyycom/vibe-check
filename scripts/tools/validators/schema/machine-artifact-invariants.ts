import {
  catalogFingerprint,
  isCanonicalText,
  recordIdentity,
  recordsFingerprint
} from "./machine-artifact-canonical.ts";
import { validateCheckDefinitionInvariants } from "./machine-artifact-definition-invariants.ts";
import { validateDecision } from "./machine-artifact-decision-invariants.ts";
import { setFailure } from "./machine-artifact-diagnostics.ts";
import { validateReferences } from "./machine-artifact-reference-invariants.ts";
import {
  RECORDS_ARTIFACT,
  RUN_ARTIFACT,
  type DocsMachineValidationFailure,
  type RecordFieldValueType,
  type RecordShape,
  type RecordTypeShape,
  type RunShape
} from "./machine-artifact-types.ts";

export function validateArtifactSetInvariants(
  run: RunShape,
  records: readonly RecordShape[],
  artifactRoot: string
): DocsMachineValidationFailure | null {
  let failure = validateCheckDefinitionInvariants(run, artifactRoot);
  if (failure !== null) return failure;
  failure = validateCatalogAndChecks(run, artifactRoot);
  if (failure !== null) return failure;
  failure = validateRecords(run, records, artifactRoot);
  if (failure !== null) return failure;
  failure = validateRecordsFingerprint(run, records, artifactRoot);
  if (failure !== null) return failure;
  failure = validateReferences(run, records, artifactRoot);
  if (failure !== null) return failure;
  return validateDecision(run, records, artifactRoot);
}

function validateRecordsFingerprint(
  run: RunShape,
  records: readonly RecordShape[],
  artifactRoot: string
): DocsMachineValidationFailure | null {
  if (recordsFingerprint(records) === run.recordsFingerprint) return null;
  return setFailure(artifactRoot, RECORDS_ARTIFACT, {
    message: "Records fingerprint must match the complete canonical Record row set.",
    relationship: "records-fingerprint"
  });
}

function validateCatalogAndChecks(
  run: RunShape,
  artifactRoot: string
): DocsMachineValidationFailure | null {
  if (catalogFingerprint(run.checks) !== run.catalogFingerprint) {
    return setFailure(artifactRoot, RUN_ARTIFACT, {
      message: "Catalog fingerprint must match the published Check projections.",
      pointer: "/catalogFingerprint",
      relationship: "catalog-fingerprint"
    });
  }
  if (isCanonicalText(run.checks.map(({ checkId }) => checkId))) return null;
  return setFailure(artifactRoot, RUN_ARTIFACT, {
    message: "Checks must be uniquely sorted by checkId.",
    pointer: "/checks",
    relationship: "check-canonical-order"
  });
}

function validateRecords(
  run: RunShape,
  records: readonly RecordShape[],
  artifactRoot: string
): DocsMachineValidationFailure | null {
  let previousRecordId: string | undefined;
  for (const [index, record] of records.entries()) {
    if (previousRecordId !== undefined && previousRecordId >= record.recordId) {
      return setFailure(artifactRoot, RECORDS_ARTIFACT, {
        index,
        line: index + 1,
        message: "Records must be uniquely sorted by recordId.",
        relationship: "record-canonical-order"
      });
    }
    previousRecordId = record.recordId;
    const check = run.checks.find(({ checkId }) => checkId === record.checkId);
    const recordType = check?.recordTypes.find(
      ({ recordTypeId }) => recordTypeId === record.recordTypeId
    );
    if (recordType === undefined || check?.outcome.kind === "not-applicable") {
      return setFailure(artifactRoot, RECORDS_ARTIFACT, {
        index,
        line: index + 1,
        message: "Record must belong to a published record type and owning Check.",
        relationship: "record-check-ownership"
      });
    }
    const fieldFailure = validateRecordFields(record, recordType, artifactRoot, index);
    if (fieldFailure !== null) return fieldFailure;
    if (recordIdentity(record, recordType) !== record.recordId) {
      return setFailure(artifactRoot, RECORDS_ARTIFACT, {
        index,
        line: index + 1,
        message: "recordId must match the canonical semantic identity fields.",
        relationship: "record-identity"
      });
    }
  }
  return null;
}

function validateRecordFields(
  record: RecordShape,
  recordType: RecordTypeShape,
  artifactRoot: string,
  index: number
): DocsMachineValidationFailure | null {
  const definitions = new Map(recordType.fields.map((field) => [field.fieldId, field]));
  const unknownField = Object.keys(record.fields).find((fieldId) => !definitions.has(fieldId));
  if (unknownField !== undefined) {
    return recordFieldFailure(
      artifactRoot,
      index,
      unknownField,
      "Record fields contain an undeclared field."
    );
  }
  for (const definition of recordType.fields) {
    if (!Object.hasOwn(record.fields, definition.fieldId)) {
      if (!definition.required) continue;
      return recordFieldFailure(
        artifactRoot,
        index,
        definition.fieldId,
        "Record is missing a required field."
      );
    }
    if (!isExpectedFieldValue(record.fields[definition.fieldId], definition.valueType)) {
      return recordFieldFailure(
        artifactRoot,
        index,
        definition.fieldId,
        `Record field must match declared ${definition.valueType} type.`
      );
    }
  }
  return null;
}

function isExpectedFieldValue(value: unknown, valueType: RecordFieldValueType): boolean {
  switch (valueType) {
    case "boolean":
      return typeof value === "boolean";
    case "integer":
      return typeof value === "number" && Number.isSafeInteger(value);
    case "number":
      return typeof value === "number" && Number.isFinite(value);
    case "string":
      return typeof value === "string";
  }
  return unreachableRecordFieldValueType(valueType);
}

function recordFieldFailure(
  artifactRoot: string,
  index: number,
  fieldId: string,
  message: string
): DocsMachineValidationFailure {
  return setFailure(artifactRoot, RECORDS_ARTIFACT, {
    index,
    line: index + 1,
    message,
    pointer: `/fields/${fieldId.replaceAll("~", "~0").replaceAll("/", "~1")}`,
    relationship: "record-field-contract"
  });
}

function unreachableRecordFieldValueType(valueType: never): never {
  throw new TypeError(`Unknown machine Record field value type: ${valueType}`);
}

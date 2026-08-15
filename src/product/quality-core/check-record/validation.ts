import type {
  CheckDefinition,
  CoreSnapshot,
  QualityRecord
} from "./model.ts";
import {
  materializeUnknown,
  type ValidationResult
} from "./foundation-validation/common.ts";
import { validateMaterializedCheckDefinition } from "./foundation-validation/definition.ts";
import { validateMaterializedQualityRecord } from "./foundation-validation/quality-record.ts";
import { validateMaterializedCoreSnapshot } from "./foundation-validation/final-snapshot.ts";

export type {
  ValidationIssue,
  ValidationResult
} from "./foundation-validation/common.ts";

export function validateCheckDefinition(value: unknown): ValidationResult<CheckDefinition> {
  const materialized = materializeUnknown(value);
  return materialized.ok ? validateMaterializedCheckDefinition(materialized.value) : materialized;
}

export function validateQualityRecord(
  value: unknown,
  definition: CheckDefinition
): ValidationResult<QualityRecord> {
  const materialized = materializeUnknown(value);
  return materialized.ok
    ? validateMaterializedQualityRecord(materialized.value, definition)
    : materialized;
}

export function validateCoreSnapshot(
  value: unknown
): ValidationResult<CoreSnapshot> {
  const materialized = materializeUnknown(value);
  return materialized.ok
    ? validateMaterializedCoreSnapshot(materialized.value)
    : materialized;
}

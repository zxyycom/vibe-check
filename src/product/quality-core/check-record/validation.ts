import type {
  CheckDefinition,
  CheckRun,
  FinalCoreSnapshot,
  QualityRecord
} from "./model.ts";
import {
  materializeUnknown,
  type ValidationResult
} from "./foundation-validation/common.ts";
import { validateMaterializedCheckDefinition } from "./foundation-validation/definition.ts";
import { validateMaterializedCheckRun } from "./foundation-validation/check-run.ts";
import { validateMaterializedQualityRecord } from "./foundation-validation/quality-record.ts";
import { validateMaterializedFinalCoreSnapshot } from "./foundation-validation/final-snapshot.ts";

export type {
  ValidationIssue,
  ValidationResult
} from "./foundation-validation/common.ts";

export function validateCheckDefinition(value: unknown): ValidationResult<CheckDefinition> {
  const materialized = materializeUnknown(value);
  return materialized.ok ? validateMaterializedCheckDefinition(materialized.value) : materialized;
}

export function validateCheckRun(value: unknown): ValidationResult<CheckRun> {
  const materialized = materializeUnknown(value);
  return materialized.ok ? validateMaterializedCheckRun(materialized.value) : materialized;
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

export function validateFinalCoreSnapshot(
  value: unknown
): ValidationResult<FinalCoreSnapshot> {
  const materialized = materializeUnknown(value);
  return materialized.ok
    ? validateMaterializedFinalCoreSnapshot(materialized.value)
    : materialized;
}

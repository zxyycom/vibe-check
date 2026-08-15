import type {
  CheckDefinition,
  PolicyOperandDefinition,
  PolicyOperandSource,
  RecordFieldDefinition,
  RecordFieldValueType,
  RecordTypeDefinition,
  RecordTypePolicySurface
} from "../../definition/check-definition.ts";
import type {
  QualityRecordCandidate,
  RecordFieldValue,
  RecordLevel
} from "../../definition/custom-check.ts";

/**
 * Declarative Check and project-authored candidate shapes have one authority:
 * Project Definition. Core only validates and settles their fact projection.
 */
export { RECORD_FIELD_VALUE_TYPES } from "../../definition/check-definition.ts";
export type {
  CheckDefinition,
  PolicyOperandDefinition,
  PolicyOperandSource,
  QualityRecordCandidate,
  RecordFieldDefinition,
  RecordFieldValue,
  RecordFieldValueType,
  RecordLevel,
  RecordTypeDefinition,
  RecordTypePolicySurface
};

export type JsonPrimitive = boolean | null | number | string;
export type JsonValue = JsonPrimitive | readonly JsonValue[] | JsonObject;
export interface JsonObject {
  readonly [key: string]: JsonValue;
}

export const RECORD_LEVELS = ["info", "warning", "error"] as const satisfies readonly RecordLevel[];
export type RecordLocation = Exclude<QualityRecordCandidate["location"], null>;
export type RecordFields = QualityRecordCandidate["fields"];

export interface QualityRecord extends QualityRecordCandidate {
  readonly recordId: string;
  readonly checkId: string;
}

export const CHECK_UNAVAILABLE_DIAGNOSTIC_CATEGORIES = [
  "record-conflict",
  "invalid-record",
  "capability-protocol",
  "invalid-result",
  "dependency-unavailable",
  "execution-failed",
  "cancelled"
] as const;
export type CheckUnavailableDiagnosticCategory =
  typeof CHECK_UNAVAILABLE_DIAGNOSTIC_CATEGORIES[number];

export interface CheckUnavailableDiagnostic {
  readonly category: CheckUnavailableDiagnosticCategory;
}

/** A Core Check has exactly one terminal outcome and no execution bookkeeping. */
export type CheckOutcome = Readonly<
  | { kind: "not-applicable" }
  | { kind: "completed"; verdict: "passed" | "failed" }
  | { kind: "unavailable"; diagnostic: CheckUnavailableDiagnostic }
>;

export interface CoreCheck extends CheckDefinition {
  readonly outcome: CheckOutcome;
}

/** The complete product entity projection. Invocation metadata belongs to Run, not Core. */
export interface CoreSnapshot {
  readonly checks: readonly CoreCheck[];
  readonly records: readonly QualityRecord[];
}

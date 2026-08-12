export type JsonPrimitive = boolean | null | number | string;
export type JsonValue = JsonPrimitive | readonly JsonValue[] | JsonObject;
export interface JsonObject {
  readonly [key: string]: JsonValue;
}

export const RECORD_FIELD_VALUE_TYPES = ["boolean", "integer", "number", "string"] as const;
export type RecordFieldValueType = typeof RECORD_FIELD_VALUE_TYPES[number];

export interface RecordFieldDefinition {
  readonly fieldId: string;
  readonly valueType: RecordFieldValueType;
  readonly required: boolean;
}

export type PolicyOperandSource = Readonly<
  | { kind: "level" }
  | { kind: "message" }
  | { kind: "location-path" }
  | { kind: "field"; fieldId: string }
>;

export interface PolicyOperandDefinition {
  readonly operandId: string;
  readonly valueType: "boolean" | "number" | "string";
  readonly source: PolicyOperandSource;
}

export interface RecordTypePolicySurface {
  readonly operands: readonly PolicyOperandDefinition[];
  readonly relations: readonly string[];
}

export interface RecordTypeDefinition {
  readonly recordTypeId: string;
  readonly fields: readonly RecordFieldDefinition[];
  readonly identityFields: readonly string[];
  readonly policy?: RecordTypePolicySurface;
}

export interface CheckDefinition {
  readonly checkId: string;
  readonly displayName: string;
  readonly recordTypes: readonly RecordTypeDefinition[];
}

export const RECORD_LEVELS = ["info", "warning", "error"] as const;
export type RecordLevel = typeof RECORD_LEVELS[number];

export interface RecordLocation {
  readonly path: string;
  readonly line: number;
  readonly column: number;
}

export type RecordFieldValue = boolean | number | string;
export interface RecordFields {
  readonly [fieldId: string]: RecordFieldValue;
}

export interface QualityRecordCandidate {
  readonly recordTypeId: string;
  readonly level: RecordLevel;
  readonly semanticSubject: string;
  readonly message: string;
  readonly fields: RecordFields;
  readonly location: RecordLocation | null;
}

export interface ManagerBoundQualityRecordCandidate extends QualityRecordCandidate {
  readonly checkId: string;
  readonly checkRunId: string;
}

export interface QualityRecord extends ManagerBoundQualityRecordCandidate {
  readonly recordId: string;
}

export const CHECK_RESULT_VERDICTS = ["passed", "failed", "not-applicable"] as const;
export type CheckResultVerdict = typeof CHECK_RESULT_VERDICTS[number];

export interface CheckResult {
  readonly verdict: CheckResultVerdict;
}

export interface RunCoverage {
  readonly plannedWorkCount: number;
  readonly acknowledgedWorkCount: number;
}

export const RUN_FAILURE_CATEGORIES = [
  "record-conflict",
  "invalid-record",
  "ack-protocol",
  "terminal-report-set",
  "invalid-result",
  "unavailable",
  "execution-failed"
] as const;
export type RunFailureCategory = typeof RUN_FAILURE_CATEGORIES[number];

export const RUN_FAILURE_RANK: Readonly<Record<RunFailureCategory, number>> = Object.freeze({
  "record-conflict": 0,
  "invalid-record": 1,
  "ack-protocol": 2,
  "terminal-report-set": 3,
  "invalid-result": 4,
  unavailable: 5,
  "execution-failed": 6
});

export interface RunDiagnostic {
  readonly category: RunFailureCategory;
  readonly tieBreakKey: string;
}

export function compareRunDiagnostics(left: RunDiagnostic, right: RunDiagnostic): number {
  const rankDifference = RUN_FAILURE_RANK[left.category] - RUN_FAILURE_RANK[right.category];
  if (rankDifference !== 0) {
    return rankDifference;
  }
  if (left.tieBreakKey < right.tieBreakKey) {
    return -1;
  }
  if (left.tieBreakKey > right.tieBreakKey) {
    return 1;
  }
  return 0;
}

interface CheckRunBase {
  readonly checkId: string;
  readonly checkRunId: string;
}

export interface SkippedCheckRun extends CheckRunBase {
  readonly selection: "unselected";
  readonly applicability: null;
  readonly status: "skipped";
  readonly result: null;
  readonly coverage: null;
  readonly diagnostic: null;
}

export interface NotApplicableCheckRun extends CheckRunBase {
  readonly selection: "selected";
  readonly applicability: "not-applicable";
  readonly status: "completed";
  readonly result: Readonly<{ verdict: "not-applicable" }>;
  readonly coverage: RunCoverage;
  readonly diagnostic: null;
}

export interface CompletedCheckRun extends CheckRunBase {
  readonly selection: "selected";
  readonly applicability: "applicable";
  readonly status: "completed";
  readonly result: Readonly<{ verdict: "passed" | "failed" }>;
  readonly coverage: RunCoverage;
  readonly diagnostic: null;
}

export interface FailedCheckRun extends CheckRunBase {
  readonly selection: "selected";
  readonly applicability: "applicable";
  readonly status: "failed";
  readonly result: null;
  readonly coverage: RunCoverage;
  readonly diagnostic: RunDiagnostic;
}

export type CheckRun = SkippedCheckRun | NotApplicableCheckRun | CompletedCheckRun | FailedCheckRun;

export interface InvalidRecordEvidence {
  readonly kind: "invalid-record";
  readonly checkId: string;
  readonly checkRunId: string;
  readonly recordTypeId: string;
  readonly evidenceId: string;
}

export interface RecordConflictEvidence {
  readonly kind: "record-conflict";
  readonly checkId: string;
  readonly checkRunId: string;
  readonly recordTypeId: string;
  readonly recordId: string;
  readonly bodyFingerprints: readonly string[];
}

export type SnapshotIntegrityStatus = "valid" | "invalid" | "conflicted";

export interface SnapshotIntegrity {
  readonly status: SnapshotIntegrityStatus;
  readonly invalidRecords: readonly InvalidRecordEvidence[];
  readonly conflicts: readonly RecordConflictEvidence[];
}

export interface SnapshotCompleteness {
  readonly status: "complete" | "incomplete";
  readonly selectedRunCount: number;
  readonly completedRunCount: number;
  readonly failedRunCount: number;
  readonly plannedWorkCount: number;
  readonly acknowledgedWorkCount: number;
}

export interface FinalCoreSnapshot {
  readonly catalogFingerprint: string;
  readonly definitions: readonly CheckDefinition[];
  readonly runs: readonly CheckRun[];
  readonly records: readonly QualityRecord[];
  readonly integrity: SnapshotIntegrity;
  readonly completeness: SnapshotCompleteness;
}

export const CURRENT_MACHINE_EXAMPLES_ROOT = "docs/examples/artifacts";
export const CURRENT_MACHINE_OUTCOMES = [
  "complete-passed",
  "complete-warning",
  "gate-failed",
  "legitimate-empty",
  "scan-incomplete"
] as const;
export const RUN_ARTIFACT = "run.json";
export const RECORDS_ARTIFACT = "records.ndjson";

export type JsonRecord = Readonly<Record<string, unknown>>;

export type RecordFieldValueType = "boolean" | "integer" | "number" | "string";
export type PolicyOperandValueType = "boolean" | "number" | "string";
export type CheckUnavailableDiagnosticCategory =
  | "record-conflict"
  | "invalid-record"
  | "capability-protocol"
  | "invalid-result"
  | "dependency-unavailable"
  | "execution-failed"
  | "cancelled";
export type ReferenceEvidenceStatus = "complete" | "unavailable" | "incomplete";
export type GateNotEvaluatedReason =
  | "scan-incomplete"
  | "no-eligible-input"
  | "comparison-unavailable";

export interface RecordFieldShape {
  readonly fieldId: string;
  readonly required: boolean;
  readonly valueType: RecordFieldValueType;
}

export interface PolicyOperandShape {
  readonly operandId: string;
  readonly source: JsonRecord;
  readonly valueType: PolicyOperandValueType;
}

export interface RecordTypeShape {
  readonly recordTypeId: string;
  readonly fields: readonly RecordFieldShape[];
  readonly identityFields: readonly string[];
  readonly policy?: {
    readonly operands: readonly PolicyOperandShape[];
    readonly relations: readonly string[];
  };
}

export interface CheckShape {
  readonly checkId: string;
  readonly displayName: string;
  readonly outcome: Readonly<
    | { readonly kind: "not-applicable" }
    | { readonly kind: "completed"; readonly verdict: "passed" | "failed" }
    | {
      readonly kind: "unavailable";
      readonly diagnostic: { readonly category: CheckUnavailableDiagnosticCategory };
    }
  >;
  readonly recordTypes: readonly RecordTypeShape[];
}

export interface RecordShape extends JsonRecord {
  readonly recordId: string;
  readonly checkId: string;
  readonly recordTypeId: string;
  readonly semanticSubject: string;
  readonly fields: Readonly<Record<string, boolean | number | string>>;
}

export type EvidenceRefShape = Readonly<
  | { readonly kind: "check"; readonly checkId: string }
  | { readonly kind: "record"; readonly recordId: string }
  | {
    readonly kind: "reference";
    readonly checkId: string;
    readonly referenceId: string;
    readonly referenceName: string;
  }
  | { readonly kind: "view"; readonly viewId: string }
  | { readonly kind: "readiness"; readonly readinessId: string }
>;

export type ReadinessEvidenceShape = Readonly<
  | {
    readonly evidenceRefs: readonly EvidenceRefShape[];
    readonly readinessId: string;
    readonly reason: null;
    readonly status: "passed";
  }
  | {
    readonly evidenceRefs: readonly EvidenceRefShape[];
    readonly readinessId: string;
    readonly reason: GateNotEvaluatedReason;
    readonly status: "failed";
  }
>;

export type GateShape = Readonly<
  | { readonly policyId: null; readonly status: "disabled" }
  | {
    readonly blockingRecordIds: readonly string[];
    readonly evidenceRefs: readonly EvidenceRefShape[];
    readonly policyId: string;
    readonly status: "passed" | "failed";
  }
  | {
    readonly evidenceRefs: readonly EvidenceRefShape[];
    readonly policyId: string;
    readonly reason: GateNotEvaluatedReason;
    readonly status: "not-evaluated";
  }
>;

export interface RunShape extends JsonRecord {
  readonly catalogFingerprint: string;
  readonly recordsFingerprint: string;
  readonly checks: readonly CheckShape[];
  readonly acceptance: readonly { readonly acceptanceId: string; readonly recordId: string }[];
  readonly references: {
    readonly identities: readonly { readonly referenceId: string; readonly referenceName: string }[];
    readonly evidence: readonly {
      readonly checkId: string;
      readonly referenceName: string;
      readonly status: ReferenceEvidenceStatus;
    }[];
    readonly relations: readonly { readonly recordId: string; readonly referenceName: string; readonly relationId: string }[];
  };
  readonly decision: {
    readonly policyId: string | null;
    readonly views: readonly { readonly viewId: string; readonly recordIds: readonly string[] }[];
    readonly readiness: readonly ReadinessEvidenceShape[];
    readonly blockWhen: null | {
      readonly status: "matched" | "not-matched";
      readonly evidenceRefs: readonly EvidenceRefShape[];
      readonly blockingRecordIds: readonly string[];
    };
    readonly gate: GateShape;
  };
}

export interface DocsMachineArtifactBytes {
  readonly recordsNdjson: Uint8Array;
  readonly runJson: Uint8Array;
}

export type DocsMachineValidationCategory =
  | "decoding"
  | "framing"
  | "schema"
  | "set-invariant"
  | "syntax";

export type DocsMachineSetRelationship =
  | "catalog-fingerprint"
  | "check-definition"
  | "check-canonical-order"
  | "decision-canonical-order"
  | "decision-check-reference"
  | "decision-record-reference"
  | "decision-reference-reference"
  | "decision-readiness-reference"
  | "decision-state"
  | "decision-view-reference"
  | "record-canonical-order"
  | "record-field-contract"
  | "record-identity"
  | "record-check-ownership"
  | "records-fingerprint"
  | "reference-canonical-order"
  | "reference-evidence"
  | "reference-identity"
  | "reference-relation";

export interface DocsMachineValidationDiagnostic {
  readonly category: DocsMachineValidationCategory;
  readonly index?: number;
  readonly line?: number;
  readonly logicalArtifact: string;
  readonly message: string;
  readonly path: string;
  readonly pointer?: string;
  readonly relationship?: DocsMachineSetRelationship;
}

export type DocsMachineValidationResult =
  | {
    readonly diagnostic: DocsMachineValidationDiagnostic;
    readonly ok: false;
  }
  | {
    readonly ok: true;
    readonly value: {
      readonly records: readonly RecordShape[];
      readonly run: RunShape;
    };
  };

export type DocsMachineValidationFailure = Extract<
  DocsMachineValidationResult,
  { readonly ok: false }
>;

export type ParsedArtifactResult<Value> =
  | { readonly ok: true; readonly value: Value }
  | DocsMachineValidationFailure;

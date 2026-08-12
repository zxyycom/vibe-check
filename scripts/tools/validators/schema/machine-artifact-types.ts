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

export type JsonRecord = Record<string, unknown>;

export interface RecordTypeShape {
  readonly recordTypeId: string;
  readonly fields: readonly {
    readonly fieldId: string;
    readonly required: boolean;
    readonly valueType: string;
  }[];
  readonly identityFields: readonly string[];
  readonly policy?: {
    readonly operands: readonly JsonRecord[];
    readonly relations: readonly string[];
  };
}

export interface DefinitionShape {
  readonly checkId: string;
  readonly displayName: string;
  readonly recordTypes: readonly RecordTypeShape[];
}

export interface RunEntryShape extends JsonRecord {
  readonly checkId: string;
  readonly checkRunId: string;
  readonly selection: "selected" | "unselected";
  readonly applicability: "applicable" | "not-applicable" | null;
  readonly status: "completed" | "failed" | "skipped";
  readonly coverage: {
    readonly acknowledgedWorkCount: number;
    readonly plannedWorkCount: number;
  } | null;
}

export interface RecordShape extends JsonRecord {
  readonly recordId: string;
  readonly checkId: string;
  readonly checkRunId: string;
  readonly recordTypeId: string;
  readonly semanticSubject: string;
  readonly fields: Record<string, boolean | number | string>;
}

export interface EvidenceRefShape extends JsonRecord {
  readonly kind: "readiness" | "record" | "reference" | "run" | "view";
}

export interface RunShape extends JsonRecord {
  readonly catalogFingerprint: string;
  readonly definitions: readonly DefinitionShape[];
  readonly runs: readonly RunEntryShape[];
  readonly integrity: {
    readonly status: "conflicted" | "invalid" | "valid";
    readonly invalidRecords: readonly JsonRecord[];
    readonly conflicts: readonly JsonRecord[];
  };
  readonly completeness: {
    readonly status: "complete" | "incomplete";
    readonly selectedRunCount: number;
    readonly completedRunCount: number;
    readonly failedRunCount: number;
    readonly plannedWorkCount: number;
    readonly acknowledgedWorkCount: number;
  };
  readonly acceptance: readonly { readonly acceptanceId: string; readonly recordId: string }[];
  readonly references: {
    readonly identities: readonly { readonly referenceId: string; readonly referenceName: string }[];
    readonly evidence: readonly { readonly checkId: string; readonly referenceName: string; readonly status: string }[];
    readonly relations: readonly { readonly recordId: string; readonly referenceName: string; readonly relationId: string }[];
  };
  readonly decision: {
    readonly policyId: string | null;
    readonly views: readonly { readonly viewId: string; readonly recordIds: readonly string[] }[];
    readonly readiness: readonly {
      readonly readinessId: string;
      readonly status: "failed" | "passed";
      readonly reason: string | null;
      readonly evidenceRefs: readonly EvidenceRefShape[];
    }[];
    readonly blockWhen: null | {
      readonly status: "matched" | "not-matched";
      readonly evidenceRefs: readonly EvidenceRefShape[];
      readonly blockingRecordIds: readonly string[];
    };
    readonly gate: JsonRecord & {
      readonly status: "disabled" | "failed" | "not-evaluated" | "passed";
      readonly policyId: string | null;
    };
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
  | "catalog-run-membership"
  | "completeness-reduction"
  | "decision-canonical-order"
  | "decision-record-reference"
  | "decision-reference-reference"
  | "decision-readiness-reference"
  | "decision-run-reference"
  | "decision-state"
  | "decision-view-reference"
  | "integrity-evidence"
  | "record-canonical-order"
  | "record-identity"
  | "record-run-ownership"
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

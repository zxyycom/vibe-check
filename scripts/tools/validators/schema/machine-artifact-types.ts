export const CURRENT_MACHINE_EXAMPLES_ROOT = "docs/examples/artifacts";
export const CURRENT_MACHINE_OUTCOMES = [
  "complete-passed",
  "complete-failed-with-record",
  "legitimate-empty",
  "unavailable"
] as const;
export const RECORDS_ARTIFACT = "records.ndjson";
export const RUN_ARTIFACT = "run.json";

type JsonPrimitive = boolean | null | number | string;
export type JsonValue =
  | JsonPrimitive
  | readonly JsonValue[]
  | { readonly [key: string]: JsonValue };
export type JsonObject = { readonly [key: string]: JsonValue };

export type OutcomeShape =
  | { readonly status: "passed" | "failed"; readonly data: JsonObject }
  | { readonly status: "not-applicable"; readonly reason?: { readonly code: string } }
  | {
      readonly status: "unavailable";
      readonly reason: { readonly code: string; readonly checkIds?: readonly string[] };
    };

export interface CheckShape {
  readonly checkId: string;
  readonly displayName: string;
  readonly outcome: OutcomeShape;
}

export interface RecordShape {
  readonly schemaVersion: "vibe-check.record.v4";
  readonly checkId: string;
  readonly id: string;
  readonly data: JsonObject;
}

export interface RunShape {
  readonly schemaVersion: "vibe-check.run.v4";
  readonly invocation: {
    readonly invocationId: string;
    readonly projectRoot: ".";
    readonly timestamp: string;
  };
  readonly recordsFingerprint: string;
  readonly checks: readonly CheckShape[];
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
  | "canonical-json"
  | "check-canonical-order"
  | "record-canonical-order"
  | "record-check-ownership"
  | "records-fingerprint";

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
  | { readonly diagnostic: DocsMachineValidationDiagnostic; readonly ok: false }
  | {
      readonly ok: true;
      readonly value: { readonly records: readonly RecordShape[]; readonly run: RunShape };
    };

export type DocsMachineValidationFailure = Extract<
  DocsMachineValidationResult,
  { readonly ok: false }
>;
export type ParsedArtifactResult<Value> =
  | { readonly ok: true; readonly value: Value }
  | DocsMachineValidationFailure;

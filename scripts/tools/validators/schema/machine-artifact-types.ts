export const CURRENT_MACHINE_EXAMPLES_ROOT = "docs/examples/artifacts";
export const CURRENT_MACHINE_OUTCOMES = [
  "complete-passed",
  "complete-warning",
  "legitimate-empty",
  "gate-failed",
  "scan-incomplete"
] as const;
export const METRICS_ARTIFACT = "metrics.json";
export const WARNINGS_ARTIFACT = "warnings.ndjson";
export const WARNINGS_ALL_ARTIFACT = "warnings-all.ndjson";
export const STABLE_CAPABILITY_IDS = [
  "file-metrics",
  "function-metrics",
  "duplicate-detection"
] as const;
export const EVALUATED_CHANNEL_BY_POLICY = {
  all: "all",
  changed: "changed",
  regressions: "regressions"
} as const;

export type JsonRecord = Record<string, unknown>;
export type WarningChannel = keyof MachineMetricsShape["warnings"];

export interface MachineMetricsShape extends JsonRecord {
  gate: JsonRecord;
  scanCompleteness: {
    capabilities: Array<{
      capabilityId: string;
      status: string;
    }>;
    overall: string;
  };
  warnings: {
    all: JsonRecord[];
    changed: JsonRecord[];
    regressions: JsonRecord[];
  };
}

export interface DocsMachineArtifactBytes {
  readonly metricsJson: Uint8Array;
  readonly warningsAllNdjson: Uint8Array;
  readonly warningsNdjson: Uint8Array;
}

export type DocsMachineValidationCategory =
  | "decoding"
  | "framing"
  | "schema"
  | "set-invariant"
  | "syntax";

export type DocsMachineSetRelationship =
  | "capability-membership"
  | "changed-subsequence-of-all"
  | "completeness-reduction"
  | "gate-blocking-count"
  | "gate-blocking-warnings"
  | "gate-evaluated-count"
  | "gate-policy-channel"
  | "gate-status"
  | "regressions-subsequence-of-changed"
  | "warnings-all-stream-equals-all"
  | "warnings-stream-equals-changed";

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
      readonly metrics: JsonRecord;
      readonly warnings: JsonRecord[];
      readonly warningsAll: JsonRecord[];
    };
  };

export type DocsMachineValidationFailure = Extract<
  DocsMachineValidationResult,
  { readonly ok: false }
>;

export type ParsedArtifactResult<Value> =
  | { readonly ok: true; readonly value: Value }
  | DocsMachineValidationFailure;

import type {
  MachineMetricsV1,
  MachineWarningV1
} from "./schema.ts";

export type MachineValidationCategory =
  | "decoding"
  | "framing"
  | "schema"
  | "set-invariant"
  | "syntax";

export type MachineSetRelationship =
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

export interface MachineValidationDiagnostic {
  readonly category: MachineValidationCategory;
  readonly index?: number;
  readonly line?: number;
  readonly logicalArtifact: string;
  readonly message: string;
  readonly pointer?: string;
  readonly relationship?: MachineSetRelationship;
}

export type MachineValidationResult<Value> =
  | {
    readonly ok: false;
    readonly diagnostic: MachineValidationDiagnostic;
  }
  | {
    readonly ok: true;
    readonly value: Value;
  };

export interface MachineArtifactBytesV1 {
  metricsJson: Uint8Array;
  warningsAllNdjson: Uint8Array;
  warningsNdjson: Uint8Array;
}

export interface ValidatedMachineArtifactSetV1 {
  readonly metrics: MachineMetricsV1;
  readonly warnings: MachineWarningV1[];
  readonly warningsAll: MachineWarningV1[];
}

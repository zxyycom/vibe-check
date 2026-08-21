import type { MachinePublicationV4 } from "./mapper.ts";

export type MachinePublicationValidationCategory =
  | "decoding"
  | "framing"
  | "schema"
  | "set-invariant"
  | "syntax";

export type MachinePublicationSetRelationship =
  | "canonical-json"
  | "check-canonical-order"
  | "core-snapshot"
  | "record-canonical-order"
  | "record-check-ownership"
  | "records-fingerprint";

export interface MachinePublicationValidationDiagnostic {
  readonly category: MachinePublicationValidationCategory;
  readonly index?: number;
  readonly line?: number;
  readonly logicalArtifact: "records.ndjson" | "run.json";
  readonly message: string;
  readonly pointer?: string;
  readonly relationship?: MachinePublicationSetRelationship;
}

export type MachinePublicationValidationResult = Readonly<
  ValidationFailure | { ok: true; value: MachinePublicationV4 }
>;

export interface ValidationFailure {
  readonly ok: false;
  readonly diagnostic: MachinePublicationValidationDiagnostic;
}

export function validationSuccess<Value>(value: Value): { ok: true; value: Value } {
  return { ok: true, value };
}

export function validationFailure(
  diagnostic: MachinePublicationValidationDiagnostic
): ValidationFailure {
  return { ok: false, diagnostic };
}

export function setInvariantFailure(
  relationship: MachinePublicationSetRelationship,
  logicalArtifact: MachinePublicationValidationDiagnostic["logicalArtifact"],
  message: string,
  index?: number
): ValidationFailure {
  return validationFailure({
    category: "set-invariant",
    ...(index === undefined ? {} : { index, line: index + 1 }),
    logicalArtifact,
    message,
    relationship
  });
}

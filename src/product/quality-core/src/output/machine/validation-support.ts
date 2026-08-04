import { isDeepStrictEqual } from "node:util";

import type { TLocalizedValidationError } from "typebox/error";

import type {
  MachineValidationDiagnostic,
  MachineValidationResult
} from "./validation-types.ts";

const UTF8_BOM = [0xef, 0xbb, 0xbf] as const;

export function decodeUtf8(
  bytes: Uint8Array,
  logicalArtifact: string
): MachineValidationResult<string> {
  try {
    return success(new TextDecoder("utf-8", { fatal: true }).decode(bytes));
  } catch {
    return failure({
      category: "decoding",
      logicalArtifact,
      message: "Input is not valid UTF-8."
    });
  }
}

export function firstDeepMismatchIndex(
  left: readonly unknown[],
  right: readonly unknown[]
): number | null {
  const sharedLength = Math.min(left.length, right.length);
  for (let index = 0; index < sharedLength; index += 1) {
    if (!isDeepStrictEqual(left[index], right[index])) return index;
  }
  return left.length === right.length ? null : sharedLength;
}

export function firstSubsequenceFailureIndex(
  subsequence: readonly unknown[],
  sequence: readonly unknown[]
): number | null {
  let subsequenceIndex = 0;
  for (const value of sequence) {
    if (isDeepStrictEqual(subsequence[subsequenceIndex], value)) {
      subsequenceIndex += 1;
      if (subsequenceIndex === subsequence.length) return null;
    }
  }
  return subsequenceIndex === subsequence.length ? null : subsequenceIndex;
}

export function schemaErrorPointer(
  error: TLocalizedValidationError | undefined
): string {
  if (!error) return "";
  const required = "requiredProperties" in error.params
    ? error.params.requiredProperties[0]
    : undefined;
  if (typeof required === "string") {
    return appendJsonPointer(error.instancePath, required);
  }
  const additional = "additionalProperties" in error.params
    ? error.params.additionalProperties[0]
    : undefined;
  return typeof additional === "string"
    ? appendJsonPointer(error.instancePath, additional)
    : error.instancePath;
}

export function schemaMessage(
  kind: "metrics" | "warning",
  pointer: string
): string {
  const subject = kind === "metrics" ? "Metrics artifact" : "Warning record";
  return `${subject} does not match the current ${kind} schema at ${pointer || "/"}.`;
}

export function hasLeadingUtf8Bom(bytes: Uint8Array): boolean {
  return UTF8_BOM.every((byte, index) => bytes[index] === byte);
}

export function countLf(bytes: Uint8Array): number {
  let count = 0;
  for (const byte of bytes) {
    if (byte === 0x0a) count += 1;
  }
  return count;
}

export function isJsonObject(
  value: unknown
): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function success<Value>(
  value: Value
): MachineValidationResult<Value> {
  return { ok: true, value };
}

export function failure(
  diagnostic: MachineValidationDiagnostic
): MachineValidationResult<never> {
  return { diagnostic, ok: false };
}

export function setFailure(
  diagnostic: Omit<MachineValidationDiagnostic, "category">
): MachineValidationResult<never> {
  return failure({ ...diagnostic, category: "set-invariant" });
}

function appendJsonPointer(pointer: string, segment: string): string {
  const escaped = segment.replaceAll("~", "~0").replaceAll("/", "~1");
  return `${pointer}/${escaped}`;
}

import { closeSync, fstatSync, openSync, readSync } from "node:fs";

import { hasDecodedDuplicateKeys } from "./decoded-duplicate-keys.ts";

export type JsonDocumentIssue =
  | "too-large"
  | "bom"
  | "invalid-utf8"
  | "invalid-json"
  | "duplicate-key";

export type StrictJsonArray = readonly StrictJsonValue[];

export interface StrictJsonObject {
  readonly [key: string]: StrictJsonValue;
}

/**
 * A package-private JSON value with frozen containers and null-prototype objects.
 * Arrays retain their array prototype; document property names remain private data.
 */
export type StrictJsonValue = null | boolean | number | string | StrictJsonArray | StrictJsonObject;

export type StrictJsonDocumentResult =
  | Readonly<{ readonly kind: "valid"; readonly jsonValue: StrictJsonValue }>
  | Readonly<{ readonly kind: "issue"; readonly reason: JsonDocumentIssue }>
  | Readonly<{ readonly kind: "unavailable" }>;

interface StrictJsonDocumentReadInput {
  readonly filePath: string;
  /** Normally validated at the Check options boundary; malformed private input becomes unavailable. */
  readonly maximumBytes: number;
}

const UTF8_BOM = [0xef, 0xbb, 0xbf] as const;
const UNAVAILABLE_DOCUMENT = Object.freeze({ kind: "unavailable" } as const);

function isPositiveSafeInteger(value: unknown): value is number {
  return typeof value === "number" && Number.isSafeInteger(value) && value > 0;
}

/**
 * Reads one approved file with a byte limit, then applies the strict JSON document contract.
 * The caller owns exact-input authorization and maps `unavailable` to its Check outcome.
 */
export function readStrictJsonDocument(
  input: StrictJsonDocumentReadInput
): StrictJsonDocumentResult {
  if (!isPositiveSafeInteger(input.maximumBytes)) return UNAVAILABLE_DOCUMENT;

  const bytes = readBoundedFile(input.filePath, input.maximumBytes);
  if (bytes === undefined) return UNAVAILABLE_DOCUMENT;
  if (bytes === "too-large") return issue("too-large");
  return inspectStrictJsonBytes(bytes);
}

function readBoundedFile(
  filePath: string,
  maximumBytes: number
): Uint8Array | "too-large" | undefined {
  let descriptor: number | undefined;
  try {
    descriptor = openSync(filePath, "r");
    const before = fstatSync(descriptor);
    if (!before.isFile() || !Number.isSafeInteger(before.size)) return undefined;
    if (before.size > maximumBytes) return "too-large";

    const bytes = new Uint8Array(before.size);
    let offset = 0;
    while (offset < bytes.byteLength) {
      const bytesRead = readSync(descriptor, bytes, offset, bytes.byteLength - offset, null);
      if (bytesRead === 0) return undefined;
      offset += bytesRead;
    }

    const after = fstatSync(descriptor);
    return after.size === before.size ? bytes : undefined;
  } catch {
    return undefined;
  } finally {
    if (descriptor !== undefined) {
      try {
        closeSync(descriptor);
      } catch {
        // The read result is already fully normalized; closing cannot expose a native failure.
      }
    }
  }
}

/**
 * Applies strict JSON grammar and duplicate-key semantics to already bounded bytes.
 * This is package-private so controlled remote schema bytes use the same boundary as local files.
 */
export function inspectStrictJsonBytes(bytes: Uint8Array): StrictJsonDocumentResult {
  if (hasUtf8Bom(bytes)) return issue("bom");

  let source: string;
  try {
    source = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
  } catch {
    return issue("invalid-utf8");
  }

  let parsedValue: unknown;
  try {
    parsedValue = JSON.parse(source);
  } catch (error) {
    return error instanceof SyntaxError ? issue("invalid-json") : UNAVAILABLE_DOCUMENT;
  }

  try {
    if (hasDecodedDuplicateKeys(source)) return issue("duplicate-key");
    finalizePrivateJsonValue(parsedValue);
    return valid(parsedValue);
  } catch {
    return UNAVAILABLE_DOCUMENT;
  }
}

function hasUtf8Bom(bytes: Uint8Array): boolean {
  return UTF8_BOM.every((byte, index) => bytes[index] === byte);
}

/** Sets object prototypes to null and freezes every container in the fresh, unexposed JSON.parse tree. */
function finalizePrivateJsonValue(parsedValue: unknown): asserts parsedValue is StrictJsonValue {
  const pendingValues: unknown[] = [parsedValue];
  while (pendingValues.length > 0) {
    const member = pendingValues.pop();
    const isJsonPrimitive =
      member === null ||
      typeof member === "boolean" ||
      typeof member === "number" ||
      typeof member === "string";
    if (isJsonPrimitive) continue;
    if (typeof member !== "object")
      throw new TypeError("Native JSON value has an unsupported member type.");
    if (!Array.isArray(member)) Object.setPrototypeOf(member, null);
    for (const child of Object.values(member)) pendingValues.push(child);
    Object.freeze(member);
  }
}

function issue(reason: JsonDocumentIssue): StrictJsonDocumentResult {
  return Object.freeze({ kind: "issue", reason });
}

function valid(jsonValue: StrictJsonValue): StrictJsonDocumentResult {
  return Object.freeze({ kind: "valid", jsonValue });
}

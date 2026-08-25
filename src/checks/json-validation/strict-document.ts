import { closeSync, fstatSync, openSync, readSync } from "node:fs";

import { parse, type ValueNode } from "@humanwhocodes/momoa";

export type JsonDocumentIssue =
  | "too-large"
  | "bom"
  | "invalid-utf8"
  | "invalid-json"
  | "duplicate-key";

/**
 * A strict JSON value retained only inside Product source boundaries.
 * Objects have a null prototype and every aggregate is frozen, so document keys cannot affect ambient prototypes.
 */
export type StrictJsonArray = readonly StrictJsonValue[];

export interface StrictJsonObject {
  readonly [key: string]: StrictJsonValue;
}

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

  let document: ReturnType<typeof parse>;
  try {
    document = parse(source, { allowTrailingCommas: false, mode: "json" });
  } catch (error) {
    return isMomoaSyntaxError(error) ? issue("invalid-json") : UNAVAILABLE_DOCUMENT;
  }

  try {
    if (hasDuplicateKey(document.body)) return issue("duplicate-key");
    return valid(toStrictJsonValue(document.body));
  } catch {
    return UNAVAILABLE_DOCUMENT;
  }
}

function isMomoaSyntaxError(error: unknown): boolean {
  return (
    error instanceof Error &&
    hasNumericOwnProperty(error, "line") &&
    hasNumericOwnProperty(error, "column") &&
    hasNumericOwnProperty(error, "offset")
  );
}

function hasNumericOwnProperty(error: object, propertyName: string): boolean {
  return typeof Object.getOwnPropertyDescriptor(error, propertyName)?.value === "number";
}

function hasUtf8Bom(bytes: Uint8Array): boolean {
  return UTF8_BOM.every((byte, index) => bytes[index] === byte);
}

function hasDuplicateKey(node: ValueNode): boolean {
  if (node.type === "Array") {
    return node.elements.some((element) => hasDuplicateKey(element.value));
  }
  if (node.type !== "Object") return false;

  const names = new Set<string>();
  for (const member of node.members) {
    if (member.name.type !== "String")
      throw new TypeError("strict JSON object member must be a string");
    if (names.has(member.name.value)) return true;
    names.add(member.name.value);
    if (hasDuplicateKey(member.value)) return true;
  }
  return false;
}

function toStrictJsonValue(node: ValueNode): StrictJsonValue {
  switch (node.type) {
    case "Null":
      return null;
    case "Boolean":
    case "Number":
    case "String":
      return node.value;
    case "Array":
      return Object.freeze(node.elements.map((element) => toStrictJsonValue(element.value)));
    case "Object": {
      const strictObject: Record<string, StrictJsonValue> = {};
      Object.setPrototypeOf(strictObject, null);
      for (const member of node.members) {
        if (member.name.type !== "String") {
          throw new TypeError("strict JSON object member must be a string");
        }
        Object.defineProperty(strictObject, member.name.value, {
          configurable: false,
          enumerable: true,
          value: toStrictJsonValue(member.value),
          writable: false
        });
      }
      return Object.freeze(strictObject);
    }
    case "Infinity":
    case "NaN":
      throw new TypeError("strict JSON value node must not be a non-finite number");
    default:
      throw new TypeError("strict JSON value node must be a standard JSON node");
  }
}

function issue(reason: JsonDocumentIssue): StrictJsonDocumentResult {
  return Object.freeze({ kind: "issue", reason });
}

function valid(jsonValue: StrictJsonValue): StrictJsonDocumentResult {
  return Object.freeze({ kind: "valid", jsonValue });
}

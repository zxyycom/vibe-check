import { closeSync, fstatSync, openSync, readSync } from "node:fs";

import { parse, type ValueNode } from "@humanwhocodes/momoa";

export type JsonDocumentIssue =
  | "too-large"
  | "bom"
  | "invalid-utf8"
  | "invalid-json"
  | "duplicate-key";

export type StrictJsonDocumentResult =
  | Readonly<{ readonly kind: "valid" }>
  | Readonly<{ readonly kind: "issue"; readonly reason: JsonDocumentIssue }>
  | Readonly<{ readonly kind: "unavailable" }>;

interface StrictJsonDocumentReadInput {
  readonly filePath: string;
  /** Normally validated at the Check options boundary; malformed private input becomes unavailable. */
  readonly maximumBytes: number;
}

const UTF8_BOM = [0xef, 0xbb, 0xbf] as const;
const VALID_DOCUMENT = Object.freeze({ kind: "valid" } as const);
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

function inspectStrictJsonBytes(bytes: Uint8Array): StrictJsonDocumentResult {
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
    return hasDuplicateKey(document.body) ? issue("duplicate-key") : VALID_DOCUMENT;
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

function hasNumericOwnProperty(value: object, key: string): boolean {
  return typeof Object.getOwnPropertyDescriptor(value, key)?.value === "number";
}

function hasUtf8Bom(bytes: Uint8Array): boolean {
  return UTF8_BOM.every((byte, index) => bytes[index] === byte);
}

function hasDuplicateKey(value: ValueNode): boolean {
  if (value.type === "Array") {
    return value.elements.some((element) => hasDuplicateKey(element.value));
  }
  if (value.type !== "Object") return false;

  const names = new Set<string>();
  for (const member of value.members) {
    if (member.name.type !== "String")
      throw new TypeError("strict JSON object member must be a string");
    if (names.has(member.name.value)) return true;
    names.add(member.name.value);
    if (hasDuplicateKey(member.value)) return true;
  }
  return false;
}

function issue(reason: JsonDocumentIssue): StrictJsonDocumentResult {
  return Object.freeze({ kind: "issue", reason });
}

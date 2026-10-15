import { createHash } from "node:crypto";

import type { RecordShape } from "./artifact-shapes.ts";

export function recordsFingerprint(records: readonly RecordShape[]): string | undefined {
  const text = canonicalJsonText(records);
  return text === undefined ? undefined : `check-record/v2/records/sha256:${digest(text)}`;
}

export function isCanonicalText(values: readonly string[]): boolean {
  let previous: string | undefined;
  for (const value of values) {
    if (previous !== undefined && previous >= value) return false;
    previous = value;
  }
  return true;
}

/**
 * Independently validates and serializes the canonical JSON subset used by published data.
 * This validator consumes parsed artifact values, so it cannot rely on Product runtime helpers.
 */
export function canonicalJsonText(value: unknown): string | undefined {
  try {
    const chunks: string[] = [];
    return serializeCanonicalJson(value, new Set<object>(), chunks) ? chunks.join("") : undefined;
  } catch {
    return undefined;
  }
}

function digest(text: string): string {
  return createHash("sha256").update(text).digest("hex");
}

function serializeCanonicalJson(value: unknown, ancestors: Set<object>, chunks: string[]): boolean {
  const primitive = serializeCanonicalPrimitive(value);
  if (primitive !== undefined) {
    chunks.push(primitive);
    return true;
  }
  if (value === null || typeof value !== "object") return false;
  if (ancestors.has(value)) return false;
  ancestors.add(value);
  try {
    return Array.isArray(value)
      ? serializeArray(value, ancestors, chunks)
      : serializeObject(value, ancestors, chunks);
  } finally {
    ancestors.delete(value);
  }
}

function serializeCanonicalPrimitive(value: unknown): string | undefined {
  if (value === null) return "null";
  if (typeof value === "boolean" || typeof value === "string") return JSON.stringify(value);
  if (typeof value !== "number" || !Number.isFinite(value)) return undefined;
  return JSON.stringify(Object.is(value, -0) ? 0 : value);
}

function serializeArray(
  value: readonly unknown[],
  ancestors: Set<object>,
  chunks: string[]
): boolean {
  if (Object.getPrototypeOf(value) !== Array.prototype) return false;
  if (Object.getOwnPropertySymbols(value).length > 0) return false;
  const names = Object.getOwnPropertyNames(value);
  if (
    names.length !== value.length + 1 ||
    names.some((name, index) => name !== `${index}` && name !== "length")
  ) {
    return false;
  }
  chunks.push("[");
  for (let index = 0; index < value.length; index += 1) {
    const descriptor = Object.getOwnPropertyDescriptor(value, `${index}`);
    if (descriptor === undefined || !Object.hasOwn(descriptor, "value")) return false;
    if (index > 0) chunks.push(",");
    if (!serializeCanonicalJson(descriptor.value, ancestors, chunks)) return false;
  }
  chunks.push("]");
  return true;
}

function serializeObject(value: object, ancestors: Set<object>, chunks: string[]): boolean {
  const keys = canonicalObjectKeys(value);
  if (keys === undefined) return false;
  chunks.push("{");
  let isFirstEntry = true;
  for (const key of keys) {
    const descriptor = Object.getOwnPropertyDescriptor(value, key);
    if (descriptor === undefined) return false;
    if (!Object.hasOwn(descriptor, "value")) return false;
    if (!isFirstEntry) chunks.push(",");
    isFirstEntry = false;
    chunks.push(JSON.stringify(key), ":");
    if (!serializeCanonicalJson(descriptor.value, ancestors, chunks)) return false;
  }
  chunks.push("}");
  return true;
}

/** Validates the object container and ordered keys before serializing its entries. */
function canonicalObjectKeys(value: object): readonly string[] | undefined {
  const prototype: unknown = Object.getPrototypeOf(value);
  if (prototype !== null && prototype !== Object.prototype) return undefined;
  if (Object.getOwnPropertySymbols(value).length > 0) return undefined;
  const keys = Object.keys(value).sort(compareText);
  if (keys.length !== Object.getOwnPropertyNames(value).length) return undefined;
  return keys;
}

function compareText(left: string, right: string): number {
  if (left < right) return -1;
  if (left > right) return 1;
  return 0;
}

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
    return serializeCanonicalJson(value, new Set<object>());
  } catch {
    return undefined;
  }
}

function digest(text: string): string {
  return createHash("sha256").update(text).digest("hex");
}

function serializeCanonicalJson(value: unknown, ancestors: Set<object>): string | undefined {
  if (value === null) return "null";
  if (typeof value === "boolean" || typeof value === "string") return JSON.stringify(value);
  if (typeof value === "number") {
    return Number.isFinite(value) ? JSON.stringify(Object.is(value, -0) ? 0 : value) : undefined;
  }
  if (typeof value !== "object") return undefined;
  if (ancestors.has(value)) return undefined;
  ancestors.add(value);
  try {
    return Array.isArray(value)
      ? serializeArray(value, ancestors)
      : serializeObject(value, ancestors);
  } finally {
    ancestors.delete(value);
  }
}

function serializeArray(value: readonly unknown[], ancestors: Set<object>): string | undefined {
  if (Object.getPrototypeOf(value) !== Array.prototype) return undefined;
  if (Object.getOwnPropertySymbols(value).length > 0) return undefined;
  const names = Object.getOwnPropertyNames(value);
  if (
    names.length !== value.length + 1 ||
    names.some((name, index) => name !== `${index}` && name !== "length")
  ) {
    return undefined;
  }
  const values: string[] = [];
  for (let index = 0; index < value.length; index += 1) {
    const descriptor = Object.getOwnPropertyDescriptor(value, `${index}`);
    if (descriptor === undefined || !Object.hasOwn(descriptor, "value")) return undefined;
    const text = serializeCanonicalJson(descriptor.value, ancestors);
    if (text === undefined) return undefined;
    values.push(text);
  }
  return `[${values.join(",")}]`;
}

function serializeObject(value: object, ancestors: Set<object>): string | undefined {
  const prototype: unknown = Object.getPrototypeOf(value);
  if (prototype !== null && prototype !== Object.prototype) return undefined;
  if (Object.getOwnPropertySymbols(value).length > 0) return undefined;
  const keys = Object.keys(value).sort(compareText);
  if (keys.length !== Object.getOwnPropertyNames(value).length) return undefined;
  const entries: string[] = [];
  for (const key of keys) {
    const descriptor = Object.getOwnPropertyDescriptor(value, key);
    if (descriptor === undefined || !Object.hasOwn(descriptor, "value")) return undefined;
    const text = serializeCanonicalJson(descriptor.value, ancestors);
    if (text === undefined) return undefined;
    entries.push(`${JSON.stringify(key)}:${text}`);
  }
  return `{${entries.join(",")}}`;
}

function compareText(left: string, right: string): number {
  if (left < right) return -1;
  if (left > right) return 1;
  return 0;
}

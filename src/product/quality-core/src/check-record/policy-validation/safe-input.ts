import { isProxy } from "node:util/types";

import type { JsonObject, JsonValue } from "../model.ts";
import type { ValidationResult } from "../validation.ts";
import { issue } from "./validation-helpers.ts";

const UNSAFE_POLICY_INPUT_MESSAGE = "Policy input must be plain JSON data";

class UnsafePolicyInputError extends TypeError {}

type PropertyDescriptors = Readonly<Record<PropertyKey, PropertyDescriptor>>;

function unsafe(): never {
  throw new UnsafePolicyInputError();
}

function materializeNumber(value: number): number {
  if (!Number.isFinite(value)) return unsafe();
  return value;
}

function assertPlainContainer(value: object, isArray: boolean): void {
  if (isProxy(value)) unsafe();
  const prototype = Object.getPrototypeOf(value) as object | null;
  if (!isArray && prototype !== Object.prototype && prototype !== null) unsafe();
}

function readDescriptors(value: object): readonly [PropertyDescriptors, readonly PropertyKey[]] {
  const descriptors = Object.getOwnPropertyDescriptors(value) as PropertyDescriptors;
  const keys = Reflect.ownKeys(descriptors);
  for (const key of keys) assertDataDescriptor(key, descriptors[key]!);
  return [descriptors, keys];
}

function assertDataDescriptor(key: PropertyKey, descriptor: PropertyDescriptor): void {
  if (typeof key === "symbol" || descriptor.get !== undefined || descriptor.set !== undefined) unsafe();
}

function readArrayLength(descriptors: PropertyDescriptors): number {
  const length = descriptors.length?.value as unknown;
  if (typeof length !== "number" || !Number.isSafeInteger(length) || length < 0) return unsafe();
  return length;
}

function materializeArrayEntries(
  descriptors: PropertyDescriptors,
  length: number,
  ancestors: Set<object>
): JsonValue[] {
  const entries: JsonValue[] = [];
  for (let index = 0; index < length; index += 1) {
    const descriptor = descriptors[String(index)];
    if (descriptor === undefined || descriptor.enumerable !== true) unsafe();
    entries.push(materializePlainData(descriptor.value as unknown, ancestors));
  }
  return entries;
}

function assertArrayKeys(keys: readonly PropertyKey[], length: number): void {
  const expectedKeys = new Set(["length", ...Array.from({ length }, (_, index) => String(index))]);
  if (keys.some((key) => typeof key !== "string" || !expectedKeys.has(key))) unsafe();
}

function materializeArray(
  descriptors: PropertyDescriptors,
  keys: readonly PropertyKey[],
  ancestors: Set<object>
): JsonValue[] {
  const length = readArrayLength(descriptors);
  const entries = materializeArrayEntries(descriptors, length, ancestors);
  assertArrayKeys(keys, length);
  return entries;
}

function materializeObject(
  descriptors: PropertyDescriptors,
  keys: readonly PropertyKey[],
  ancestors: Set<object>
): JsonObject {
  const snapshot: Record<string, JsonValue> = {};
  for (const key of keys) {
    if (typeof key !== "string") unsafe();
    const descriptor = descriptors[key]!;
    if (descriptor.enumerable !== true) unsafe();
    snapshot[key] = materializePlainData(descriptor.value as unknown, ancestors);
  }
  return snapshot;
}

function materializeContainer(value: object, ancestors: Set<object>): JsonValue {
  if (ancestors.has(value)) return unsafe();
  const isArray = Array.isArray(value);
  assertPlainContainer(value, isArray);
  const [descriptors, keys] = readDescriptors(value);
  ancestors.add(value);
  try {
    return isArray
      ? materializeArray(descriptors, keys, ancestors)
      : materializeObject(descriptors, keys, ancestors);
  } finally {
    ancestors.delete(value);
  }
}

function materializePlainData(value: unknown, ancestors: Set<object>): JsonValue {
  if (value === null || typeof value === "boolean" || typeof value === "string") return value;
  if (typeof value === "number") return materializeNumber(value);
  if (typeof value !== "object") return unsafe();
  return materializeContainer(value, ancestors);
}

export function safePolicyInput(value: unknown): ValidationResult<JsonValue> {
  try {
    return Object.freeze({ ok: true, value: materializePlainData(value, new Set()) });
  } catch {
    return issue("$", "invalid-value", UNSAFE_POLICY_INPUT_MESSAGE);
  }
}

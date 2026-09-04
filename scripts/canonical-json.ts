export type CanonicalScriptJsonValue =
  | boolean
  | null
  | number
  | string
  | CanonicalScriptJsonObject
  | readonly CanonicalScriptJsonValue[];

/** A detached, immutable JSON object suitable for scripts-owned machine facts. */
export interface CanonicalScriptJsonObject {
  readonly [key: string]: CanonicalScriptJsonValue;
}

/**
 * Materializes untrusted script data without property reads or JSON hooks.
 * The returned value has only finite JSON primitives, plain containers, and
 * immutable own data properties, so a later Record publication cannot observe
 * provider mutation after this preflight boundary.
 */
export function canonicalizeScriptJsonObject(
  value: unknown
): CanonicalScriptJsonObject | undefined {
  try {
    const canonical = canonicalizeScriptJsonValue(value, new Set<object>());
    return isCanonicalScriptJsonObject(canonical) ? canonical : undefined;
  } catch {
    return undefined;
  }
}

function canonicalizeScriptJsonValue(
  value: unknown,
  ancestors: Set<object>
): CanonicalScriptJsonValue | undefined {
  if (value === null || typeof value === "boolean" || typeof value === "string") return value;
  if (typeof value === "number") {
    if (!Number.isFinite(value)) return undefined;
    return Object.is(value, -0) ? 0 : value;
  }
  if (typeof value !== "object" || ancestors.has(value)) return undefined;

  ancestors.add(value);
  try {
    return Array.isArray(value)
      ? canonicalizeScriptJsonArray(value, ancestors)
      : canonicalizeScriptJsonRecord(value, ancestors);
  } finally {
    ancestors.delete(value);
  }
}

function canonicalizeScriptJsonArray(
  value: readonly unknown[],
  ancestors: Set<object>
): readonly CanonicalScriptJsonValue[] | undefined {
  const length = exactArrayLength(value);
  if (length === undefined) return undefined;

  const items: CanonicalScriptJsonValue[] = [];
  for (let index = 0; index < length; index += 1) {
    const descriptor = Object.getOwnPropertyDescriptor(value, String(index));
    if (!isEnumerableDataDescriptor(descriptor)) return undefined;
    const item = canonicalizeScriptJsonValue(descriptor.value, ancestors);
    if (item === undefined) return undefined;
    items.push(item);
  }
  return Object.freeze(items);
}

function exactArrayLength(value: readonly unknown[]): number | undefined {
  if (Object.getPrototypeOf(value) !== Array.prototype) return undefined;
  const length = declaredArrayLength(value);
  if (length === undefined) return undefined;
  const keys = Reflect.ownKeys(value);
  if (keys.length !== length + 1 || !keys.includes("length")) return undefined;
  return length;
}

function declaredArrayLength(value: readonly unknown[]): number | undefined {
  const descriptor = Object.getOwnPropertyDescriptor(value, "length");
  if (!isDataDescriptor(descriptor) || descriptor.enumerable) return undefined;
  const length = descriptor.value;
  return typeof length === "number" && Number.isSafeInteger(length) && length >= 0
    ? length
    : undefined;
}

function canonicalizeScriptJsonRecord(
  value: object,
  ancestors: Set<object>
): CanonicalScriptJsonObject | undefined {
  const prototype: unknown = Object.getPrototypeOf(value);
  if (prototype !== Object.prototype && prototype !== null) return undefined;

  const keys: string[] = [];
  for (const key of Reflect.ownKeys(value)) {
    if (typeof key !== "string") return undefined;
    keys.push(key);
  }

  const snapshot: Record<string, CanonicalScriptJsonValue> = {};
  Object.setPrototypeOf(snapshot, null);
  for (const key of keys.sort()) {
    const descriptor = Object.getOwnPropertyDescriptor(value, key);
    if (!isEnumerableDataDescriptor(descriptor)) return undefined;
    const item = canonicalizeScriptJsonValue(descriptor.value, ancestors);
    if (item === undefined) return undefined;
    Object.defineProperty(snapshot, key, {
      configurable: false,
      enumerable: true,
      value: item,
      writable: false
    });
  }
  return Object.freeze(snapshot);
}

type DataDescriptor = Omit<PropertyDescriptor, "get" | "set" | "value"> &
  Readonly<{ readonly get?: undefined; readonly set?: undefined; readonly value: unknown }>;

function isDataDescriptor(
  descriptor: PropertyDescriptor | undefined
): descriptor is DataDescriptor {
  return (
    descriptor !== undefined &&
    descriptor.get === undefined &&
    descriptor.set === undefined &&
    Object.hasOwn(descriptor, "value")
  );
}

function isEnumerableDataDescriptor(
  descriptor: PropertyDescriptor | undefined
): descriptor is DataDescriptor {
  return isDataDescriptor(descriptor) && descriptor.enumerable === true;
}

function isCanonicalScriptJsonObject(
  value: CanonicalScriptJsonValue | undefined
): value is CanonicalScriptJsonObject {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

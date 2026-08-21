export type CanonicalJsonPrimitive = boolean | null | number | string;
export type CanonicalJsonValue =
  | CanonicalJsonPrimitive
  | readonly CanonicalJsonValue[]
  | CanonicalJsonObject;

export interface CanonicalJsonObject {
  readonly [key: string]: CanonicalJsonValue;
}

/**
 * Materializes arbitrary author data without property reads or JSON hooks.
 * The returned graph is detached, prototype-safe, and deeply frozen before it
 * becomes a Core fact. Canonical text order is applied explicitly at serialization.
 */
export function canonicalizeJsonObject(value: unknown): CanonicalJsonObject | undefined {
  const canonical = canonicalize(value, new Set<object>());
  return canonical !== undefined && isCanonicalJsonObject(canonical) ? canonical : undefined;
}

export function canonicalizeJsonValue(value: unknown): CanonicalJsonValue | undefined {
  return canonicalize(value, new Set<object>());
}

/** Serializes detached canonical JSON with explicit lexical object-key ordering. */
export function canonicalJsonText(value: unknown): string {
  const canonical = canonicalizeJsonValue(value);
  if (canonical === undefined) {
    throw new TypeError("Canonical JSON could not safely materialize the input");
  }
  return canonicalText(canonical);
}

function canonicalize(value: unknown, ancestors: Set<object>): CanonicalJsonValue | undefined {
  if (value === null || typeof value === "boolean" || typeof value === "string") return value;
  if (typeof value === "number") {
    if (!Number.isFinite(value)) return undefined;
    return Object.is(value, -0) ? 0 : value;
  }
  if (typeof value !== "object") return undefined;
  if (ancestors.has(value)) return undefined;

  ancestors.add(value);
  try {
    return Array.isArray(value)
      ? canonicalizeArray(value, ancestors)
      : canonicalizeObject(value, ancestors);
  } catch {
    return undefined;
  } finally {
    ancestors.delete(value);
  }
}

function canonicalizeArray(
  value: readonly unknown[],
  ancestors: Set<object>
): readonly CanonicalJsonValue[] | undefined {
  if (Object.getPrototypeOf(value) !== Array.prototype) return undefined;
  const keys = Reflect.ownKeys(value);
  const lengthDescriptor = Object.getOwnPropertyDescriptor(value, "length");
  if (!isDataDescriptor(lengthDescriptor) || lengthDescriptor.enumerable) return undefined;
  const length = lengthDescriptor.value as unknown;
  if (
    typeof length !== "number" ||
    !Number.isSafeInteger(length) ||
    length < 0 ||
    keys.length !== length + 1
  )
    return undefined;
  if (!keys.includes("length")) return undefined;

  const values: CanonicalJsonValue[] = [];
  for (let index = 0; index < length; index += 1) {
    const key = String(index);
    const descriptor = Object.getOwnPropertyDescriptor(value, key);
    if (!isEnumerableDataDescriptor(descriptor)) return undefined;
    const item = canonicalize(descriptor.value as unknown, ancestors);
    if (item === undefined) return undefined;
    values.push(item);
  }
  return Object.freeze(values);
}

function canonicalizeObject(
  value: object,
  ancestors: Set<object>
): CanonicalJsonObject | undefined {
  const prototype: unknown = Object.getPrototypeOf(value);
  if (prototype !== Object.prototype && prototype !== null) return undefined;
  const keys: string[] = [];
  for (const key of Reflect.ownKeys(value)) {
    if (typeof key !== "string") return undefined;
    keys.push(key);
  }

  const snapshot: Record<string, CanonicalJsonValue> = {};
  Object.setPrototypeOf(snapshot, null);
  for (const key of keys.sort(compareText)) {
    const descriptor = Object.getOwnPropertyDescriptor(value, key);
    if (!isEnumerableDataDescriptor(descriptor)) return undefined;
    const item = canonicalize(descriptor.value as unknown, ancestors);
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

function isDataDescriptor(
  descriptor: PropertyDescriptor | undefined
): descriptor is PropertyDescriptor {
  return descriptor !== undefined && descriptor.get === undefined && descriptor.set === undefined;
}

function isEnumerableDataDescriptor(
  descriptor: PropertyDescriptor | undefined
): descriptor is PropertyDescriptor {
  return isDataDescriptor(descriptor) && descriptor.enumerable === true;
}

function isCanonicalJsonObject(value: CanonicalJsonValue): value is CanonicalJsonObject {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function canonicalText(value: CanonicalJsonValue): string {
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (isCanonicalJsonArray(value)) {
    return `[${value.map((entry) => canonicalText(entry)).join(",")}]`;
  }
  return `{${Object.keys(value)
    .sort(compareText)
    .map((key) => `${JSON.stringify(key)}:${canonicalText(value[key])}`)
    .join(",")}}`;
}

function isCanonicalJsonArray(value: CanonicalJsonValue): value is readonly CanonicalJsonValue[] {
  return Array.isArray(value);
}

function compareText(left: string, right: string): number {
  if (left < right) return -1;
  if (left > right) return 1;
  return 0;
}

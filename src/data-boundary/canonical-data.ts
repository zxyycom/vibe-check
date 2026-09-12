import type { CanonicalJsonObject, CanonicalJsonValue } from "./canonical-json.ts";

export type {
  CanonicalJsonObject,
  CanonicalJsonPrimitive,
  CanonicalJsonValue
} from "./canonical-json.ts";

const encoder = new TextEncoder();

/**
 * 将任意输入安全 materialize 为 detached、deep-frozen 的 canonical JSON object。
 *
 * 用于需要 object payload 的本地 identity、evidence 或持久化边界。只接受普通/null-prototype
 * object、标准 dense array、有限 JSON primitive；不会调用 getter 或 `toJSON`。无效输入、cycle
 * 或反射失败返回 `undefined`；Proxy trap 仍可能在反射期间执行，因此 hostile Proxy 不是无副作用边界。
 */
export function canonicalizeJsonObject(value: unknown): CanonicalJsonObject | undefined {
  const canonical = canonicalize(value, new Set<object>());
  return canonical !== undefined && isCanonicalJsonObject(canonical) ? canonical : undefined;
}

/**
 * 将任意输入安全 materialize 为 detached、deep-frozen 的 canonical JSON value。
 *
 * 成功结果将 `-0` 规范化为 `0`；拒绝 accessor、`toJSON` hook、sparse array、非 enumerable own
 * property、非有限 number 和不支持的 prototype。失败返回 `undefined`，不以 TypeScript 类型断言代替
 * runtime materialization。
 */
export function canonicalizeJsonValue(value: unknown): CanonicalJsonValue | undefined {
  return canonicalize(value, new Set<object>());
}

/**
 * 将安全 materialize 后的 JSON 输出为确定性的无空白文本。
 *
 * object key 使用当前实现的 lexical `<` 顺序（不是外部 canonical-JSON 标准承诺）；无效输入抛
 * `TypeError`。适合稳定的本地 identity 或审计文本，不为 secret 提供保护。
 */
export function canonicalJsonText(value: unknown): string {
  const canonical = canonicalizeJsonValue(value);
  if (canonical === undefined) {
    throw new TypeError("Canonical JSON could not safely materialize the input");
  }
  return canonicalText(canonical);
}

/**
 * 以 UTF-8 bytes 输出与 `canonicalJsonText` 相同的确定性 JSON。
 *
 * 无效输入抛 `TypeError`；可作为 hash 或二进制持久化输入，但不提供签名、认证或保密性。
 */
export function canonicalJsonBytes(value: unknown): Uint8Array {
  return encoder.encode(canonicalJsonText(value));
}

function canonicalize(value: unknown, ancestors: Set<object>): CanonicalJsonValue | undefined {
  if (value === null) return null;
  const primitive = canonicalPrimitive(value);
  if (primitive !== undefined) return primitive;
  if (typeof value !== "object") return undefined;
  if (!admitCanonicalObject(value, ancestors)) return undefined;

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

function canonicalPrimitive(value: unknown): CanonicalJsonValue | undefined {
  if (typeof value === "boolean" || typeof value === "string") return value;
  if (typeof value !== "number" || !Number.isFinite(value)) return undefined;
  return Object.is(value, -0) ? 0 : value;
}

function admitCanonicalObject(value: object, ancestors: Set<object>): boolean {
  if (ancestors.has(value)) return false;
  ancestors.add(value);
  return true;
}

function canonicalizeArray(
  value: readonly unknown[],
  ancestors: Set<object>
): readonly CanonicalJsonValue[] | undefined {
  const length = denseCanonicalArrayLength(value);
  if (length === undefined) return undefined;
  return canonicalArrayElements(value, length, ancestors);
}

function denseCanonicalArrayLength(value: readonly unknown[]): number | undefined {
  if (Object.getPrototypeOf(value) !== Array.prototype) return undefined;
  const keys = Reflect.ownKeys(value);
  const lengthDescriptor = Object.getOwnPropertyDescriptor(value, "length");
  if (!isDataDescriptor(lengthDescriptor) || lengthDescriptor.enumerable === true) return undefined;
  const length = lengthDescriptor.value;
  if (
    typeof length !== "number" ||
    !Number.isSafeInteger(length) ||
    length < 0 ||
    keys.length !== length + 1
  )
    return undefined;
  if (!keys.includes("length")) return undefined;
  return length;
}

function canonicalArrayElements(
  value: readonly unknown[],
  length: number,
  ancestors: Set<object>
): readonly CanonicalJsonValue[] | undefined {
  const values: CanonicalJsonValue[] = [];
  for (let index = 0; index < length; index += 1) {
    const key = String(index);
    const descriptor = Object.getOwnPropertyDescriptor(value, key);
    if (!isEnumerableDataDescriptor(descriptor)) return undefined;
    const item = canonicalize(descriptor.value, ancestors);
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
    const item = canonicalize(descriptor.value, ancestors);
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
  Readonly<{
    value: unknown;
  }>;

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
    .map((key) => {
      const entry = value[key];
      if (entry === undefined) {
        throw new TypeError(`Canonical JSON object is missing declared key: ${key}`);
      }
      return `${JSON.stringify(key)}:${canonicalText(entry)}`;
    })
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

import type { CanonicalJsonObject, CanonicalJsonValue } from "./canonical-json.ts";

export type {
  CanonicalJsonObject,
  CanonicalJsonPrimitive,
  CanonicalJsonValue
} from "./canonical-json.ts";

const encoder = new TextEncoder();

/**
 * 将输入规范化为独立、递归冻结的 canonical JSON object 副本。
 *
 * 只接受普通/null-prototype object、标准 dense array、有限 JSON primitive；输出中的每个 object 都是
 * null-prototype，所有输出 object/array container 都是 detached、deep-frozen。不会调用 getter 或
 * `toJSON`。无效输入、cycle 或反射失败返回 `undefined`；Proxy trap 仍可能在反射期间执行。
 */
export function canonicalizeJsonObject(value: unknown): CanonicalJsonObject | undefined {
  const canonical = canonicalize(value, new Set<object>());
  return canonical !== undefined && isCanonicalJsonObject(canonical) ? canonical : undefined;
}

/**
 * 将输入规范化为独立、递归冻结的 canonical JSON value 副本。
 *
 * 成功结果将 `-0` 规范化为 `0`，并以 null-prototype object 与 deep-frozen container 输出；拒绝
 * accessor、`toJSON` hook、sparse array、非 enumerable own property、非有限 number 和不支持的
 * prototype。`CanonicalJsonPrimitive` 的 `number` 在静态上仍可表示 `NaN`，只有 runtime materialization
 * 检查有限值。失败返回 `undefined`，不以 TypeScript 类型断言代替 runtime materialization。
 */
export function canonicalizeJsonValue(value: unknown): CanonicalJsonValue | undefined {
  return canonicalize(value, new Set<object>());
}

/**
 * 直接规范化输入并生成确定性的无空白 JSON 文本。
 *
 * object key 使用固定 lexical `<` 顺序（不是外部 canonical-JSON 标准承诺）；即使同一 canonical object，
 * `JSON.stringify` 仍会按 ECMAScript 的 integer-index key 顺序输出，因而不保证与本 helper 文本相同。
 * 无效输入抛 `TypeError`。
 */
export function canonicalJsonText(value: unknown): string {
  const canonical = canonicalizeJsonValue(value);
  if (canonical === undefined) {
    throw new TypeError("Canonical JSON could not safely materialize the input");
  }
  return canonicalText(canonical);
}

/**
 * 直接规范化输入并生成与 `canonicalJsonText` 相同的确定性 UTF-8 JSON bytes。
 *
 * 此 helper 自行执行相同的 materialization 与固定 lexical key 排序，而非要求调用方先传入 canonical value；
 * 无效输入抛 `TypeError`。
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

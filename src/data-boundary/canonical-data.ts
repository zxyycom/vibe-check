import type { CanonicalJsonObject, CanonicalJsonValue } from "./canonical-json.ts";

export type {
  CanonicalJsonObject,
  CanonicalJsonPrimitive,
  CanonicalJsonValue
} from "./canonical-json.ts";

const encoder = new TextEncoder();

/**
 * 将输入规范化为独立且递归冻结的 canonical JSON 对象副本。
 *
 * 递归内容只接受普通对象或 null-prototype 对象、标准无空洞数组和有限 JSON 基本值；仅当顶层结果是
 * 非数组对象时返回该副本。输出对象使用 null prototype，输出对象和数组均独立于输入且递归冻结。不调用
 * getter 或 `toJSON`；无效输入、循环引用或反射失败返回 `undefined`。反射 Proxy 时仍可能执行其 trap，
 * 不隔离 trap 的副作用。
 */
export function canonicalizeJsonObject(value: unknown): CanonicalJsonObject | undefined {
  const canonical = canonicalize(value, new Set<object>());
  return canonical !== undefined && isCanonicalJsonObject(canonical) ? canonical : undefined;
}

/**
 * 将输入规范化为独立且递归冻结的 canonical JSON 值副本。
 *
 * 接受 `null`、boolean、string、有限 number、普通对象或 null-prototype 对象，以及标准无空洞数组；
 * `-0` 转换为 `0`，输出对象使用 null prototype。拒绝存取器、稀疏数组、不可枚举的自有属性、非有限
 * number 和其它 prototype。不调用 getter 或 `toJSON`；无效输入、循环引用或反射失败返回 `undefined`。
 * 反射 Proxy 时仍可能执行其 trap，不隔离 trap 的副作用。`CanonicalJsonPrimitive` 的 `number` 在
 * TypeScript 中仍可表示 `NaN`，有限性只能由本函数在运行时检查。
 */
export function canonicalizeJsonValue(value: unknown): CanonicalJsonValue | undefined {
  return canonicalize(value, new Set<object>());
}

/**
 * 规范化输入后生成确定性的无额外空白 JSON 文本。
 *
 * 对象键按固定的 lexical `<` 顺序输出，不承诺遵循外部 canonical-JSON 标准。即使同一对象已经过
 * 规范化，`JSON.stringify` 仍按 ECMAScript 的整数索引键顺序输出，不能替代本函数。输入规则与 Proxy
 * 边界同 `canonicalizeJsonValue`；无效输入或无法反射的 Proxy 均抛出 `TypeError`。
 */
export function canonicalJsonText(value: unknown): string {
  const canonical = canonicalizeJsonValue(value);
  if (canonical === undefined) {
    throw new TypeError("Canonical JSON could not safely materialize the input");
  }
  return canonicalText(canonical);
}

/**
 * 规范化输入后生成与 `canonicalJsonText` 相同的确定性 UTF-8 JSON 字节。
 *
 * 函数自行完成规范化与固定键排序，不要求调用方先取得 canonical JSON 值。输入规则、Proxy 边界和
 * `TypeError` 失败方式与 `canonicalJsonText` 相同。
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

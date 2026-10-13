interface OwnDataShape {
  readonly descriptors: Readonly<Record<string, PropertyDescriptor>>;
  readonly keys: readonly string[];
}

function ownDataShape(value: object): OwnDataShape | undefined {
  const descriptors: Readonly<Record<string, PropertyDescriptor>> =
    Object.getOwnPropertyDescriptors(value);
  const ownKeys = Reflect.ownKeys(descriptors);
  const keys: string[] = [];
  for (const key of ownKeys) {
    if (typeof key !== "string") return undefined;
    keys.push(key);
  }
  if (
    keys.some((key) => {
      const descriptor = descriptors[key];
      if (descriptor === undefined) return true;
      return descriptor.get !== undefined || descriptor.set !== undefined;
    })
  )
    return undefined;
  return { descriptors, keys };
}

export function snapshotPlainRecord(value: unknown): Readonly<Record<string, unknown>> | undefined {
  try {
    if (value === null || typeof value !== "object" || Array.isArray(value)) {
      return undefined;
    }
    const prototype: unknown = Object.getPrototypeOf(value);
    if (prototype !== Object.prototype && prototype !== null) {
      return undefined;
    }
    const descriptors: Readonly<Record<string, PropertyDescriptor>> =
      Object.getOwnPropertyDescriptors(value);
    if (
      Object.values(descriptors).some(
        (descriptor) => descriptor.get !== undefined || descriptor.set !== undefined
      )
    ) {
      return undefined;
    }
    return Object.fromEntries(
      Object.entries(descriptors)
        .filter(([, descriptor]) => descriptor.enumerable === true)
        .map(([key, descriptor]) => [key, descriptor.value as unknown])
    );
  } catch {
    return undefined;
  }
}

export function snapshotClosedRecord(
  value: unknown
): Readonly<Record<string, unknown>> | undefined {
  try {
    if (value === null || typeof value !== "object" || Array.isArray(value)) return undefined;
    const prototype: unknown = Object.getPrototypeOf(value);
    if (prototype !== Object.prototype && prototype !== null) return undefined;
    const shape = ownDataShape(value);
    if (
      shape === undefined ||
      shape.keys.some((key) => shape.descriptors[key]?.enumerable !== true)
    ) {
      return undefined;
    }
    const entries = shape.keys.map((key) => {
      const descriptor = shape.descriptors[key];
      if (descriptor === undefined) throw new TypeError(`Missing own descriptor: ${key}`);
      return [key, descriptor.value as unknown] as const;
    });
    return Object.freeze(Object.fromEntries(entries));
  } catch {
    return undefined;
  }
}

/**
 * 取得字段集合恰好匹配调用方字段表的闭合普通记录外层浅快照。
 *
 * 输入必须是使用 `Object.prototype` 或 null prototype 的非数组对象，且每个自有属性都是可枚举数据属性。
 * 调用方持有的 `keys` 必须是稳定、无重复的字符串列表；缺字段、多字段、symbol 键、存取器或不可枚举属性
 * 均返回 `undefined`。成功结果是使用 `Object.prototype` 的冻结浅副本：只固定外层字段，保留 callback、
 * `undefined` 与嵌套对象或数组的原引用，调用方仍须逐字段验证。这不是 JSON 验证器；不调用 getter，
 * 但反射 Proxy 可能执行其 trap，反射失败时返回 `undefined`。
 */
export function snapshotExactClosedRecord(
  value: unknown,
  keys: readonly string[]
): Readonly<Record<string, unknown>> | undefined {
  const record = snapshotClosedRecord(value);
  return record !== undefined && hasExactPlainRecordKeys(record, keys) ? record : undefined;
}

function closedArrayLength(shape: OwnDataShape): number | undefined {
  const descriptor = shape.descriptors.length;
  if (typeof descriptor?.value !== "number" || descriptor.enumerable !== false) return undefined;
  const length = descriptor.value;
  return Number.isSafeInteger(length) && length >= 0 && shape.keys.length === length + 1
    ? length
    : undefined;
}

function closedArrayItems(shape: OwnDataShape, length: number): readonly unknown[] | undefined {
  const items: unknown[] = [];
  for (let index = 0; index < length; index += 1) {
    const descriptor = shape.descriptors[String(index)];
    if (descriptor?.enumerable !== true) return undefined;
    items.push(descriptor.value as unknown);
  }
  return Object.freeze(items);
}

/**
 * 取得标准无空洞数组的外层浅快照。
 *
 * 输入必须使用 `Array.prototype`，除标准 `length` 和可枚举索引外没有其它自有属性，也不能包含存取器；
 * 稀疏数组、额外属性或其它不符合条件的输入返回 `undefined`。成功结果是冻结浅副本，只固定数组结构，
 * 保留 callback、`undefined` 与嵌套值的原引用，不检查元素的业务类型或 JSON 合法性。不调用存取器，
 * 但反射 Proxy 可能执行其 trap，反射失败时返回 `undefined`。
 */
export function snapshotClosedArray(value: unknown): readonly unknown[] | undefined {
  try {
    if (!Array.isArray(value) || Object.getPrototypeOf(value) !== Array.prototype) return undefined;
    const shape = ownDataShape(value);
    if (shape === undefined) return undefined;
    const length = closedArrayLength(shape);
    return length === undefined ? undefined : closedArrayItems(shape, length);
  } catch {
    return undefined;
  }
}

export function hasExactPlainRecordKeys(
  value: Readonly<Record<string, unknown>>,
  keys: readonly string[]
): boolean {
  const actualKeys = Object.keys(value);
  return actualKeys.length === keys.length && actualKeys.every((key) => keys.includes(key));
}

export function hasRequiredAndOptionalRecordKeys(
  value: Readonly<Record<string, unknown>>,
  keys: Readonly<{
    readonly optional: readonly string[];
    readonly required: readonly string[];
  }>
): boolean {
  const supportedKeys = new Set([...keys.required, ...keys.optional]);
  return (
    keys.required.every((key) => Object.hasOwn(value, key)) &&
    Object.keys(value).every((key) => supportedKeys.has(key))
  );
}

export interface ClosedPolicyRecordKeys {
  readonly optional?: readonly string[];
  readonly required?: readonly string[];
}

/** Snapshots an authoring record whose keys are limited to one required/optional policy. */
export function snapshotClosedPolicyRecord(
  value: unknown,
  keys: ClosedPolicyRecordKeys
): Readonly<Record<string, unknown>> | undefined {
  const record = snapshotClosedRecord(value);
  return record !== undefined &&
    hasRequiredAndOptionalRecordKeys(record, {
      optional: keys.optional ?? [],
      required: keys.required ?? []
    })
    ? record
    : undefined;
}

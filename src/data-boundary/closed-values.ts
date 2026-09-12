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
 * 快照一个 key 集合恰好匹配 caller grammar 的闭合 plain record。
 *
 * 输入必须是 Object/null-prototype 的 non-array object，所有 own key 都是 enumerable data property；
 * accessor、额外/缺失 key、非 enumerable key 和反射失败返回 `undefined`。返回 container 是冻结的浅
 * snapshot：嵌套值不会被复制、冻结或 canonicalize，调用方仍须逐字段验证。`keys` 应是 caller-owned
 * 的稳定 string list。
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
 * 快照一个标准 dense array，供调用方逐项验证 untrusted parsed data。
 *
 * array 必须使用 `Array.prototype`，且没有 sparse hole、额外 own key 或 accessor；失败返回 `undefined`。
 * 返回 array 是冻结的浅 snapshot，元素不会被复制、冻结或 canonicalize。
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

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
      shape.keys.some((key) => shape.descriptors[key].enumerable !== true)
    ) {
      return undefined;
    }
    return Object.freeze(
      Object.fromEntries(shape.keys.map((key) => [key, shape.descriptors[key].value as unknown]))
    );
  } catch {
    return undefined;
  }
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
    if (descriptor === undefined || descriptor.enumerable !== true) return undefined;
    items.push(descriptor.value as unknown);
  }
  return Object.freeze(items);
}

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

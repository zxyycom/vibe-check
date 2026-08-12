export function snapshotPlainRecord(
  value: unknown
): Readonly<Record<string, unknown>> | undefined {
  try {
    if (value === null || typeof value !== "object" || Array.isArray(value)) {
      return undefined;
    }
    const prototype = Object.getPrototypeOf(value) as object | null;
    if (prototype !== Object.prototype && prototype !== null) {
      return undefined;
    }
    const descriptors = Object.getOwnPropertyDescriptors(value) as Readonly<
      Record<string, PropertyDescriptor>
    >;
    if (Object.values(descriptors).some((descriptor) => (
      descriptor.get !== undefined || descriptor.set !== undefined
    ))) {
      return undefined;
    }
    return Object.fromEntries(Object.entries(descriptors)
      .filter(([, descriptor]) => descriptor.enumerable === true)
      .map(([key, descriptor]) => [key, descriptor.value as unknown]));
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

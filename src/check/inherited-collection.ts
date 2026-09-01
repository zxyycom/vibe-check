const INHERITED_CHECK_COLLECTION: unique symbol = Symbol("vibe-check.inherited-check-collection");

/** 使用 {@link inherit} 对父 Check 的 string collection 做显式增删的输入。 */
export type InheritCheckCollectionInput<T> = Readonly<
  | { readonly add: readonly T[]; readonly remove?: readonly T[] }
  | { readonly add?: readonly T[]; readonly remove: readonly T[] }
>;

/**
 * 由 {@link inherit} 创建、带有不可伪造 marker 的 collection edit。
 *
 * @remarks Definition validation 不接受看起来相同的 plain object。
 */
export type InheritedCheckCollection<T> = InheritCheckCollectionInput<T> &
  Readonly<{
    readonly [INHERITED_CHECK_COLLECTION]: true;
  }>;

/**
 * 可以直接替换父 collection 的数组，或由 {@link inherit} 表示的显式 edit。
 *
 * @typeParam T - collection item 类型。
 */
export type InheritableCheckCollection<T> = readonly T[] | InheritedCheckCollection<T>;

const inheritedCollections = new WeakSet();

type InheritedCollectionEntry = "data" | "invalid" | "marker";

/**
 * 创建可用于 `dependsOn`、`observes` 或 `mutex` 的受信任继承编辑。
 *
 * @typeParam T - 要添加或移除的 collection item 类型。
 * @param value - 至少提供 `add` 或 `remove` 的 edit；空数组可显式表示不添加或不移除。
 * @returns 只有此函数创建的值会被 Definition validation 识别为 inherited collection。
 */
export function inherit<T>(value: InheritCheckCollectionInput<T>): InheritedCheckCollection<T> {
  const result = { ...value, [INHERITED_CHECK_COLLECTION]: true as const };
  Object.defineProperty(result, INHERITED_CHECK_COLLECTION, { enumerable: false });
  inheritedCollections.add(result);
  return result;
}

export function isInheritedCheckCollection(
  value: unknown
): value is InheritedCheckCollection<unknown> {
  return typeof value === "object" && value !== null && inheritedCollections.has(value);
}

/** Copies the trusted marker while preserving the authoring data's closed shape. */
export function snapshotInheritedCheckCollection(
  value: InheritedCheckCollection<unknown>
): Readonly<Record<string, unknown>> | undefined {
  try {
    if (!hasPlainObjectPrototype(value)) return undefined;
    const snapshot: Record<string, unknown> = {};
    let hasMarker = false;
    for (const key of Reflect.ownKeys(value)) {
      const entry = snapshotInheritedCollectionEntry(
        snapshot,
        key,
        Object.getOwnPropertyDescriptor(value, key)
      );
      if (entry === "invalid") return undefined;
      if (entry === "marker") hasMarker = true;
    }
    return hasMarker ? Object.freeze(snapshot) : undefined;
  } catch {
    return undefined;
  }
}

function hasPlainObjectPrototype(value: object): boolean {
  const prototype: unknown = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

function snapshotInheritedCollectionEntry(
  snapshot: Record<string, unknown>,
  key: PropertyKey,
  descriptor: PropertyDescriptor | undefined
): InheritedCollectionEntry {
  if (!isDataDescriptor(descriptor)) return "invalid";
  if (key === INHERITED_CHECK_COLLECTION) {
    return descriptor.enumerable || descriptor.value !== true ? "invalid" : "marker";
  }
  if (typeof key !== "string" || descriptor.enumerable !== true) return "invalid";
  Object.defineProperty(snapshot, key, {
    configurable: true,
    enumerable: true,
    value: descriptor.value,
    writable: true
  });
  return "data";
}

function isDataDescriptor(
  descriptor: PropertyDescriptor | undefined
): descriptor is PropertyDescriptor {
  return descriptor !== undefined && descriptor.get === undefined && descriptor.set === undefined;
}

import { snapshotClosedArray, snapshotClosedPolicyRecord } from "./closed-values.ts";

/** 业务参数与最后一个框架 context 分开的 callback 存储接口。原始 descriptor 不推断能力。 */
export type ContextCallbackInput<Args extends readonly unknown[], Context, Result> =
  | ((this: void, ...args: [...Args, Readonly<Record<never, never>>]) => Result)
  | Readonly<{
      readonly contextNeeds?: readonly (keyof Context)[] | undefined;
      readonly callback: (this: void, ...args: [...Args, never]) => Result;
    }>;

type GuaranteedNeed<N extends readonly PropertyKey[], K> = number extends N["length"]
  ? never
  : [N] extends [readonly [infer H, ...infer T]]
    ? [H] extends [K]
      ? K
      : [T] extends [readonly PropertyKey[]]
        ? GuaranteedNeed<T, K>
        : never
    : never;

/** 只保证所有可能声明在确定 tuple 位置共同要求的字段；宽化数组不保证字段。 */
export type SelectedCallbackContext<C, N extends readonly (keyof C)[]> = Readonly<
  Pick<C, { [K in keyof C]: GuaranteedNeed<N, K> }[keyof C]>
>;

/** helper 保留的精确 descriptor；直接调用时由调用方提供业务输入及所选 context。 */
export type DeclaredContextCallback<
  Args extends readonly unknown[],
  Context,
  Needs extends readonly (keyof Context)[],
  Result
> = Readonly<{
  readonly contextNeeds: Needs;
  readonly callback: (
    this: void,
    ...args: [...Args, SelectedCallbackContext<Context, Needs>]
  ) => Result;
}>;

/** 没有字段需求的 descriptor。 */
export type EmptyContextCallback<Args extends readonly unknown[], Result> = Readonly<{
  readonly contextNeeds?: undefined;
  readonly callback: (this: void, ...args: [...Args, Readonly<Record<never, never>>]) => Result;
}>;

export interface NormalizedContextCallback<
  Args extends readonly unknown[],
  Context,
  Result = unknown
> {
  readonly contextNeeds: readonly (keyof Context)[];
  readonly invoke: (context: Readonly<Partial<Context>>, ...args: Args) => Result;
}

const EMPTY_CONTEXT = Object.freeze({});
const EMPTY_NEEDS: readonly never[] = Object.freeze([]);

/** 验证 closed descriptor，复制需求并按领域字段顺序固定；不执行任何 callback。 */
export function snapshotContextCallback<Args extends readonly unknown[], Context, Result>(
  value: unknown,
  keys: readonly (keyof Context)[]
): ContextCallbackInput<Args, Context, Result> | undefined {
  if (isCallback<Args, Result>(value)) return value;
  const descriptor = snapshotClosedPolicyRecord(value, {
    required: ["callback"],
    optional: ["contextNeeds"]
  });
  if (descriptor === undefined || !isCallback<Args, Result>(descriptor.callback)) return undefined;
  const needs =
    descriptor.contextNeeds === undefined ? [] : snapshotClosedArray(descriptor.contextNeeds);
  if (needs === undefined || needs.some((key) => !keys.some((candidate) => candidate === key)))
    return undefined;
  return Object.freeze({
    callback: descriptor.callback,
    contextNeeds: Object.freeze(keys.filter((key) => needs.includes(key)))
  });
}

/** 领域固定点取得可调用的私有边界；只把该消费者声明的自有字段交给 callback。 */
export function normalizeContextCallback<Args extends readonly unknown[], Context, Result>(
  value: ContextCallbackInput<Args, Context, Result>,
  keys: readonly (keyof Context)[]
): NormalizedContextCallback<Args, Context, Result> | undefined;
export function normalizeContextCallback<Args extends readonly unknown[], Context>(
  value: unknown,
  keys: readonly (keyof Context)[]
): NormalizedContextCallback<Args, Context> | undefined;
export function normalizeContextCallback<Args extends readonly unknown[], Context>(
  value: unknown,
  keys: readonly (keyof Context)[]
): NormalizedContextCallback<Args, Context> | undefined {
  const snapshot = snapshotContextCallback<Args, Context, unknown>(value, keys);
  if (snapshot === undefined) return undefined;
  const callback = typeof snapshot === "function" ? snapshot : snapshot.callback;
  const contextNeeds =
    typeof snapshot === "function" ? EMPTY_NEEDS : (snapshot.contextNeeds ?? EMPTY_NEEDS);
  return Object.freeze({
    contextNeeds,
    invoke(context: Readonly<Partial<Context>>, ...args: Args) {
      // Descriptor validation proves callability, not the author's result shape.
      const result: unknown = Reflect.apply(callback, undefined, [
        ...args,
        projectCallbackContext(contextNeeds, context)
      ]);
      return result;
    }
  });
}

/** 只读取已请求字段；调用方可用 getter 延迟物化，并共享同一 boundary 的底层值。 */
export function projectCallbackContext<Context>(
  needs: readonly (keyof Context)[],
  source: Readonly<Partial<Context>>
): Readonly<Partial<Context>> {
  if (needs.length === 0) return EMPTY_CONTEXT;
  const context: Partial<Context> = {};
  for (const key of needs) {
    Object.defineProperty(context, key, { value: source[key], enumerable: true });
  }
  return Object.freeze(context);
}

function isCallback<Args extends readonly unknown[], Result>(
  value: unknown
): value is (this: void, ...args: [...Args, Readonly<Record<never, never>>]) => Result {
  return typeof value === "function";
}

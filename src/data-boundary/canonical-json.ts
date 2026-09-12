/** Canonical JSON 的 scalar 值；number 已排除非有限值，`-0` 会 materialize 为 `0`。 */
export type CanonicalJsonPrimitive = boolean | null | number | string;

/** 由 canonical API runtime materialize 的递归只读 JSON value。 */
export type CanonicalJsonValue =
  | CanonicalJsonPrimitive
  | readonly CanonicalJsonValue[]
  | CanonicalJsonObject;

/** 由 canonical API 返回的递归只读 JSON object。运行时 materialization 使用 null prototype。 */
export interface CanonicalJsonObject {
  readonly [key: string]: CanonicalJsonValue;
}

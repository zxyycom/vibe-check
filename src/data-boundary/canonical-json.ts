/**
 * Canonical JSON 的 scalar 值。
 *
 * TypeScript 的 `number` 不能在静态层区分有限值与 `NaN` / `Infinity`，因此输入仍须经过
 * canonical API 的 runtime materialization；runtime 只接受有限 number，并将 `-0` 规范化为 `0`。
 */
export type CanonicalJsonPrimitive = boolean | null | number | string;

/**
 * canonical JSON value 的递归只读 structural TypeScript shape。
 *
 * 此类型不证明值已经经过 runtime materialization。
 */
export type CanonicalJsonValue =
  | CanonicalJsonPrimitive
  | readonly CanonicalJsonValue[]
  | CanonicalJsonObject;

/**
 * canonical JSON object 的 structural TypeScript shape。
 *
 * 此类型不证明值来自 runtime materialization；canonical API 返回的 object 在 runtime 使用 null prototype。
 */
export interface CanonicalJsonObject {
  readonly [key: string]: CanonicalJsonValue;
}

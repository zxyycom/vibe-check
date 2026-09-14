/**
 * Canonical JSON 基本值的静态结构类型。
 *
 * TypeScript 的 `number` 无法在静态层区分有限值与 `NaN` / `Infinity`；因此此类型不能证明值已经由
 * canonical API 规范化。运行时只接受有限 number，并将 `-0` 转换为 `0`。
 */
export type CanonicalJsonPrimitive = boolean | null | number | string;

/**
 * Canonical JSON 值的递归只读静态结构类型。
 *
 * 它描述基本值、数组和对象能够如何组合，便于声明参数和结果；不证明值已经通过 canonical API 的
 * 运行时规范化、递归冻结或循环检查。
 */
export type CanonicalJsonValue =
  | CanonicalJsonPrimitive
  | readonly CanonicalJsonValue[]
  | CanonicalJsonObject;

/**
 * Canonical JSON 对象的只读静态结构类型。
 *
 * 该类型不证明值来自 canonical API。API 实际返回的对象使用 null prototype，没有继承的对象方法；
 * 检查属性时使用 `Object.hasOwn`，不要调用 `value.hasOwnProperty`。
 */
export interface CanonicalJsonObject {
  readonly [key: string]: CanonicalJsonValue;
}

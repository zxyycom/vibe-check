/** 兼容式多 flag shorthand 的集合判定模式。 */
export type CheckFlagEnablementMode = "all" | "any" | "none" | "not-all";

/** 一个规范化后的递归 flag presence 条件表达式。 */
export type CheckFlagCondition = Readonly<
  | {
      readonly kind: "flag";
      readonly flag: string;
    }
  | {
      readonly kind: "all" | "any" | "none" | "not-all" | "exactly-one";
      /** 保留 author child 顺序和 multiplicity；重复项影响 `exactly-one` 求值，顺序也进入 canonical identity。 */
      readonly conditions: readonly [CheckFlagCondition, ...CheckFlagCondition[]];
    }
  | {
      readonly kind: "not";
      readonly condition: CheckFlagCondition;
    }
>;

/** Definition 接受的递归 flag-condition authoring 输入；字符串 atom 会规范化为 `flag` node。 */
export type CheckFlagConditionInput =
  | string
  | Readonly<{
      readonly kind: "flag";
      readonly flag: string;
    }>
  | Readonly<{
      readonly kind: "all" | "any" | "none" | "not-all" | "exactly-one";
      readonly conditions: readonly [CheckFlagConditionInput, ...CheckFlagConditionInput[]];
    }>
  | Readonly<{
      readonly kind: "not";
      readonly condition: CheckFlagConditionInput;
    }>;

type CheckFlagConditionSetKind = "all" | "any" | "none" | "not-all" | "exactly-one";
type NonEmptyFlagConditions = readonly [CheckFlagConditionInput, ...CheckFlagConditionInput[]];
type CheckFlagConditionSetInput<Kind extends CheckFlagConditionSetKind> = Readonly<{
  readonly kind: Kind;
  readonly conditions: NonEmptyFlagConditions;
}>;
type CheckFlagNegationInput = Readonly<{
  readonly kind: "not";
  readonly condition: CheckFlagConditionInput;
}>;

/** 构造 `all` 条件；Definition 仍负责 validation 与 canonicalization。 */
export function all(...conditions: NonEmptyFlagConditions): CheckFlagConditionSetInput<"all"> {
  return conditionSet("all", conditions);
}

/** 构造 `any` 条件；Definition 仍负责 validation 与 canonicalization。 */
export function any(...conditions: NonEmptyFlagConditions): CheckFlagConditionSetInput<"any"> {
  return conditionSet("any", conditions);
}

/** 构造 `none` 条件；Definition 仍负责 validation 与 canonicalization。 */
export function none(...conditions: NonEmptyFlagConditions): CheckFlagConditionSetInput<"none"> {
  return conditionSet("none", conditions);
}

/** 构造 `not-all` 条件；Definition 仍负责 validation 与 canonicalization。 */
export function notAll(
  ...conditions: NonEmptyFlagConditions
): CheckFlagConditionSetInput<"not-all"> {
  return conditionSet("not-all", conditions);
}

/** 构造 `exactly-one` 条件；Definition 仍负责 validation 与 canonicalization。 */
export function exactlyOne(
  ...conditions: NonEmptyFlagConditions
): CheckFlagConditionSetInput<"exactly-one"> {
  return conditionSet("exactly-one", conditions);
}

/** 构造 `not` 条件；Definition 仍负责 validation 与 canonicalization。 */
export function not(condition: CheckFlagConditionInput): CheckFlagNegationInput {
  return { condition, kind: "not" };
}

/** 为一个已声明的 project change ID 生成保留 flag token。 */
export function changeFlag<const Id extends string>(id: Id): `vibe-check:change:${Id}` {
  return `vibe-check:change:${id}`;
}

function conditionSet<Kind extends CheckFlagConditionSetKind>(
  kind: Kind,
  conditions: NonEmptyFlagConditions
): CheckFlagConditionSetInput<Kind> {
  return { kind, conditions };
}

/** 为兼容扁平 flag presence 表达式保留的 shorthand。 */
export interface CheckFlagEnablementShorthand {
  /** 非空 flag token 集合；Definition 会去重并稳定排序。 */
  readonly flags: readonly [string, ...string[]];
  /** 对声明 token 与本次 Run flags 执行的 presence predicate。 */
  readonly mode: CheckFlagEnablementMode;
  readonly when?: never;
  /**
   * 条件命中时是否启动本 Check 的传递 `dependsOn` prerequisite；省略时保持只选择直接命中 Check 的兼容行为。
   * `observes` 不参与此选择，且 dependency 自己的 flag 条件不会阻止本次已启动的 prerequisite。
   */
  readonly propagateDependsOn?: true;
}

/** executable Check flag 选择的递归条件表达式写法。 */
export interface CheckFlagEnablementExpression {
  readonly when: CheckFlagConditionInput;
  readonly flags?: never;
  readonly mode?: never;
  /**
   * 条件命中时是否启动本 Check 的传递 `dependsOn` prerequisite；省略时保持只选择直接命中 Check 的兼容行为。
   * `observes` 不参与此选择，且 dependency 自己的 flag 条件不会阻止本次已启动的 prerequisite。
   */
  readonly propagateDependsOn?: true;
}

/** executable Check flag 选择的公开 authoring grammar。 */
export type CheckFlagEnablement = CheckFlagEnablementExpression | CheckFlagEnablementShorthand;

/** Definition-normalized executable flag-selection control。 */
export interface NormalizedCheckFlagEnablement {
  readonly when: CheckFlagCondition;
  readonly propagateDependsOn?: true;
}

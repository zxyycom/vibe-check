/** 一个递归 flag presence 条件表达式。字符串是唯一 leaf；operator 保留 author child 顺序和 multiplicity。 */
export type CheckFlagCondition =
  | string
  | Readonly<{
      readonly kind: "all" | "any" | "none" | "not-all" | "exactly-one";
      readonly conditions: readonly [CheckFlagCondition, ...CheckFlagCondition[]];
    }>
  | Readonly<{
      readonly kind: "not";
      readonly condition: CheckFlagCondition;
    }>;

type CheckFlagConditionSetKind = "all" | "any" | "none" | "not-all" | "exactly-one";
type NonEmptyFlagConditions = readonly [CheckFlagCondition, ...CheckFlagCondition[]];
type CheckFlagConditionSet<Kind extends CheckFlagConditionSetKind> = Readonly<{
  readonly kind: Kind;
  readonly conditions: NonEmptyFlagConditions;
}>;
type CheckFlagNegation = Readonly<{
  readonly kind: "not";
  readonly condition: CheckFlagCondition;
}>;

/** 构造 `all` 条件；Definition 仍负责 validation、snapshot 与 freeze。 */
export function all(...conditions: NonEmptyFlagConditions): CheckFlagConditionSet<"all"> {
  return conditionSet("all", conditions);
}

/** 构造 `any` 条件；Definition 仍负责 validation、snapshot 与 freeze。 */
export function any(...conditions: NonEmptyFlagConditions): CheckFlagConditionSet<"any"> {
  return conditionSet("any", conditions);
}

/** 构造 `none` 条件；Definition 仍负责 validation、snapshot 与 freeze。 */
export function none(...conditions: NonEmptyFlagConditions): CheckFlagConditionSet<"none"> {
  return conditionSet("none", conditions);
}

/** 构造 `not-all` 条件；Definition 仍负责 validation、snapshot 与 freeze。 */
export function notAll(...conditions: NonEmptyFlagConditions): CheckFlagConditionSet<"not-all"> {
  return conditionSet("not-all", conditions);
}

/** 构造 `exactly-one` 条件；Definition 仍负责 validation、snapshot 与 freeze。 */
export function exactlyOne(
  ...conditions: NonEmptyFlagConditions
): CheckFlagConditionSet<"exactly-one"> {
  return conditionSet("exactly-one", conditions);
}

/** 构造 `not` 条件；Definition 仍负责 validation、snapshot 与 freeze。 */
export function not(condition: CheckFlagCondition): CheckFlagNegation {
  return { condition, kind: "not" };
}

/** 为一个已声明的 project change ID 生成保留 flag token。 */
export function changeFlag<const Id extends string>(id: Id): `vibe-check:change:${Id}` {
  return `vibe-check:change:${id}`;
}

function conditionSet<Kind extends CheckFlagConditionSetKind>(
  kind: Kind,
  conditions: NonEmptyFlagConditions
): CheckFlagConditionSet<Kind> {
  return { kind, conditions };
}

/** executable Check 的 flag 选择控制。 */
export interface CheckFlagEnablement {
  readonly when: CheckFlagCondition;
  /**
   * 条件命中时是否启动本 Check 的传递 `dependsOn` prerequisite；省略时只选择直接命中 Check。
   * `observes` 不参与此选择，且 dependency 自己的 flag 条件不会阻止已启动 prerequisite。
   */
  readonly propagateDependsOn?: true;
}

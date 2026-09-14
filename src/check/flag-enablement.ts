/** 兼容式多 flag shorthand 的集合判定模式。 */
export type CheckFlagEnablementMode = "all" | "any" | "none" | "not-all";

/** 一个递归的 flag presence 条件表达式。 */
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
  readonly when: CheckFlagCondition;
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

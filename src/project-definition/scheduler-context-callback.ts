import type {
  AdmissionPolicyContext,
  AdmissionProposal,
  CustomAdmissionPreparationContext,
  PreparedCustomAdmissionStrategy,
  SchedulerMeasurementContext
} from "./scheduler-policy.ts";

/** Scheduler callback 的真实消费阶段；不同阶段不会合并 context。 */
export interface SchedulerContextByPhase {
  readonly preparation: CustomAdmissionPreparationContext;
  readonly decision: AdmissionPolicyContext;
  readonly terminal: SchedulerMeasurementContext;
}

/** 仅约束对应阶段的现有字段，不是权限或跨阶段 registry。 */
export type SchedulerContextPhase = keyof SchedulerContextByPhase;

/** 对应阶段允许的 callback result；decision 仍必须同步。 */
export interface SchedulerContextResultByPhase {
  readonly preparation: PreparedCustomAdmissionStrategy | Promise<PreparedCustomAdmissionStrategy>;
  readonly decision: AdmissionProposal;
  readonly terminal: void | Promise<void>;
}

/**
 * callback slot 的兼容输入：原 function 读取完整 context；descriptor 通过 typed helper authoring。
 *
 * @remarks descriptor 的 never 是安全存储边界，不可直接调用；runtime 在 closed validation 后
 * 按 contextNeeds 构建已知需求。省略/自有 undefined 为 full；[] 不增加需求。
 */
export type SchedulerContextCallbackInput<C, R> =
  | ((this: void, context: C) => R)
  | Readonly<{
      readonly contextNeeds?: readonly (keyof C)[] | undefined;
      readonly callback: (this: void, context: never) => R;
    }>;

/** Only deterministic tuple positions guarantee fields; widened arrays/union tokens do not. */
type GuaranteedNeed<N extends readonly PropertyKey[], K> = number extends N["length"]
  ? never
  : [N] extends [readonly [infer H, ...infer T]]
    ? [H] extends [K]
      ? K
      : [T] extends [readonly PropertyKey[]]
        ? GuaranteedNeed<T, K>
        : never
    : never;
type GuaranteedContextKeys<C, N extends readonly (keyof C)[]> = {
  [K in keyof C]: GuaranteedNeed<N, K>;
}[keyof C];

/** helper 保留的声明类型；只保证本 callback 声明的字段，同阶段对象可能有额外字段。 */
export type DeclaredSchedulerContextCallback<
  P extends SchedulerContextPhase,
  N extends readonly (keyof SchedulerContextByPhase[P])[],
  R extends SchedulerContextResultByPhase[P] = SchedulerContextResultByPhase[P]
> = Readonly<{
  readonly contextNeeds: N;
  readonly callback: (
    this: void,
    context: Readonly<
      Pick<SchedulerContextByPhase[P], GuaranteedContextKeys<SchedulerContextByPhase[P], N>>
    >
  ) => R;
}>;

/** helper 的 full descriptor 形式，仍保留完整字段推导。 */
export type FullSchedulerContextCallback<
  P extends SchedulerContextPhase,
  R extends SchedulerContextResultByPhase[P] = SchedulerContextResultByPhase[P]
> = Readonly<{
  readonly contextNeeds?: undefined;
  readonly callback: (this: void, context: SchedulerContextByPhase[P]) => R;
}>;

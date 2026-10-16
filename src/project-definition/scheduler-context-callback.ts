import type { ContextCallbackInput } from "../data-boundary/context-callback.ts";
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

/** Scheduler 无业务参数，普通 function 与省略声明均为空需求。 */
export type SchedulerContextCallbackInput<C, R> = ContextCallbackInput<[], C, R>;

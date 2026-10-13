import type {
  AdmissionPolicyContext,
  AdmissionProposal,
  CustomAdmissionPreparationContext,
  SchedulerGraphSnapshot,
  SchedulerMeasurementContext
} from "../../project-definition/project-definition.ts";

/** 公开 learned critical-path prepared strategy 的调用方配置。 */
export interface LearnedCriticalPathStrategyOptions {
  /** 调用方拥有的可丢弃 learned duration history 本地目录；必须是绝对路径。 */
  readonly stateDirectory: string;
  /** 为每个公开 Task 提供 canonical-JSON-compatible 的调用方 identity projection。 */
  readonly identityForTask: (task: SchedulerGraphSnapshot["tasks"][number]) => unknown;
  /** 单个 identity 最多保留的样本数；默认 32。 */
  readonly sampleWindow?: number;
  /** 最多保留的 identity 数；默认 4096。 */
  readonly maxHistorySeries?: number;
  /** 正的 cold-start duration 权重（毫秒）；默认 1。 */
  readonly coldStartDurationMs?: number;
  /** 可选调用方 observation sink；observer fault 不改变 scheduling 或 Run facts。 */
  readonly observe?: (event: LearnedCriticalPathObservation) => void | Promise<void>;
}

/** 调用方可选 observer 收到的有界 learned strategy 事件；selection-proposed 不表示 Scheduler 已接受 admission。 */
export type LearnedCriticalPathObservation =
  | Readonly<{
      readonly kind: "history-unavailable";
      readonly reason: "identity-invalid" | "setup-failed";
    }>
  | Readonly<{
      readonly kind: "selection-proposed";
      readonly taskId: string;
      readonly estimatedDurationMs: number;
      readonly criticalPathScore: number;
      readonly sampleCount: number;
      readonly source: "learned" | "project-prior" | "cold-start";
    }>
  | Readonly<{ readonly kind: "recording-unavailable" }>;

/** 此 helper 返回具体可调用的 prepare/decide；公开 strategy 输入槽另外接受 descriptor。 */
export type LearnedCriticalPathStrategy = Readonly<{
  readonly kind: "prepared";
  readonly prepare: (context: CustomAdmissionPreparationContext) => Promise<
    Readonly<{
      readonly decide: (context: AdmissionPolicyContext) => AdmissionProposal;
      readonly terminalEffect?: (context: SchedulerMeasurementContext) => Promise<void>;
    }>
  >;
}>;

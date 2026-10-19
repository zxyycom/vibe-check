import type { DeclaredContextCallback } from "../../data-boundary/context-callback.ts";
import type {
  AdmissionPolicyContext,
  AdmissionProposal,
  CustomAdmissionPreparationContext,
  SchedulerGraphSnapshot,
  SchedulerMeasurementContext
} from "../../project-definition/project-definition.ts";

/** 公开 learned critical-path prepared strategy 的调用方配置。 */
export interface LearnedCriticalPathStrategyOptions {
  /**
   * 调用方拥有的可丢弃 learned duration history 本地目录；必须是绝对路径。
   *
   * @see [history 目录的信任、清理与并发边界](../../../docs/guides/learned-scheduling.md#配置-history-与任务-identity)
   */
  readonly stateDirectory: string;
  /**
   * 为每个公开 Task 提供 canonical-JSON-compatible identity；调用方负责纳入全部影响时长可比性的
   * options、flags、环境与实现版本。identity 不得包含 secret、token 或低熵敏感值，digest 不是保密机制。
   *
   * @see [配置任务 identity](../../../docs/guides/learned-scheduling.md#配置-history-与任务-identity)
   */
  readonly identityForTask: (task: SchedulerGraphSnapshot["tasks"][number]) => unknown;
  /** 单个 identity 最多保留的样本数；须为 1–32 的整数，默认 32。 */
  readonly sampleWindow?: number;
  /** 最多保留的 identity 数；须为 1–4096 的整数，默认 4096。 */
  readonly maxHistorySeries?: number;
  /** 正有限的 cold-start duration 权重（毫秒）；默认 1。 */
  readonly coldStartDurationMs?: number;
  /**
   * 可选调用方 observation sink；同步 throw 或 rejected Promise 被隔离，不改变 scheduling 或 Run facts。
   * 返回的 Promise 不被 await，Run 结束不保证 sink 已结束；需要持久化时由调用方自行 flush。
   *
   * @see [退化与观察](../../../docs/guides/learned-scheduling.md#退化与观察)
   */
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

/** learned decision 只读取真实选择所需的当前边界字段。 */
export type LearnedDecisionContext = Pick<
  AdmissionPolicyContext,
  "activeScopeIds" | "candidates" | "capacity"
>;

/** helper 返回精确 descriptor；直接调用时调用方提供其声明的 context。 */
export type LearnedCriticalPathStrategy = Readonly<{
  readonly kind: "prepared";
  readonly prepare: DeclaredContextCallback<
    [],
    CustomAdmissionPreparationContext,
    readonly ["graph"],
    Promise<
      Readonly<{
        readonly decide: DeclaredContextCallback<
          [],
          AdmissionPolicyContext,
          readonly ["activeScopeIds", "candidates", "capacity"],
          AdmissionProposal
        >;
        readonly terminalEffect?: DeclaredContextCallback<
          [],
          SchedulerMeasurementContext,
          readonly ["execution", "taskTimings"],
          Promise<void>
        >;
      }>
    >
  >;
}>;

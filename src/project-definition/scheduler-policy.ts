/** 自定义准入 policy 对当前 Task 的唯一提议。 */
export type AdmissionProposal =
  | Readonly<{ readonly kind: "select"; readonly taskId: string }>
  | Readonly<{ readonly kind: "wait" }>;

/**
 * 自定义准入 policy 每轮获得的不可变普通数据快照。
 *
 * 它只提供完整调度图及当前可观察的准入事实，不能启动、取消或结算 Task。
 */
export interface AdmissionPolicyContext {
  /** 已规范化的完整静态调度图；Task metadata 是拓扑和 priority 的唯一来源。 */
  readonly graph: SchedulerGraphSnapshot;
  /** 已满足 relation/mutex 条件的 pending Task 及其本轮 capacity 可准入性。 */
  readonly candidates: readonly Readonly<{
    readonly canAdmit: boolean;
    readonly taskId: string;
  }>[];
  /** 当前 root 与已激活 scope 合成后的 capacity 事实。 */
  readonly capacity: Readonly<{
    readonly effectiveMaxParallel: number;
    readonly maxParallel: number;
    readonly running: number;
  }>;
  /** 当前已激活 scope 的 canonical IDs。 */
  readonly activeScopeIds: readonly string[];
  /** 当前正在执行的 Task IDs。 */
  readonly runningTaskIds: readonly string[];
  /** 当前已结算的 Task IDs；不携带 Check result、data 或 message。 */
  readonly settledTaskIds: readonly string[];
  /** 调用前已 flush 的有界累计事实与 captured action-observation prefix。 */
  readonly measurement: AdmissionPolicyMeasurement;
  /** 本轮与生命周期有关的最小只读事实。 */
  readonly runtime: Readonly<{
    readonly abortRequested: boolean;
    readonly cancelled: boolean;
  }>;
}

/** custom prepared strategy 在 graph ready 后读取的最小只读事实。 */
export interface CustomAdmissionPreparationContext {
  /** 已规范化、递归冻结的完整静态调度图。 */
  readonly graph: SchedulerGraphSnapshot;
}

/** prepared custom strategy 为当前 Run 返回的同步选择与可选 terminal completion。 */
export interface PreparedCustomAdmissionStrategy {
  /** Scheduler 每轮同步调用；不得返回 Promise 或 thenable。 */
  readonly decide: (this: void, context: AdmissionPolicyContext) => AdmissionProposal;
  /** Scheduler 的 generic Hooks 完成后，才以 sealed terminal context 调用一次。 */
  readonly complete?: (this: void, context: SchedulerMeasurementContext) => void | Promise<void>;
}

/** custom 的 closed authoring grammar。 */
export type CustomAdmissionStrategy =
  | Readonly<{
      readonly kind: "simple";
      readonly decide: (this: void, context: AdmissionPolicyContext) => AdmissionProposal;
    }>
  | Readonly<{
      readonly kind: "prepared";
      readonly prepare: (
        this: void,
        context: CustomAdmissionPreparationContext
      ) => PreparedCustomAdmissionStrategy | Promise<PreparedCustomAdmissionStrategy>;
    }>;

/** Definition authoring 的 closed admission policy。 */
export type AdmissionPolicy =
  | Readonly<{ readonly kind: "static" }>
  | Readonly<{
      readonly kind: "custom";
      readonly strategy: CustomAdmissionStrategy;
    }>
  | Readonly<{
      /** 调用方管理的本地状态；relative path 在稍后的 Project Run 中从 effective projectRoot 解析。 */
      readonly kind: "learned-critical-path";
      readonly stateDirectory: string;
    }>;

/** 定义级的 Check 调度预算与 admission policy。 */
export type SchedulerMeasurementTimingUnavailableReason =
  | "clock-threw"
  | "clock-non-finite"
  | "clock-backward"
  | "interval-invalid"
  | "integral-invalid";

export type SchedulerMeasurementTiming =
  | Readonly<{ readonly availability: "available" }>
  | Readonly<{
      readonly availability: "unavailable";
      readonly reason: SchedulerMeasurementTimingUnavailableReason;
    }>;

/** 所有公开 Scheduler context 共用的图 DTO；Task identity 一律为 `taskId`。 */
export interface SchedulerGraphSnapshot {
  readonly scopes: readonly Readonly<{
    readonly activationTaskIds: readonly string[];
    readonly id: string;
    readonly maxParallel: number;
    readonly terminalTaskId: string;
  }>[];
  readonly tasks: readonly Readonly<{
    readonly admissionPriority: number;
    readonly dependsOn: readonly string[];
    readonly mutex: readonly string[];
    readonly observes: readonly string[];
    readonly scopeId: string | null;
    readonly taskId: string;
  }>[];
}

/** 一条已关闭 occupancy interval 对累计值的有界贡献。 */
export interface SchedulerMeasurementIntervalContribution {
  readonly admissiblePendingTaskMs: number;
  readonly acceptedWaitMs: number;
  readonly capacityBlockedTaskMs: number;
  readonly effectiveCapacitySlotMs: number;
  readonly mutexBlockedTaskMs: number;
  readonly rootCapacitySlotMs: number;
  readonly taskSlotMs: number;
}

/** 已关闭 action-observation interval 的 timing 边界；不可用 timing 不伪造数值贡献。 */
export type SchedulerMeasurementActionObservationInterval =
  | Readonly<{
      readonly availability: "available";
      readonly contribution: SchedulerMeasurementIntervalContribution;
    }>
  | Readonly<{
      readonly availability: "unavailable";
      readonly reason: SchedulerMeasurementTimingUnavailableReason;
    }>;

/** 一条 policy action 之后发生的离散 Scheduler effect。 */
export type SchedulerMeasurementEffect =
  | Readonly<{ readonly kind: "admitted"; readonly taskId: string }>
  | Readonly<{
      readonly kind: "settled";
      readonly settlementKind:
        | "completed"
        | "prerequisite-unsatisfied"
        | "failed"
        | "blocked"
        | "cancelled-before-start";
      readonly taskId: string;
    }>;

/** 上一 accepted policy action 之后的已 flush state observation，不声明 causality 或 critical path。 */
export type SchedulerMeasurementActionObservation =
  | Readonly<{
      readonly effects: readonly SchedulerMeasurementEffect[];
      readonly interval: SchedulerMeasurementActionObservationInterval;
      readonly kind: "select";
      /** invocation 内的 accepted action 序号，从一开始。 */
      readonly sequence: number;
      readonly taskId: string;
    }>
  | Readonly<{
      readonly effects: readonly SchedulerMeasurementEffect[];
      readonly interval: SchedulerMeasurementActionObservationInterval;
      readonly kind: "wait";
      /** invocation 内的 accepted action 序号，从一开始。 */
      readonly sequence: number;
      readonly taskId: null;
    }>;

/** custom policy 的有界 decision-boundary measurement reader。 */
export interface AdmissionPolicyMeasurement {
  /** 当前 decision boundary 的累计标量；完整逐 Task table 只属于终态 measurement。 */
  readonly cumulative: SchedulerDecisionMeasurementCumulative;
  /** 当前 invocation 已捕获且不可变的 action observation prefix 长度。 */
  readonly measurementCount: number;
  /** 只读取当前 context 冻结的 observation prefix；越界 index 返回 `undefined`。 */
  readonly measurementAt: (
    this: void,
    index: number
  ) => SchedulerMeasurementActionObservation | undefined;
}

/** policy 决策时的有界累计事实；刻意不含 terminal per-Task table。 */
interface SchedulerDecisionMeasurementCumulativeFacts {
  readonly declarativeFingerprint: string;
  readonly discrete: Readonly<{
    readonly acceptedWaitCount: number;
    readonly admittedCount: number;
    readonly maxRunning: number;
  }>;
  readonly peaks: SchedulerMeasurementPeakCounts;
}

interface AvailableSchedulerDecisionMeasurementCumulative extends SchedulerDecisionMeasurementCumulativeFacts {
  readonly timing: Readonly<{ readonly availability: "available" }>;
  readonly timingFacts: Readonly<{
    readonly acceptedWaitMs: number;
    readonly effectiveCapacitySlotMs: number;
    readonly rootCapacitySlotMs: number;
    readonly taskSlotMs: number;
  }>;
}

interface UnavailableSchedulerDecisionMeasurementCumulative extends SchedulerDecisionMeasurementCumulativeFacts {
  readonly timing: Readonly<{
    readonly availability: "unavailable";
    readonly reason: SchedulerMeasurementTimingUnavailableReason;
  }>;
  readonly timingFacts?: never;
}

/** custom policy 在 decision boundary 读取的有界累计 measurement；不含终态逐 Task table。 */
export type SchedulerDecisionMeasurementCumulative =
  | AvailableSchedulerDecisionMeasurementCumulative
  | UnavailableSchedulerDecisionMeasurementCumulative;

export interface SchedulerMeasurementPeakCounts {
  readonly admissionViablePendingTaskCount: number;
  readonly admissiblePendingTaskCount: number;
  readonly capacityBlockedTaskCount: number;
  readonly mutexBlockedTaskCount: number;
}

export interface SchedulerMeasurementAdmission {
  readonly admissionDelay: Readonly<{
    readonly admissiblePendingMs: number;
    readonly capacityBlockedMs: number;
    readonly mutexBlockedMs: number;
  }>;
  /** Scheduler monotonic-clock timestamp in milliseconds, or no admission occurred. */
  readonly admittedAtMonotonicMs: number | null;
  /** Scheduler monotonic-clock timestamp in milliseconds, or no settlement occurred. */
  readonly settledAtMonotonicMs: number | null;
  readonly taskId: string;
}

export interface SchedulerMeasurementTimingFacts {
  readonly acceptedWaitMs: number;
  readonly admissions: readonly SchedulerMeasurementAdmission[];
  readonly effectiveCapacitySlotMs: number;
  /** Terminal Scheduler monotonic-clock timestamp in milliseconds. */
  readonly endedAtMonotonicMs: number;
  readonly rootCapacitySlotMs: number;
  readonly schedulerControlPathMs: number;
  readonly schedulerDecisionObservationMs: number;
  /** First Scheduler monotonic-clock timestamp in milliseconds. */
  readonly startedAtMonotonicMs: number;
  readonly taskSlotMs: number;
}

interface SchedulerRawMeasurementFacts {
  readonly declarativeFingerprint: string;
  readonly discrete: Readonly<{
    readonly acceptedWaitCount: number;
    readonly admittedCount: number;
    readonly completionTailActiveTaskIds: readonly string[];
    readonly lastSettledTaskId: string | null;
    readonly maxRunning: number;
  }>;
  readonly peaks: SchedulerMeasurementPeakCounts;
}

interface AvailableSchedulerRawMeasurement extends SchedulerRawMeasurementFacts {
  readonly timing: Readonly<{ readonly availability: "available" }>;
  readonly timingFacts: SchedulerMeasurementTimingFacts;
}

interface UnavailableSchedulerRawMeasurement extends SchedulerRawMeasurementFacts {
  readonly timing: Readonly<{
    readonly availability: "unavailable";
    readonly reason: SchedulerMeasurementTimingUnavailableReason;
  }>;
  readonly timingFacts?: never;
}

/** Scheduler-owned terminal 一阶事实；全部二级 summary 都由 Hook 投影。 */
export type SchedulerRawMeasurement =
  | AvailableSchedulerRawMeasurement
  | UnavailableSchedulerRawMeasurement;

/**
 * 一次 Scheduler 终态 Hook 可读取的递归冻结上下文；不包含 Task 值、错误或可变 engine 对象。
 */
export interface SchedulerMeasurementContext {
  readonly graph: SchedulerGraphSnapshot;
  readonly execution: Readonly<{
    readonly admittedTaskIds: readonly string[];
    readonly settledTasks: readonly Readonly<{
      readonly kind:
        | "completed"
        | "prerequisite-unsatisfied"
        | "failed"
        | "blocked"
        | "cancelled-before-start";
      readonly taskId: string;
    }>[];
  }>;
  readonly rawMeasurement: SchedulerRawMeasurement;
}

/** 一次 terminal Scheduler measurement 的 caller-owned sync/async consumer。 */
export type SchedulerMeasurementHook =
  | ((this: void, context: SchedulerMeasurementContext) => void)
  | ((this: void, context: SchedulerMeasurementContext) => Promise<void>);

/** 定义级的 Scheduler 预算、admission policy 与终态 measurement consumer。 */
export interface SchedulerPolicy {
  readonly admissionPolicy: AdmissionPolicy;
  readonly maxParallel: number;
  readonly measurementHooks: readonly SchedulerMeasurementHook[];
}

export interface DeclarativeSchedulerPolicy {
  readonly admissionPolicy:
    | Readonly<{ readonly kind: "static" }>
    | Readonly<{
        readonly kind: "custom";
        readonly strategy: Readonly<{ readonly kind: "simple" | "prepared" }>;
      }>
    | Readonly<{
        readonly kind: "learned-critical-path";
        readonly stateDirectory: string;
      }>;
  readonly maxParallel: number;
}

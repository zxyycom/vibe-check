/** 自定义准入 policy 对当前 Task 的唯一提议。 */
export type AdmissionProposal =
  | Readonly<{ readonly kind: "select"; readonly taskId: string }>
  | Readonly<{ readonly kind: "wait" }>;

/** 独立模拟 immutable Scheduler admission graph 的 exact input。 */
export interface AdmissionGraphInput {
  /** 要模拟的已规范化静态图 DTO；模拟器会先验证其 closed shape 与引用。 */
  readonly graph: SchedulerGraphSnapshot;
  /** standalone state 的 root 并行上限。 */
  readonly maxParallel: number;
}

/** 一次假设性 Task settlement 的公开二值结果；它不是 Task execution result。 */
export type AdmissionSettlementOutcome = "satisfied" | "unsatisfied";

/** 可从同一静态图形成 independent initial states 的 standalone handle。 */
export interface AdmissionGraph {
  /** 从同一已验证 graph 形成一个新的全 pending immutable state。 */
  initialState(this: void): AdmissionState;
}

/** 不可变且 opaque 的 hypothetical admission boundary。 */
export interface AdmissionState {
  /** 当前 dynamic admission facts；读取不会控制真实 Scheduler。 */
  readonly inspection: AdmissionInspection;
  /** 当前 pending Task 的可选性分区；按 canonical taskId 顺序输出。 */
  readonly catalog: AdmissionCatalog;
  /** 只模拟一次 admission，不启动、预检或执行 Task。 */
  select(this: void, taskId: string): AdmissionTransitionResult;
  /** 只模拟一个当前 running Task 的二值结算。 */
  settle(
    this: void,
    taskId: string,
    outcome: AdmissionSettlementOutcome
  ): AdmissionTransitionResult;
  /** 不构造 catalog 的单 Task select legality query。 */
  validateSelection(this: void, taskId: string): AdmissionSelectionValidation;
}

/** 当前 immutable state 的公开动态 inspection。 */
export interface AdmissionInspection {
  /** 当前 root、active scope 与 running count 形成的 capacity 快照。 */
  readonly capacity: Readonly<{
    /** 合成当前 active scope 限制后的有效并行上限。 */
    readonly effectiveMaxParallel: number;
    /** standalone graph 的 root 并行上限。 */
    readonly maxParallel: number;
    /** 当前 hypothetical running Task 数。 */
    readonly running: number;
  }>;
  /** 下一合法动作类别：选择 Task、等待 running Task，或 state 已完成。 */
  readonly nextBoundary: "select" | "wait" | "complete";
  /** 当前 hypothetical running Task IDs，按 graph 的 canonical Task 顺序。 */
  readonly runningTaskIds: readonly string[];
  /** 当前 named resource occupancy；按 resourceId 规范排序。 */
  readonly resources: readonly Readonly<{
    /** 尚可原子取得的 units。 */
    readonly available: number;
    /** graph 声明的总 units。 */
    readonly capacity: number;
    /** 当前 running Tasks 已占用的 units。 */
    readonly inUse: number;
    /** named resource 的稳定 ID。 */
    readonly resourceId: string;
  }>[];
  /** 每个静态 scope 的当前 lifecycle，按 scopeId 规范排序。 */
  readonly scopes: readonly AdmissionScopeLifecycle[];
  /** 可映射为 satisfied/unsatisfied 的 hypothetical settlements。 */
  readonly settledTasks: readonly AdmissionSettledTask[];
}

/** 一个静态 scope 的推导 lifecycle。 */
export interface AdmissionScopeLifecycle {
  /** scope 尚未激活、当前 active，或 terminal Task 已结算后的 closed 状态。 */
  readonly lifecycle: "inactive" | "active" | "closed";
  /** graph 中声明的稳定 scope ID。 */
  readonly scopeId: string;
}

/** 可公开映射为 binary outcome 的 Task settlement。 */
export interface AdmissionSettledTask {
  /** 本次 hypothetical settlement 是否满足 dependents 的前置关系。 */
  readonly outcome: AdmissionSettlementOutcome;
  /** 已结算 Task 的稳定 ID。 */
  readonly taskId: string;
}

/** 所有 pending Task 的 canonical selectable/non-selectable partition。 */
export interface AdmissionCatalog {
  /** 当前 pending 但不可 select 的 Tasks 及其 primary reason。 */
  readonly nonSelectableTasks: readonly AdmissionNonSelectableTask[];
  /** 当前可合法 select 的 pending Task IDs。 */
  readonly selectableTaskIds: readonly string[];
}

/** catalog 中一个 pending Task 的 primary non-selection reason。 */
export interface AdmissionNonSelectableTask {
  /** 该 Task 当前不可 select 的 canonical primary reason。 */
  readonly reason: AdmissionSelectionRejectionReason;
  /** 当前仍 pending 的稳定 Task ID。 */
  readonly taskId: string;
}

/** pending Task 因当前 admission legality 不可 select 的 closed reason。 */
export type AdmissionSelectionRejectionReason =
  | Readonly<{ readonly kind: "depends-on-pending"; readonly taskIds: readonly string[] }>
  | Readonly<{ readonly kind: "mutex-held"; readonly mutexIds: readonly string[] }>
  | Readonly<{
      readonly kind: "root-capacity-reached";
      readonly maxParallel: number;
      readonly running: number;
    }>
  | Readonly<{
      readonly kind: "scope-capacity-reached";
      readonly maxParallel: number;
      readonly running: number;
      readonly scopeId: string;
    }>
  | Readonly<{
      readonly kind: "resource-capacity-insufficient";
      readonly resources: readonly Readonly<{
        readonly available: number;
        readonly capacity: number;
        readonly inUse: number;
        readonly required: number;
        readonly resourceId: string;
      }>[];
    }>
  | Readonly<{ readonly kind: "observes-pending"; readonly taskIds: readonly string[] }>;

/** validateSelection/select 共同使用的完整 selection validation failure surface。 */
export type AdmissionSelectionValidationRejectionReason =
  | AdmissionSelectionRejectionReason
  | Readonly<{ readonly kind: "not-pending"; readonly status: "running" | "settled" }>
  | Readonly<{ readonly kind: "state-complete" }>
  | Readonly<{ readonly kind: "unknown-task" }>;

/** select 或 settle 公开 transition 的完整 rejection surface。 */
export type AdmissionRejectionReason =
  | AdmissionSelectionValidationRejectionReason
  | Readonly<{ readonly kind: "invalid-settlement-outcome" }>
  | Readonly<{ readonly kind: "not-running"; readonly status: "pending" | "settled" }>;

/** 任意 taskId 的只读 selection validation result。 */
export type AdmissionSelectionValidation =
  | Readonly<{ readonly accepted: true }>
  | Readonly<{
      readonly accepted: false;
      readonly reason: AdmissionSelectionValidationRejectionReason;
    }>;

/** accepted successor 或 closed rejection 的 immutable transition result。 */
export type AdmissionTransitionResult =
  | Readonly<{ readonly accepted: true; readonly state: AdmissionState }>
  | Readonly<{ readonly accepted: false; readonly reason: AdmissionRejectionReason }>;

/**
 * 自定义准入 policy 每轮获得的不可变普通数据快照。
 *
 * 它只提供完整调度图及当前可观察的准入事实，不能启动、取消或结算 Task。
 */
export interface AdmissionPolicyContext {
  /** 已规范化的完整静态调度图；Task metadata 是拓扑和 priority 的唯一来源。 */
  readonly graph: SchedulerGraphSnapshot;
  /** 当前 real decision boundary 的同型假设状态；不能 reservation 或控制 Task。 */
  readonly admissionState: AdmissionState;
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
  /** 全部 named resource capacities，按 resourceId 规范排序。 */
  readonly resourceCapacities: readonly Readonly<{
    /** named resource 的稳定 ID。 */
    readonly resourceId: string;
    /** 本次 invocation 可供原子 claim 的总 units。 */
    readonly units: number;
  }>[];
  /** 全部静态 scopes 的 normalized lifecycle 边界。 */
  readonly scopes: readonly Readonly<{
    /** 选择其中任一列出的 Task 后会激活该 scope。 */
    readonly activationTaskIds: readonly string[];
    /** scope 的稳定 ID。 */
    readonly id: string;
    /** scope active 时允许的最大并行 Task 数。 */
    readonly maxParallel: number;
    /** 结算后关闭该 scope 的 terminal Task ID。 */
    readonly terminalTaskId: string;
  }>[];
  /** 全部 normalized Tasks 及静态 admission metadata。 */
  readonly tasks: readonly Readonly<{
    /** 同一 selection layer 中用于静态排序的 priority。 */
    readonly admissionPriority: number;
    /** 必须以 completed settlement 满足的直接 dependency Task IDs。 */
    readonly dependsOn: readonly string[];
    /** 与 running Tasks 不能同时持有的 mutex IDs。 */
    readonly mutex: readonly string[];
    /** 只要求先结算、但不要求 completed 的直接 observed Task IDs。 */
    readonly observes: readonly string[];
    /** admission 时必须一次性取得的 named resource claims。 */
    readonly resourceClaims: readonly Readonly<{
      /** 被 claim 的 named resource ID。 */
      readonly resourceId: string;
      /** 该 Task 运行期间占用的 units。 */
      readonly units: number;
    }>[];
    /** 所属静态 scope ID；不属于 scope 时为 null。 */
    readonly scopeId: string | null;
    /** Task 在全部 Scheduler DTO 中使用的稳定 ID。 */
    readonly taskId: string;
  }>[];
}

/** 一条已关闭 occupancy interval 对累计值的有界贡献。 */
export interface SchedulerMeasurementIntervalContribution {
  /** admission-viable 且当时可准入的 pending Task 数对 interval 的时间积分。 */
  readonly admissiblePendingTaskMs: number;
  /** 已接受 wait action 在 interval 内实际延续的毫秒数。 */
  readonly acceptedWaitMs: number;
  /** 因 root、scope 或 named resource capacity 不足而阻塞的 pending Task·ms。 */
  readonly capacityBlockedTaskMs: number;
  /** effectiveMaxParallel 对 interval 的 capacity-slot·ms 积分。 */
  readonly effectiveCapacitySlotMs: number;
  /** 因 mutex conflict 而阻塞的 pending Task·ms。 */
  readonly mutexBlockedTaskMs: number;
  /** root maxParallel 对 interval 的 capacity-slot·ms 积分。 */
  readonly rootCapacitySlotMs: number;
  /** running Task 数对 interval 的 Task·ms 积分。 */
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
  /** normalized declarative Definition 的匹配 fingerprint；不包含 controls 或 runtime facts。 */
  readonly declarativeFingerprint: string;
  /** 当前 boundary 前已累计的离散 Scheduler 计数。 */
  readonly discrete: Readonly<{
    /** Scheduler 已接受的 wait proposals 数。 */
    readonly acceptedWaitCount: number;
    /** 已实际 admission 的不同 Task 数。 */
    readonly admittedCount: number;
    /** 已观察到的最大同时 running Task 数。 */
    readonly maxRunning: number;
  }>;
  /** 可来自不同 boundary、不能相加的 admission queue 峰值。 */
  readonly peaks: SchedulerMeasurementPeakCounts;
}

interface AvailableSchedulerDecisionMeasurementCumulative extends SchedulerDecisionMeasurementCumulativeFacts {
  /** available 表示本 branch 的累计 timingFacts 可读。 */
  readonly timing: Readonly<{ readonly availability: "available" }>;
  /** decision boundary 前已累计的 timing integrals。 */
  readonly timingFacts: Readonly<{
    /** 已接受 wait action 累计延续的毫秒数。 */
    readonly acceptedWaitMs: number;
    /** effective capacity slot 的累计毫秒积分。 */
    readonly effectiveCapacitySlotMs: number;
    /** root capacity slot 的累计毫秒积分。 */
    readonly rootCapacitySlotMs: number;
    /** running Task slot 的累计毫秒积分。 */
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
  /** 任一 boundary 上全部 admission-viable pending Tasks 的最大数量。 */
  readonly admissionViablePendingTaskCount: number;
  /** 任一 boundary 上可立即准入的 pending Tasks 最大数量。 */
  readonly admissiblePendingTaskCount: number;
  /** 任一 boundary 上 capacity-blocked pending Tasks 最大数量。 */
  readonly capacityBlockedTaskCount: number;
  /** 任一 boundary 上 mutex-blocked pending Tasks 最大数量。 */
  readonly mutexBlockedTaskCount: number;
}

export interface SchedulerMeasurementAdmission {
  /** 该 Task 在 admission-viable pending 期间的互斥 delay 分类积分。 */
  readonly admissionDelay: Readonly<{
    /** Task 可准入但仍 pending 的累计毫秒数。 */
    readonly admissiblePendingMs: number;
    /** Task 因 capacity 不足仍 pending 的累计毫秒数。 */
    readonly capacityBlockedMs: number;
    /** Task 因 mutex conflict 仍 pending 的累计毫秒数。 */
    readonly mutexBlockedMs: number;
  }>;
  /** Scheduler monotonic-clock timestamp in milliseconds, or no admission occurred. */
  readonly admittedAtMonotonicMs: number | null;
  /** Scheduler monotonic-clock timestamp in milliseconds, or no settlement occurred. */
  readonly settledAtMonotonicMs: number | null;
  /** 被测 Task 的稳定 ID。 */
  readonly taskId: string;
}

export interface SchedulerMeasurementTimingFacts {
  /** 已接受 wait action 累计延续的毫秒数。 */
  readonly acceptedWaitMs: number;
  /** 进入过 admission-viable pending 集合的逐 Task timing facts。 */
  readonly admissions: readonly SchedulerMeasurementAdmission[];
  /** effective capacity slot 的累计毫秒积分。 */
  readonly effectiveCapacitySlotMs: number;
  /** Terminal Scheduler monotonic-clock timestamp in milliseconds. */
  readonly endedAtMonotonicMs: number;
  /** root capacity slot 的累计毫秒积分。 */
  readonly rootCapacitySlotMs: number;
  /** Scheduler 同步 shell control operations 内累计的毫秒数。 */
  readonly schedulerControlPathMs: number;
  /** decision diagnostic observation work 内累计的毫秒数。 */
  readonly schedulerDecisionObservationMs: number;
  /** First Scheduler monotonic-clock timestamp in milliseconds. */
  readonly startedAtMonotonicMs: number;
  /** running Task slot 的累计毫秒积分。 */
  readonly taskSlotMs: number;
}

interface SchedulerRawMeasurementFacts {
  /** normalized declarative Definition 的匹配 fingerprint；不包含 controls 或 runtime facts。 */
  readonly declarativeFingerprint: string;
  /** 即使 timing unavailable 也保留的离散终态事实。 */
  readonly discrete: Readonly<{
    /** Scheduler 已接受的 wait proposals 数。 */
    readonly acceptedWaitCount: number;
    /** 已实际 admission 的不同 Task 数。 */
    readonly admittedCount: number;
    /** 最后一次 admission 后当时仍 active 的完整 Task ID 集合。 */
    readonly completionTailActiveTaskIds: readonly string[];
    /** 最后结算的 Task ID；没有 settlement 时为 null。 */
    readonly lastSettledTaskId: string | null;
    /** 已观察到的最大同时 running Task 数。 */
    readonly maxRunning: number;
  }>;
  /** 可来自不同 boundary、不能相加的 admission queue 峰值。 */
  readonly peaks: SchedulerMeasurementPeakCounts;
}

interface AvailableSchedulerRawMeasurement extends SchedulerRawMeasurementFacts {
  /** available 表示完整终态 timingFacts 可读。 */
  readonly timing: Readonly<{ readonly availability: "available" }>;
  /** 基于 Scheduler monotonic clock 形成的完整终态 timing facts。 */
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
  /** 本次 Scheduler 实际使用的 normalized frozen graph。 */
  readonly graph: SchedulerGraphSnapshot;
  /** 不含 Task value、Check result 或 error 的终态 execution 投影。 */
  readonly execution: Readonly<{
    /** 至少实际启动过一次的 Task IDs，按首次 admission 顺序。 */
    readonly admittedTaskIds: readonly string[];
    /** graph 中每个 Task 的终态 Scheduler settlement，按 canonical Task 顺序。 */
    readonly settledTasks: readonly Readonly<{
      /** Scheduler settlement kind；completed 不等同于 Check passed。 */
      readonly kind:
        | "completed"
        | "prerequisite-unsatisfied"
        | "failed"
        | "blocked"
        | "cancelled-before-start";
      /** 已结算 Task 的稳定 ID。 */
      readonly taskId: string;
    }>[];
  }>;
  /** Scheduler-owned 一阶计数与可选 timing facts。 */
  readonly rawMeasurement: SchedulerRawMeasurement;
}

/** 一次 terminal Scheduler measurement 的 caller-owned sync/async consumer。 */
export type SchedulerMeasurementHook =
  | ((this: void, context: SchedulerMeasurementContext) => void)
  | ((this: void, context: SchedulerMeasurementContext) => Promise<void>);

/** 定义级的 Scheduler 预算、admission policy 与终态 measurement consumer。 */
export interface SchedulerPolicy {
  /** normalized static、custom 或 learned-critical-path admission policy。 */
  readonly admissionPolicy: AdmissionPolicy;
  /** 同时 running 的 root Check 上限。 */
  readonly maxParallel: number;
  /** terminal measurement 的 caller-owned consumers，按配置顺序调用。 */
  readonly measurementHooks: readonly SchedulerMeasurementHook[];
  /** 本次 Definition 中可由 Check 原子占用的 named resource 总 units。 */
  readonly resourceCapacities: Readonly<Record<string, number>>;
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
  readonly resourceCapacities: Readonly<Record<string, number>>;
}

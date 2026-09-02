import { createHash } from "node:crypto";

import { resolveCheckTree, type ResolvedCheckTreeLeaf } from "./check-tree/resolution.ts";
import type { MeaninglessCheckWarning } from "./check-tree/authoring.ts";
import type { CheckDescriptor } from "../check/descriptor.ts";
import type { Check, CheckExecution, CheckPreflight, CheckVisibility } from "../check/check.ts";
import { DEFAULT_PROJECT_OUTPUTS } from "./output-defaults.ts";
import { isNonArrayRecord } from "../data-boundary/value-shapes.ts";

/** 一次 Project Run 的明确输出配置。 */
export interface ProjectOutputs {
  /** `run.json` 与 `records.ndjson` publication。 */
  readonly machinePublication: Readonly<{
    /** 相对目录从 project root 解析；绝对目录直接作为 target，默认 `artifacts/vibe-check`。 */
    readonly directory: string;
    /** `false` 时本次 Run 不发布 machine output。 */
    readonly enabled: boolean;
  }>;
  /** 人读 progress rendering。 */
  readonly progressRendering: Readonly<{
    /** `false` 时不构造或写入 progress writer。 */
    readonly enabled: boolean;
  }>;
  /** 仅供维护者读取的一次 invocation diagnostic log。 */
  readonly diagnosticLogging: Readonly<{
    /** 相对目录从 project root 解析；绝对目录直接作为 target，默认 `.log/vibe-check`。 */
    readonly directory: string;
    /** `false` 时不创建 diagnostic writer 或 file。 */
    readonly enabled: boolean;
  }>;
}

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
  readonly graph: Readonly<{
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
  }>;
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
  /** 本轮与生命周期有关的最小只读事实。 */
  readonly runtime: Readonly<{
    readonly abortRequested: boolean;
    readonly cancelled: boolean;
  }>;
}

/** Definition authoring 的 closed admission policy；custom callback 必须同步返回 {@link AdmissionProposal}。 */
export type AdmissionPolicy =
  | Readonly<{ readonly kind: "static" }>
  | Readonly<{
      readonly kind: "custom";
      readonly proposeAdmission: (this: void, context: AdmissionPolicyContext) => AdmissionProposal;
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
  readonly graph: Readonly<{
    readonly scopes: readonly Readonly<{
      readonly activationTaskIds: readonly string[];
      readonly id: string;
      readonly maxParallel: number;
      readonly terminalTaskId: string;
    }>[];
    readonly tasks: readonly Readonly<{
      readonly admissionPriority: number;
      readonly dependsOn: readonly string[];
      readonly id: string;
      readonly mutex: readonly string[];
      readonly observes: readonly string[];
      readonly scopeId: string | null;
    }>[];
  }>;
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

interface DeclarativeSchedulerPolicy {
  readonly admissionPolicy: Readonly<{
    readonly kind: AdmissionPolicy["kind"];
  }>;
  readonly maxParallel: number;
}
/** 已补齐默认 outputs、可交给 run 执行的项目定义。 */
export interface ProjectDefinition {
  readonly apiVersion: "1";
  readonly checks: readonly Check[];
  readonly outputs: ProjectOutputs;
  readonly scheduler: SchedulerPolicy;
}
type ProjectDefinitionInput = Readonly<{
  apiVersion?: "1";
  checks?: readonly Check[];
  outputs?: Partial<{
    machinePublication: Partial<ProjectOutputs["machinePublication"]>;
    progressRendering: Partial<ProjectOutputs["progressRendering"]>;
    diagnosticLogging: Partial<ProjectOutputs["diagnosticLogging"]>;
  }>;
  scheduler?: Partial<SchedulerPolicy>;
}>;
export interface ProjectDefinitionDiagnostic {
  readonly kind: "invalid-project-definition";
  readonly path: string;
  readonly reason: "invalid-value" | "unknown-key";
}
export type DefinitionWarning = MeaninglessCheckWarning;
export type ProjectDefinitionValidationResult = Readonly<
  | {
      readonly ok: true;
      readonly value: ProjectDefinition;
      readonly warnings: readonly DefinitionWarning[];
    }
  | { readonly ok: false; readonly error: ProjectDefinitionDiagnostic }
>;
export interface NormalizedCheckDeclaration {
  readonly admissionPriority: number;
  readonly definition: CheckDescriptor;
  readonly dependsOn: readonly string[];
  readonly maxParallel: number;
  readonly mutex: readonly string[];
  readonly observes: readonly string[];
  readonly options: object;
  readonly visibility: CheckVisibility;
}
export interface NormalizedCheck extends NormalizedCheckDeclaration {
  readonly execution: CheckExecution;
  readonly preflight?: CheckPreflight;
}
export interface DeclarativeProjectSnapshot {
  readonly apiVersion: "1";
  readonly checks: readonly NormalizedCheckDeclaration[];
  readonly outputs: ProjectOutputs;
  readonly scheduler: DeclarativeSchedulerPolicy;
}
export interface NormalizedProjectDefinition {
  readonly checks: readonly NormalizedCheck[];
  readonly declarative: DeclarativeProjectSnapshot;
  readonly definitionWarnings: readonly DefinitionWarning[];
  /** Runtime scheduler policy；custom callback 保留在此处，不进入 declarative snapshot。 */
  readonly scheduler: SchedulerPolicy;
}
const STATIC_ADMISSION_POLICY: AdmissionPolicy = Object.freeze({
  kind: "static"
});
type ExactAdmissionPolicy<T extends AdmissionPolicy> =
  T extends Readonly<{ readonly kind: "static" }>
    ? T & Record<Exclude<keyof T, "kind">, never>
    : T extends Readonly<{ readonly kind: "custom" }>
      ? T & Record<Exclude<keyof T, "kind" | "proposeAdmission">, never>
      : never;

/**
 * 为 custom admission policy 保留 callback/context 的 TypeScript inference，不创建额外运行语义。
 *
 * @remarks inline `{ kind: "custom", proposeAdmission }` 与此 helper 的结果完全等价；callback 会在
 * Run 中以调用方 closure 同步调用，重叠 Run 的可重入性由调用方负责。
 */
export function defineAdmissionPolicy<const T extends AdmissionPolicy>(
  policy: ExactAdmissionPolicy<T>
): T {
  return policy;
}

/** 使用 Product 默认输出创建普通 Project Definition。 */
export function defineConfig<const T extends ProjectDefinitionInput>(
  value: T & Record<Exclude<keyof T, keyof ProjectDefinitionInput>, never>
): ProjectDefinition {
  return {
    apiVersion: value.apiVersion ?? "1",
    checks: value.checks ?? [],
    outputs: {
      machinePublication: {
        directory:
          value.outputs?.machinePublication?.directory ??
          DEFAULT_PROJECT_OUTPUTS.machinePublication.directory,
        enabled:
          value.outputs?.machinePublication?.enabled ??
          DEFAULT_PROJECT_OUTPUTS.machinePublication.enabled
      },
      progressRendering: {
        enabled:
          value.outputs?.progressRendering?.enabled ??
          DEFAULT_PROJECT_OUTPUTS.progressRendering.enabled
      },
      diagnosticLogging: {
        directory:
          value.outputs?.diagnosticLogging?.directory ??
          DEFAULT_PROJECT_OUTPUTS.diagnosticLogging.directory,
        enabled:
          value.outputs?.diagnosticLogging?.enabled ??
          DEFAULT_PROJECT_OUTPUTS.diagnosticLogging.enabled
      }
    },
    scheduler: {
      admissionPolicy: value.scheduler?.admissionPolicy ?? STATIC_ADMISSION_POLICY,
      maxParallel: value.scheduler?.maxParallel ?? 4,
      measurementHooks: value.scheduler?.measurementHooks ?? []
    }
  };
}
export function normalizeProjectDefinition(
  definition: ProjectDefinition
): NormalizedProjectDefinition {
  const tree = resolveCheckTree(definition.checks, definition.scheduler.maxParallel);
  if (tree === undefined)
    throw new TypeError("Project Definition Check tree failed closed normalization");
  const checks = Object.freeze(tree.leaves.map(normalizeCheck));
  return Object.freeze({
    checks,
    declarative: freezeDeclarativeSnapshot(definition, checks),
    definitionWarnings: tree.warnings,
    scheduler: normalizeSchedulerPolicy(definition.scheduler)
  });
}
function normalizeCheck(leaf: ResolvedCheckTreeLeaf): NormalizedCheck {
  return Object.freeze({
    admissionPriority: leaf.admissionPriority,
    definition: leaf.definition,
    dependsOn: leaf.dependsOn,
    execution: leaf.execution,
    maxParallel: leaf.maxParallel,
    mutex: leaf.mutex,
    observes: leaf.observes,
    options: leaf.options,
    ...(leaf.preflight === undefined ? {} : { preflight: leaf.preflight }),
    visibility: leaf.visibility
  });
}
export function createDeclarativeFingerprint(snapshot: DeclarativeProjectSnapshot): string {
  return createHash("sha256").update(stableJson(snapshot)).digest("hex");
}
function freezeDeclarativeSnapshot(
  definition: ProjectDefinition,
  checks: readonly NormalizedCheck[]
): DeclarativeProjectSnapshot {
  const declarations = checks
    .map(({ execution: _execution, preflight: _preflight, ...declaration }) => declaration)
    .sort((left, right) => compareText(left.definition.checkId, right.definition.checkId));
  return deepFreeze({
    apiVersion: definition.apiVersion,
    checks: declarations,
    outputs: definition.outputs,
    scheduler: Object.freeze({
      admissionPolicy: Object.freeze({
        kind: definition.scheduler.admissionPolicy.kind
      }),
      maxParallel: definition.scheduler.maxParallel
    })
  });
}
function normalizeSchedulerPolicy(policy: SchedulerPolicy): SchedulerPolicy {
  const admissionPolicy =
    policy.admissionPolicy.kind === "static"
      ? STATIC_ADMISSION_POLICY
      : Object.freeze({
          kind: "custom" as const,
          proposeAdmission: policy.admissionPolicy.proposeAdmission
        });
  return Object.freeze({
    admissionPolicy,
    maxParallel: policy.maxParallel,
    measurementHooks: Object.freeze([...policy.measurementHooks])
  });
}
function compareText(left: string, right: string): number {
  if (left < right) return -1;
  if (left > right) return 1;
  return 0;
}
function deepFreeze<T>(value: T): T {
  if (typeof value !== "object" || value === null || Object.isFrozen(value)) return value;
  for (const item of Object.values(value)) deepFreeze(item);
  return Object.freeze(value);
}
function stableJson(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(stableJson).join(",")}]`;
  if (isNonArrayRecord(value))
    return `{${Object.keys(value)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${stableJson(value[key])}`)
      .join(",")}}`;
  return JSON.stringify(value);
}

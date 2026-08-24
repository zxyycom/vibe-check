import type {
  CheckAggregate,
  DefinitionWarning,
  ProjectDefinitionDiagnostic,
  RunControls
} from "../definition/project-definition.ts";
import type { CheckMessageLevel } from "../definition/custom-check.ts";
import type { CoreSnapshot } from "../core/facts.ts";
import type { RunEffectStatuses } from "./effects.ts";

/** `planning` 或 `execution` Run result 中的 Product diagnostic。 */
export type RunDiagnostic = Readonly<{
  /** Run 停在 planning 或 execution 的稳定 Product diagnostic code。 */
  readonly code: "task-graph-invalid" | "task-engine-failed" | "publication-model-failed";
}>;

/** canonical Core Check 的一项 Product-measured execution duration。 */
export type CheckDuration = Readonly<{
  /** 与 snapshot 顺序一一对应的 Check ID。 */
  readonly checkId: string;
  /** 未开始或无法计量时为 `null` 的毫秒数。 */
  readonly durationMs: number | null;
}>;

/** 按 canonical Check、再按 author item 顺序排列的 detached terminal message。 */
export interface CheckRunMessage {
  /** 产生消息的 Check ID。 */
  readonly checkId: string;
  /** 原 Check message 的 severity。 */
  readonly level: CheckMessageLevel;
  /** owning Check namespace 内的稳定 message code。 */
  readonly code: string;
  /** 已接受、未经 presentation 转义的 author message。 */
  readonly message: string;
}

/** `completed` 与 post-model `effect` result 共享的 final snapshot facts。 */
export interface RunResultFacts {
  /** 未请求 aggregation 时为 `null` 的 invocation aggregate。 */
  readonly aggregate: CheckAggregate | null;
  /** 与 snapshot Check rows 对齐的 canonical-order durations。 */
  readonly checkDurations: readonly CheckDuration[];
  /** 已接受的 terminal messages；不存在于 machine publication 中。 */
  readonly checkMessages: readonly CheckRunMessage[];
  /** Core materialize 并冻结的完整 Check/Record facts。 */
  readonly snapshot: CoreSnapshot;
}

/**
 * {@link run} 的可判别 invocation result。
 *
 * @remarks 先按 `kind` 处理 configuration、planning、cancellation、execution 与 effect 边界。
 * 只有 `completed` 和 `effect` 有完整 final snapshot；`cancelled` 仅在 `phase: "execution"` 时有
 * 已完成的 snapshot facts。
 */
export type RunResult = Readonly<
  | {
      /** Definition 或 Run Controls 未通过闭合 validation。 */
      readonly kind: "configuration";
      /** validation 前后发现但不阻止返回 diagnostic 的 Definition warnings。 */
      readonly definitionWarnings: readonly DefinitionWarning[];
      /** 指向无效 input path 的 validation diagnostic。 */
      readonly diagnostic: ProjectDefinitionDiagnostic;
    }
  | {
      /** Check graph 无法进入 execution planning。 */
      readonly kind: "planning";
      /** 已验证 declarative definition 的 stable fingerprint。 */
      readonly declarativeFingerprint: string;
      /** 已规范化 Definition 的 non-fatal warnings。 */
      readonly definitionWarnings: readonly DefinitionWarning[];
      /** planning failure 的 Product diagnostic。 */
      readonly diagnostic: RunDiagnostic;
      /** 每个 effect 在 failure point 的状态。 */
      readonly effects: RunEffectStatuses;
    }
  | {
      /** 工作开始前或 planning 期间收到 cancellation。 */
      readonly kind: "cancelled";
      /** 已验证 declarative definition 的 stable fingerprint。 */
      readonly declarativeFingerprint: string;
      /** 已规范化 Definition 的 non-fatal warnings。 */
      readonly definitionWarnings: readonly DefinitionWarning[];
      /** 每个 effect 在 cancellation point 的状态。 */
      readonly effects: RunEffectStatuses;
      /** 尚未产生 snapshot facts 的 cancellation 阶段。 */
      readonly phase: "pre-work" | "planning";
    }
  | {
      /** execution 已开始后收到 cancellation。 */
      readonly kind: "cancelled";
      /** 已验证 declarative definition 的 stable fingerprint。 */
      readonly declarativeFingerprint: string;
      /** 已规范化 Definition 的 non-fatal warnings。 */
      readonly definitionWarnings: readonly DefinitionWarning[];
      /** 每个 effect 在 cancellation point 的状态。 */
      readonly effects: RunEffectStatuses;
      /** 区别于无 snapshot 的早期 cancellation。 */
      readonly phase: "execution";
      /** 已结算或未开始 Check 的 canonical-order durations。 */
      readonly checkDurations: readonly CheckDuration[];
      /** 已接受的 terminal messages。 */
      readonly checkMessages: readonly CheckRunMessage[];
      /** cancellation 时关闭的 Core facts。 */
      readonly snapshot: CoreSnapshot;
    }
  | ({
      /** 全部 execution 与 effects 成功完成。 */
      readonly kind: "completed";
      /** 已验证 declarative definition 的 stable fingerprint。 */
      readonly declarativeFingerprint: string;
      /** 已规范化 Definition 的 non-fatal warnings。 */
      readonly definitionWarnings: readonly DefinitionWarning[];
      /** 每个已完成 effect 的状态。 */
      readonly effects: RunEffectStatuses;
    } & RunResultFacts)
  | {
      /** 受信任 execution path 无法完成。 */
      readonly kind: "execution";
      /** 已验证 declarative definition 的 stable fingerprint。 */
      readonly declarativeFingerprint: string;
      /** 已规范化 Definition 的 non-fatal warnings。 */
      readonly definitionWarnings: readonly DefinitionWarning[];
      /** execution failure 的 Product diagnostic。 */
      readonly diagnostic: RunDiagnostic;
      /** 每个 effect 在 execution failure point 的状态。 */
      readonly effects: RunEffectStatuses;
    }
  | ({
      /** final snapshot 已完成，但至少一个 presentation effect 失败。 */
      readonly kind: "effect";
      /** 已验证 declarative definition 的 stable fingerprint。 */
      readonly declarativeFingerprint: string;
      /** 已规范化 Definition 的 non-fatal warnings。 */
      readonly definitionWarnings: readonly DefinitionWarning[];
      /** 标识失败 effect 的稳定 diagnostic。 */
      readonly diagnostic: Readonly<{
        /** 最先决定 result 的失败 effect。 */
        readonly effect: keyof RunEffectStatuses;
        /** 当前唯一的 effect failure code。 */
        readonly code: "effect-failed";
      }>;
      /** 每个 effect 的最终状态。 */
      readonly effects: RunEffectStatuses;
    } & RunResultFacts)
>;

export function effectFailure(
  declarativeFingerprint: string,
  definitionWarnings: readonly DefinitionWarning[],
  effects: RunEffectStatuses,
  effect: keyof RunEffectStatuses,
  facts: RunResultFacts
): RunResult {
  return Object.freeze({
    kind: "effect",
    declarativeFingerprint,
    definitionWarnings,
    diagnostic: Object.freeze({ effect, code: "effect-failed" }),
    effects,
    ...facts
  });
}

export function isCancelled(controls: RunControls): boolean {
  return controls.signal?.aborted === true;
}

export function planning(
  declarativeFingerprint: string,
  definitionWarnings: readonly DefinitionWarning[],
  effects: RunEffectStatuses,
  code: Extract<RunDiagnostic["code"], "task-graph-invalid">
): RunResult {
  return Object.freeze({
    kind: "planning",
    declarativeFingerprint,
    definitionWarnings,
    diagnostic: Object.freeze({ code }),
    effects
  });
}

export function preExecutionCancellation(
  declarativeFingerprint: string,
  definitionWarnings: readonly DefinitionWarning[],
  effects: RunEffectStatuses,
  phase: "pre-work" | "planning"
): RunResult {
  return Object.freeze({
    kind: "cancelled",
    declarativeFingerprint,
    definitionWarnings,
    effects,
    phase
  });
}

export function executionCancellation(
  declarativeFingerprint: string,
  definitionWarnings: readonly DefinitionWarning[],
  effects: RunEffectStatuses,
  snapshot: CoreSnapshot,
  checkDurations: readonly CheckDuration[],
  checkMessages: readonly CheckRunMessage[]
): RunResult {
  return Object.freeze({
    kind: "cancelled",
    declarativeFingerprint,
    definitionWarnings,
    effects,
    phase: "execution",
    checkDurations,
    checkMessages,
    snapshot
  });
}

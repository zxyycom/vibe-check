import type {
  DefinitionWarning,
  ProjectDefinitionDiagnostic
} from "../project-definition/project-definition.ts";
import type { RunControlDiagnostic } from "./controls/validation-result.ts";
import type { CheckAggregate, RunControls } from "./controls/contract.ts";
import type { CheckMessageLevel } from "../check/check.ts";
import type { CoreSnapshot } from "../check-settlement/facts.ts";
import type { RunOutputStatuses } from "./outputs/status.ts";

/** Product 不能形成正常 Run 结果时的稳定 invocation diagnostic。 */
export type RunDiagnostic = Readonly<{
  /** 失败的 Run-owned execution 或 planning boundary；它不是任何 Check 的 terminal status。 */
  readonly code:
    | "admission-policy-failed"
    | "admission-strategy-preparation-failed"
    | "task-graph-invalid"
    | "task-engine-failed"
    | "publication-model-failed";
}>;

/** 一项 executable Check 的最终 duration readback。 */
export type CheckDuration = Readonly<{
  /** 与 snapshot 中 Check facts 相同的 stable Check identity。 */
  readonly checkId: string;
  /** 已测量的 execution duration；未进入 execution 的 Check 为 `null`，不是零时长。 */
  readonly durationMs: number | null;
}>;

/** Run 在 Check terminal lifecycle 中接受的人读 message。 */
export interface CheckRunMessage {
  /** 产生 message 的 stable Check identity。 */
  readonly checkId: string;
  /** author message 或已捕获 console output 的 presentation severity。 */
  readonly level: CheckMessageLevel;
  /** owning Check 或 Product capture 使用的稳定 message code。 */
  readonly code: string;
  /** 人读正文；不能代替 snapshot 中的 terminal outcome。 */
  readonly message: string;
}

/** 只有已形成 terminal Check facts 的 Run branch 才具备的完整结果 readback。 */
export interface RunResultFacts {
  /** 调用方未配置 aggregation 时为 `null`；否则是选中 Check statuses 的 invocation-level conclusion。 */
  readonly aggregate: CheckAggregate | null;
  /** 按 canonical Check order 的 duration facts；未执行 Check 仍以 `null` 保留。 */
  readonly checkDurations: readonly CheckDuration[];
  /** 已接受的 author 与 console-capture messages，不决定 Check outcome。 */
  readonly checkMessages: readonly CheckRunMessage[];
  /** 已结算的完整 Check 与 supplemental Record facts。 */
  readonly snapshot: CoreSnapshot;
}
/** 一次 Project Run 的可判别结果；output failure 保留已结算 facts。 */
export type RunResult = Readonly<
  | {
      /** Definition、RunControls 或 aggregation selection 无效；没有执行任何 Check author callback。 */
      readonly kind: "configuration";
      /** Definition normalization 时仍可报告、但不单独阻止本 branch 的 warning。 */
      readonly definitionWarnings: readonly DefinitionWarning[];
      /** 指向被拒绝 Definition 或 RunControls value 的 closed diagnostic。 */
      readonly diagnostic: ProjectDefinitionDiagnostic | RunControlDiagnostic;
    }
  | {
      /** 配置有效，但 static Check graph 不能进入 execution planning。 */
      readonly kind: "planning";
      /** normalized declarative Definition 的 matching signal；不包含 RunControls 或 outcome。 */
      readonly declarativeFingerprint: string;
      readonly definitionWarnings: readonly DefinitionWarning[];
      /** 这次 planning 失败的 Product diagnostic。 */
      readonly diagnostic: RunDiagnostic;
      /** 配置有效后各 terminal output participant 的独立状态。 */
      readonly outputs: RunOutputStatuses;
    }
  | {
      /** invocation 在 Check work 开始前或 planning 中响应 caller cancellation。 */
      readonly kind: "cancelled";
      readonly declarativeFingerprint: string;
      readonly definitionWarnings: readonly DefinitionWarning[];
      readonly outputs: RunOutputStatuses;
      /** 取消发生在尚未形成 terminal Check facts 的阶段。 */
      readonly phase: "pre-work" | "planning";
    }
  | {
      /** invocation 在至少可能已开始 Check work 的 execution 阶段响应 caller cancellation。 */
      readonly kind: "cancelled";
      readonly declarativeFingerprint: string;
      readonly definitionWarnings: readonly DefinitionWarning[];
      readonly outputs: RunOutputStatuses;
      /** 此 branch 总在 terminal Check facts 形成后的 execution cancellation 返回。 */
      readonly phase: "execution";
      /** 按 canonical Check order 的 duration facts；未执行 Check 为 `null`。 */
      readonly checkDurations: readonly CheckDuration[];
      /** cancellation 前已接受的 author 与 console-capture messages。 */
      readonly checkMessages: readonly CheckRunMessage[];
      /** cancellation 时已结算的完整 Check 与 supplemental Record facts。 */
      readonly snapshot: CoreSnapshot;
    }
  | ({
      /** 所有 Check 已完成 terminal settlement；不表示每项 Check 都 `passed`。 */
      readonly kind: "completed";
      readonly declarativeFingerprint: string;
      readonly definitionWarnings: readonly DefinitionWarning[];
      readonly outputs: RunOutputStatuses;
    } & RunResultFacts)
  | {
      /** Product execution/settlement infrastructure 失败；不把它误表示为 Check `failed`。 */
      readonly kind: "execution";
      readonly declarativeFingerprint: string;
      readonly definitionWarnings: readonly DefinitionWarning[];
      /** 停止正常 execution 的 Product diagnostic；本 branch 不提供 partial snapshot。 */
      readonly diagnostic: RunDiagnostic;
      readonly outputs: RunOutputStatuses;
    }
  | ({
      /** Check facts 已完整结算，但至少一个 terminal output participant 失败。 */
      readonly kind: "output";
      readonly declarativeFingerprint: string;
      readonly definitionWarnings: readonly DefinitionWarning[];
      /** 失败的 machine、progress、diagnostic 或 scheduler-measurement output 类别。 */
      readonly diagnostic: Readonly<{
        readonly code:
          | "machine-publication-failed"
          | "progress-rendering-failed"
          | "diagnostic-logging-failed"
          | "scheduler-measurement-hooks-failed";
      }>;
      readonly outputs: RunOutputStatuses;
    } & RunResultFacts)
>;

/** Any Run result produced after controls and Definition validation have completed. */
export type NonConfigurationRunResult = Exclude<RunResult, { readonly kind: "configuration" }>;

type OutputRunResult = Extract<RunResult, { readonly kind: "output" }>;

export function outputFailure(
  declarativeFingerprint: string,
  definitionWarnings: readonly DefinitionWarning[],
  outputs: RunOutputStatuses,
  output: keyof RunOutputStatuses,
  facts: RunResultFacts
): OutputRunResult {
  return Object.freeze({
    kind: "output",
    declarativeFingerprint,
    definitionWarnings,
    diagnostic: Object.freeze({ code: outputDiagnosticCode(output) }),
    outputs,
    ...facts
  });
}
function outputDiagnosticCode(
  output: keyof RunOutputStatuses
): Extract<RunResult, { readonly kind: "output" }>["diagnostic"]["code"] {
  switch (output) {
    case "machinePublication":
      return "machine-publication-failed";
    case "progressRendering":
      return "progress-rendering-failed";
    case "diagnosticLogging":
      return "diagnostic-logging-failed";
    case "measurementHooks":
      return "scheduler-measurement-hooks-failed";
  }
}

export function isCancelled(controls: RunControls): boolean {
  return controls.signal?.aborted === true;
}
export function planning(
  declarativeFingerprint: string,
  definitionWarnings: readonly DefinitionWarning[],
  outputs: RunOutputStatuses,
  code: Extract<RunDiagnostic["code"], "task-graph-invalid">
): Extract<NonConfigurationRunResult, { readonly kind: "planning" }> {
  return Object.freeze({
    kind: "planning",
    declarativeFingerprint,
    definitionWarnings,
    diagnostic: Object.freeze({ code }),
    outputs
  });
}
export function preExecutionCancellation(
  declarativeFingerprint: string,
  definitionWarnings: readonly DefinitionWarning[],
  outputs: RunOutputStatuses,
  phase: "pre-work" | "planning"
): Extract<
  NonConfigurationRunResult,
  { readonly kind: "cancelled"; readonly phase: "pre-work" | "planning" }
> {
  return Object.freeze({
    kind: "cancelled",
    declarativeFingerprint,
    definitionWarnings,
    outputs,
    phase
  });
}
export function executionCancellation(
  input: Readonly<{
    readonly checkDurations: readonly CheckDuration[];
    readonly checkMessages: readonly CheckRunMessage[];
    readonly declarativeFingerprint: string;
    readonly definitionWarnings: readonly DefinitionWarning[];
    readonly outputs: RunOutputStatuses;
    readonly snapshot: CoreSnapshot;
  }>
): Extract<NonConfigurationRunResult, { readonly kind: "cancelled"; readonly phase: "execution" }> {
  return Object.freeze({
    kind: "cancelled",
    declarativeFingerprint: input.declarativeFingerprint,
    definitionWarnings: input.definitionWarnings,
    outputs: input.outputs,
    phase: "execution",
    checkDurations: input.checkDurations,
    checkMessages: input.checkMessages,
    snapshot: input.snapshot
  });
}

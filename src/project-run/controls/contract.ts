import type { ProjectOutputs } from "../../project-definition/project-definition.ts";
/** 单次 run 调用的闭合上下文与 output override；Project Definition 保持为 authored input。 */
export interface RunControls {
  /** 单次 diagnostic 文件命名；默认 `unique`，独占目录可选 `channel` 使用固定 Core/Scheduler 名，同名目标失败且不覆盖。 */
  readonly diagnosticLogFileNaming?: DiagnosticLogFileNaming;
  /** caller 为当前 Run 选择的 progress log exact target；省略时只写 terminal。 */
  readonly progressLogFile?: string;
  /** caller 选择的 Check-owned invocation artifact base；省略时不授予 artifact capability。 */
  readonly checkArtifactBaseDirectory?: string;
  /** 为本次 Run 选择并折叠 Check statuses；省略时结果的 `aggregate` 为 `null`。 */
  readonly checkAggregation?: CheckAggregation;
  /** 仅为本次调用覆盖 Run-owned outputs。 */
  readonly outputs?: Partial<{
    machinePublication: Partial<ProjectOutputs["machinePublication"]>;
    progressRendering: Partial<ProjectOutputs["progressRendering"]>;
    diagnosticLogging: Partial<ProjectOutputs["diagnosticLogging"]>;
  }>;
  /** 本次 Run 的 flag tokens；Product 去重排序后用于 Check selection 与 callback project context。 */
  readonly flags?: readonly string[];
  /** 项目相对输入与 output target 的解析根；省略时使用调用进程的当前工作目录。 */
  readonly projectRoot?: string;
  /** 供 planning、preflight 与 execution 协作响应的 caller cancellation signal。 */
  readonly signal?: AbortSignal;
}
/** Diagnostic 文件名选择；不改变目录、日志内容或 invocation identity。 */
export type DiagnosticLogFileNaming = "unique" | "channel";
/** 将选定 Check statuses 折叠为 invocation aggregate 的规则。 */
export interface CheckAggregation {
  /** `all` 选择全部 Check，ID 数组选择明确集合，`effective` 复用本 invocation 的 flag-and-dependency selection。 */
  readonly checks: "all" | "effective" | readonly string[];
  /** `all` 要求所有纳入状态通过；`any` 只要求至少一个纳入状态通过。 */
  readonly mode: "all" | "any";
  /** 将 `unavailable` 原样传播、按失败纳入，或从 `all`/`any` 计算中排除。 */
  readonly unavailable: "propagate" | "fail" | "exclude";
  /** 将 `not-applicable` 从计算中排除，或按通过/失败纳入。 */
  readonly notApplicable: "exclude" | "pass" | "fail";
  /** 选择为空或所有状态都被排除时返回的明确 aggregate。 */
  readonly empty: "passed" | "failed" | "not-applicable";
}
/** `CheckAggregation` 计算出的 invocation 级结果。 */
export type CheckAggregate = "passed" | "failed" | "not-applicable" | "unavailable";

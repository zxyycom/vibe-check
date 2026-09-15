import type { ProjectOutputs } from "../../project-definition/project-definition.ts";
import type { CoreCheck } from "../../check-settlement/facts.ts";
/**
 * `run(definition, controls?)` 的第二个参数，只指定这一次怎么运行。
 *
 * root、flags、signal、Check 产物与日志目标以及 aggregation 属于本次调用；`outputs` 只逐字段
 * 覆盖 Definition 的输出默认值，不修改原 Definition。Checks、Check options 与 scheduler 仍在
 * `defineConfig(...)` 中声明，不能从这里替换；这些 Controls 不进入 Definition fingerprint。
 */
export interface RunControls {
  /** 单次 diagnostic 文件命名；默认 `unique`，独占目录可选 `channel` 使用固定 Core/Scheduler 名，同名目标失败且不覆盖。 */
  readonly diagnosticLogFileNaming?: DiagnosticLogFileNaming;
  /** caller 为当前 Run 选择的 progress log exact target；省略时只写 terminal。 */
  readonly progressLogFile?: string;
  /** caller 选择的 Check-owned invocation artifact base；省略时不授予 artifact capability。 */
  readonly checkArtifactBaseDirectory?: string;
  /** 为本次 Run 解释有效 Check facts；省略时使用严格的 all-passed 默认折叠。 */
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
  /** 供 planning、preparation 与 execution 协作响应的 caller cancellation signal。 */
  readonly signal?: AbortSignal;
}
/** Diagnostic 文件名选择；不改变目录、日志内容或 invocation identity。 */
export type DiagnosticLogFileNaming = "unique" | "channel";
/** `CheckAggregation` 计算出的 invocation 级结果。 */
export type CheckAggregate = "passed" | "failed" | "not-applicable" | "unavailable";
/** 同步解释本次有效 Check facts 的 caller-local aggregation。 */
export type CheckAggregation = (checks: readonly CoreCheck[]) => CheckAggregate;

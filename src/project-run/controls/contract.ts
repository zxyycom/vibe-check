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
  /**
   * 为本次 Run 解释有效 Check facts；默认仅在列表非空且全部 passed 时通过，其余为 failed。
   * 自定义函数的异常或非法返回使 `run` 的 Promise 拒绝，详见 {@link CheckAggregation}。
   */
  readonly checkAggregation?: CheckAggregation;
  /** 仅为本次调用覆盖 Run-owned outputs。 */
  readonly outputs?: Partial<{
    machinePublication: Partial<ProjectOutputs["machinePublication"]>;
    progressRendering: Partial<ProjectOutputs["progressRendering"]>;
    diagnosticLogging: Partial<ProjectOutputs["diagnosticLogging"]>;
  }>;
  /**
   * 本次 Run 的非空普通 caller tokens；Product 去重排序后用于 selection 与 callback project context。
   * 禁止传入保留的 `vibe-check:change:` 前缀；change flags 由 Product 根据 Git evidence 派生。
   * @see [按文件变化选择 Check](../../../docs/api-mechanics.md#按文件变化选择-check)
   */
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
/**
 * 在完整结算后，同步解释本次有效 Check 列表；返回值为 invocation 级结果。
 * 抛错、返回 Promise/thenable 或非法四态值会使 `run` 的 Promise 直接拒绝，而非返回 `RunResult` 分支。
 * @see [RunControls 与 Check aggregation](../../../docs/api-mechanics.md#runcontrols-与-check-aggregation)
 */
export type CheckAggregation = (checks: readonly CoreCheck[]) => CheckAggregate;

import type { ProjectDefinition } from "../project-definition/project-definition.ts";
import type { RunControls } from "./controls/contract.ts";
import { ValidatedProjectDefinition } from "../project-definition/project-definition-validation.ts";
import { validateRunControls } from "./controls/validation.ts";
import { executePreparedRun } from "./invocation/run.ts";
import type { RunResult } from "./result.ts";

export type { RunOutputStatus, RunOutputStatuses } from "./outputs/status.ts";
export type { RunDiagnostic, RunResult } from "./result.ts";

/**
 * 在调用方的 Node runtime 中执行一个由项目拥有的 Project Definition。
 *
 * @param definition - Project Definition input；`defineConfig` 补齐 defaults，run 在 invocation 前验证。
 * @param controls - 本次 invocation context 与 outputs 使用的闭合控制值。
 * @returns ordinary configuration、planning、execution、cancellation 与 output failures 通过 `RunResult`
 * 返回；调用方先按 `kind` narrow。
 * @throws 调用方的 `checkAggregation` 抛错或返回非法值时，Promise 直接拒绝；调用方须另行处理此错误边界。
 * @remarks 启动前执行 Definition validation。每个 Check 的可选 preparation 在直接关系就绪且自身 Task
 * 获 Scheduler 准入后运行，先于自己的 execution callback，并受该 Task 的 mutex、capacity、priority
 * 与 cancellation 约束。`output` 分支同时提供完整 final snapshot 与 output failure diagnostic。
 * @see [defineConfig 默认输出与本次覆盖](../../docs/guides/run-outputs.md#默认输出与本次覆盖)
 * @see [RunControls 与 Check aggregation](../../docs/api-mechanics.md#runcontrols-与-check-aggregation)
 */
export async function run(
  definition: ProjectDefinition,
  controls?: RunControls
): Promise<RunResult>;
export async function run(definition: unknown, controls?: unknown): Promise<RunResult>;
export async function run(definition: unknown, controls: unknown = {}): Promise<RunResult> {
  const validatedDefinition = ValidatedProjectDefinition.validate(definition);
  if (!validatedDefinition.ok) {
    return Object.freeze({
      kind: "configuration",
      definitionWarnings: Object.freeze([]),
      diagnostic: validatedDefinition.error
    });
  }
  const validatedControls = validateRunControls(controls);
  if (!validatedControls.ok) {
    return Object.freeze({
      kind: "configuration",
      definitionWarnings: Object.freeze([]),
      diagnostic: validatedControls.error
    });
  }

  return executePreparedRun(validatedDefinition.value, validatedControls.value);
}

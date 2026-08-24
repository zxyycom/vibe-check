import type { ProjectDefinition, RunControls } from "../definition/project-definition.ts";
import { validateProjectDefinition } from "../definition/project-definition-validation.ts";
import { validateRunControls } from "./control-validation.ts";
import { executeValidatedRun } from "./invocation.ts";
import type { RunResult } from "./run-result.ts";

export type { RunEffectStatus, RunEffectStatuses } from "./effects.ts";
export type { RunDiagnostic, RunResult } from "./run-result.ts";

/**
 * 在调用方的 Bun runtime 中执行一个由项目拥有的 Project Definition。
 *
 * @param definition - 由 {@link defineConfig} 创建的定义，或将在 invocation 前 fail closed 的未知输入。
 * @param controls - 只影响本次 invocation context 和 effects 的闭合控制值。
 * @returns ordinary configuration、planning、execution、cancellation 与 effect failures 通过 `RunResult`
 * 返回；调用方先按 `kind` narrow。
 * @remarks validation 是 project callback、dependency resolver、cache、scanner 或 reporter 运行前的唯一
 * 入口工作。`effect` branch 保留已完成的 final snapshot，但不能当作完全成功。
 */
export async function run(
  definition: ProjectDefinition,
  controls?: RunControls
): Promise<RunResult>;
export async function run(definition: unknown, controls?: unknown): Promise<RunResult>;
export async function run(definition: unknown, controls: unknown = {}): Promise<RunResult> {
  const validatedDefinition = validateProjectDefinition(definition);
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

  return executeValidatedRun(
    validatedDefinition.value,
    validatedControls.value,
    validatedDefinition.warnings
  );
}

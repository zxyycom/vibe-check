import type { ProjectDefinition } from "../project-definition/project-definition.ts";
import type { RunControls } from "./controls/contract.ts";
import { validateProjectDefinition } from "../project-definition/project-definition-validation.ts";
import { validateRunControls } from "./controls/validation.ts";
import { executeValidatedRun } from "./invocation/run.ts";
import type { RunResult } from "./result.ts";

export type { RunOutputStatus, RunOutputStatuses } from "./outputs/status.ts";
export type { RunDiagnostic, RunResult } from "./result.ts";

/**
 * 在调用方的 Bun runtime 中执行一个由项目拥有的 Project Definition。
 *
 * @param definition - Project Definition input；{@link defineConfig} 补齐 defaults，run 在 invocation 前验证。
 * @param controls - 本次 invocation context 与 outputs 使用的闭合控制值。
 * @returns ordinary configuration、planning、execution、cancellation 与 output failures 通过 `RunResult`
 * 返回；调用方先按 `kind` narrow。
 * @remarks Definition validation 关闭 authoring grammar；可选 Check preflight 在其 Task 通过直接 relation
 * readiness 后被 Scheduler admission 时运行，并先于该 Check 自己的 execution callback。它受该 Task 的
 * mutex、capacity、priority 与 cancellation 约束，而不是 invocation-wide barrier。`output` branch 同时提供
 * 完整 final snapshot 与 output failure diagnostic。
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

import type { ProjectDefinition, RunControls } from "./project-definition.ts";
import { validateProjectDefinition } from "./project-definition-validation.ts";
import { validateRunControls } from "./run-control-validation.ts";
import { executeValidatedRun } from "./run-invocation.ts";
import type { RunResult } from "./run-result.ts";

export type { RunEffectStatus, RunEffectStatuses } from "./run-effects.ts";
export type { RunDiagnostic, RunResult } from "./run-result.ts";

/**
 * Executes one project-owned definition in the caller's runtime.  Validation is
 * deliberately the only work before a project function, dependency resolver,
 * cache, scanner, or reporter can run.
 */
export async function run(
  definition: ProjectDefinition,
  controls?: RunControls
): Promise<RunResult>;
export async function run(definition: unknown, controls?: unknown): Promise<RunResult>;
export async function run(definition: unknown, controls: unknown = {}): Promise<RunResult> {
  const validatedDefinition = validateProjectDefinition(definition);
  if (!validatedDefinition.ok) {
    return Object.freeze({ kind: "configuration", diagnostic: validatedDefinition.error });
  }
  const validatedControls = validateRunControls(controls);
  if (!validatedControls.ok) {
    return Object.freeze({ kind: "configuration", diagnostic: validatedControls.error });
  }

  return executeValidatedRun(validatedDefinition.value, validatedControls.value);
}

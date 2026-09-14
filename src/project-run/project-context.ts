import type { CheckProjectContext, ProjectChanges } from "../check/check.ts";
import type { RunControls } from "./controls/contract.ts";
import type { ResolvedInvocationPaths } from "./invocation/paths.ts";
/** Materializes only invocation-wide callback input; Check-local options own domain configuration. */
export function createProjectContext(
  input: Readonly<{
    readonly changes?: ProjectChanges;
    readonly controls: RunControls;
    readonly paths: ResolvedInvocationPaths;
  }>
): CheckProjectContext {
  return Object.freeze({
    ...(input.changes === undefined ? {} : { changes: input.changes }),
    flags: Object.freeze([...(input.controls.flags ?? [])]),
    root: input.paths.projectRoot
  });
}

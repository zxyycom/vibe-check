import type { CheckProjectContext } from "../check/check.ts";
import type { RunControls } from "./controls/contract.ts";
import type { ResolvedInvocationPaths } from "./invocation-paths.ts";
/** Materializes only invocation-wide callback input; Check-local options own domain configuration. */
export function createProjectContext(
  input: Readonly<{ readonly controls: RunControls; readonly paths: ResolvedInvocationPaths }>
): CheckProjectContext {
  return Object.freeze({
    flags: Object.freeze([...(input.controls.flags ?? [])]),
    root: input.paths.projectRoot
  });
}

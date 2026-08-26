import type { CheckProjectContext } from "../check/check.ts";
import type { RunControls } from "./controls/contract.ts";
/** Materializes only invocation-wide callback input; Check-local options own domain configuration. */
export function createProjectContext(
  input: Readonly<{ readonly controls: RunControls; readonly root: string }>
): CheckProjectContext {
  return Object.freeze({
    changedFiles: snapshotInvocationStrings(input.controls.changedFiles),
    flags: snapshotInvocationStrings(input.controls.flags),
    root: input.root
  });
}
function snapshotInvocationStrings(value: readonly string[] | undefined): readonly string[] {
  return Object.freeze([...(value ?? [])]);
}

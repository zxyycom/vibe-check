import type { CheckProjectContext, ProjectChanges } from "../check/check.ts";

/** Selection reads flags without materializing a callback's project projection. */
export interface CheckProjectContextSource {
  readonly flags: readonly string[];
  readonly getContext: () => CheckProjectContext;
}

/** Owns one Run's lazy frozen project projection; configured Git/flag work remains independent. */
export function createProjectContextSource(
  input: Readonly<{
    readonly changes?: ProjectChanges;
    readonly flags: readonly string[];
    readonly root: string;
  }>
): CheckProjectContextSource {
  let context: CheckProjectContext | undefined;
  return Object.freeze({
    flags: input.flags,
    getContext() {
      context ??= Object.freeze({
        ...(input.changes === undefined ? {} : { changes: input.changes }),
        flags: input.flags,
        root: input.root
      });
      return context;
    }
  });
}

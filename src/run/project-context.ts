import type { CheckProjectContext } from "../definition/custom-check.ts";
import type { ProjectDefinition, RunControls } from "../definition/project-definition.ts";
import type { EffectStatuses } from "./effects.ts";

export interface PreparedProjectContext {
  readonly cleanup: () => void;
  readonly context: CheckProjectContext;
}

/** Materializes the invocation-wide callback context once before Task work. */
export function prepareProjectContext(
  input: Readonly<{
    readonly controls: RunControls;
    readonly definition: ProjectDefinition;
    readonly effects: EffectStatuses;
    readonly effectConfiguration: ProjectDefinition["effects"];
    readonly root: string;
  }>
): PreparedProjectContext {
  return Object.freeze({
    cleanup: (): void => undefined,
    context: Object.freeze({
      cache: Object.freeze({
        directory: input.effectConfiguration.cache.directory,
        enabled: input.effectConfiguration.cache.enabled,
        reportActivity: input.effects.cache
      }),
      changedFiles: snapshotInvocationStrings(input.controls.changedFiles),
      flags: snapshotInvocationStrings(input.controls.flags),
      root: input.root
    })
  });
}

function snapshotInvocationStrings(value: readonly string[] | undefined): readonly string[] {
  return Object.freeze([...(value ?? [])]);
}

import { randomUUID } from "node:crypto";
import { rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import type { CheckProjectContext } from "../definition/custom-check.ts";
import type { ProjectDefinition, RunControls } from "../definition/project.ts";
import {
  materializeBaselineRevision,
  resolveBaselineCommitSha
} from "../quality-core/input/revisions.ts";
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
  const materialized =
    input.controls.comparison === undefined
      ? null
      : materializeComparison(input.root, input.controls.comparison);
  try {
    return Object.freeze({
      cleanup: materialized?.cleanup ?? (() => undefined),
      context: Object.freeze({
        cache: Object.freeze({
          directory: input.effectConfiguration.cache.directory,
          enabled: input.effectConfiguration.cache.enabled,
          reportActivity: input.effects.cache
        }),
        changedFiles: Object.freeze([...(input.controls.changedFiles ?? [])]),
        comparison: materialized?.comparison ?? null,
        files: Object.freeze({
          codeAreas: input.definition.quality.codeAreas,
          excludeDirs: input.definition.quality.excludeDirs,
          generatedFiles: input.definition.quality.generatedFiles,
          include: input.definition.quality.include
        }),
        root: input.root
      })
    });
  } catch (error) {
    materialized?.cleanup();
    throw error;
  }
}

function materializeComparison(
  root: string,
  comparison: NonNullable<RunControls["comparison"]>
): Readonly<{
  readonly cleanup: () => void;
  readonly comparison: NonNullable<CheckProjectContext["comparison"]>;
}> {
  const resolved = resolveBaselineCommitSha({ cwd: root, revision: comparison.revision });
  if (!resolved.ok) throw new TypeError("Explicit comparison revision is unavailable");
  const temporaryRoot = join(tmpdir(), `vibe-check-reference-${randomUUID()}`);
  const materialized = materializeBaselineRevision({
    baselineWorkDir: temporaryRoot,
    commitSha: resolved.commitSha,
    cwd: root
  });
  if (!materialized.ok) {
    rmSync(temporaryRoot, { recursive: true, force: true });
    throw new TypeError("Explicit comparison revision could not be materialized");
  }
  return Object.freeze({
    cleanup: () => rmSync(temporaryRoot, { recursive: true, force: true }),
    comparison: Object.freeze({
      referenceName: comparison.referenceName,
      revision: comparison.revision,
      root: materialized.workDir
    })
  });
}

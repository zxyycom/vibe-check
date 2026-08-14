import { randomUUID } from "node:crypto";
import { rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

import type { ProjectDefinition, RunControls } from "./project-definition.ts";
import { referenceIdentity } from "./run-policy.ts";
import {
  prepareBuiltInExactInputs,
  type BuiltInReferenceInputs
} from "./quality-core/src/engine-input-preparation.ts";
import {
  buildFingerprints,
  collectBaselineFiles,
  collectScanFiles
} from "./quality-core/src/input/files.ts";
import {
  materializeBaselineRevision,
  resolveBaselineCommitSha
} from "./quality-core/src/input/revisions.ts";
import { classifyFiles } from "./quality-core/src/model/code-areas.ts";
import { getGitSha } from "./quality-core/src/scan-command/tool-metadata.ts";

export type BuiltInExactInputs = ReturnType<typeof prepareBuiltInExactInputs>;

export type ComparisonReference = Readonly<{
  readonly cleanup: () => void;
  readonly input: BuiltInReferenceInputs;
}>;

export function prepareCurrentBuiltInInputs(input: Readonly<{
  cacheDirectory: string;
  config: ProjectDefinition["quality"];
  root: string;
}>): BuiltInExactInputs {
  return prepareExactInputs({
    cacheRootDir: resolve(input.root, input.cacheDirectory),
    collectFiles: collectScanFiles,
    config: input.config,
    root: input.root
  });
}

export function prepareComparisonReference(input: Readonly<{
  cacheDirectory: string;
  comparison: NonNullable<RunControls["comparison"]>;
  config: ProjectDefinition["quality"];
  root: string;
}>): ComparisonReference {
  const resolved = resolveBaselineCommitSha({ cwd: input.root, revision: input.comparison.revision });
  if (!resolved.ok) throw new TypeError("Explicit comparison revision is unavailable");
  const temporaryRoot = join(tmpdir(), `vibe-check-reference-${randomUUID()}`);
  const materialized = materializeBaselineRevision({
    baselineWorkDir: temporaryRoot,
    commitSha: resolved.commitSha,
    cwd: input.root
  });
  if (!materialized.ok) {
    rmSync(temporaryRoot, { recursive: true, force: true });
    throw new TypeError("Explicit comparison revision could not be materialized");
  }
  try {
    return Object.freeze({
      cleanup: () => rmSync(temporaryRoot, { recursive: true, force: true }),
      input: Object.freeze({
        ...prepareExactInputs({
          cacheRootDir: resolve(input.root, input.cacheDirectory),
          collectFiles: collectBaselineFiles,
          config: input.config,
          root: materialized.workDir
        }),
        identity: referenceIdentity(input.comparison)
      })
    });
  } catch (error) {
    rmSync(temporaryRoot, { recursive: true, force: true });
    throw error;
  }
}

function prepareExactInputs(input: Readonly<{
  cacheRootDir: string;
  collectFiles: typeof collectScanFiles;
  config: ProjectDefinition["quality"];
  root: string;
}>): BuiltInExactInputs {
  const scanFiles = input.collectFiles(input.root, input.config);
  const fileMap = classifyFiles(scanFiles, input.config.codeAreas, input.config.generatedFiles);
  return prepareBuiltInExactInputs({
    cacheRootDir: input.cacheRootDir,
    commitSha: getGitSha(input.root),
    config: input.config,
    fileMap,
    fingerprints: buildFingerprints(fileMap, input.root),
    rootDir: input.root,
    scanFiles
  });
}

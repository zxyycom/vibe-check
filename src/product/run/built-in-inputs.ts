import { randomUUID } from "node:crypto";
import { rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

import type { RunControls } from "../definition/project.ts";
import type { ResolvedQualityConfig } from "../quality-core/model/schema.ts";
import { referenceIdentity } from "./policy.ts";
import {
  prepareBuiltInExactInputs,
  type BuiltInReferenceInputs
} from "../quality-core/engine-input-preparation.ts";
import {
  buildFingerprints,
  collectBaselineFiles,
  collectScanFiles
} from "../quality-core/input/files.ts";
import {
  materializeBaselineRevision,
  resolveBaselineCommitSha
} from "../quality-core/input/revisions.ts";
import { classifyFiles } from "../quality-core/model/code-areas.ts";
import { getGitSha } from "../quality-core/scan-command/tool-metadata.ts";

export type BuiltInExactInputs = ReturnType<typeof prepareBuiltInExactInputs>;

export type ComparisonReference = Readonly<{
  readonly cleanup: () => void;
  readonly input: BuiltInReferenceInputs;
}>;

export function prepareCurrentBuiltInInputs(input: Readonly<{
  cacheDirectory: string;
  config: ResolvedQualityConfig;
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
  config: ResolvedQualityConfig;
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
  config: ResolvedQualityConfig;
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

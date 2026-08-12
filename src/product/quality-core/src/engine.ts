import { randomUUID } from "node:crypto";
import { rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

import { errorMessage } from "../../foundation/src/index.ts";
import type { ScannerDependencySnapshot } from "../../scanner-dependencies.ts";
import {
  composeCurrentCheckRecords,
  type CurrentBuiltinCheckId,
  type CurrentCompositionExactInputs,
  type CurrentCompositionReferenceInputs
} from "./check-record/current-composition.ts";
import {
  baselineReferenceIdentity,
  emptyCompositionExactInputs,
  exactCompositionInputs
} from "./engine-input-preparation.ts";
import { materializeBaselineRevision } from "./input/revisions.ts";
import { detectScanInputChange } from "./input/revisions.ts";
import {
  buildFingerprints,
  collectBaselineFiles,
  collectScanFiles
} from "./input/files.ts";
import { classifyFiles } from "./model/code-areas.ts";
import type { ResolvedQualityConfig } from "./model/schema.ts";
import { createPublicationModelV2 } from "./output/publication-v2/index.ts";
import type {
  QualityScanOptions,
  QualityScanProcessOutcome
} from "./scan-command/index.ts";
import {
  createTimings,
  getGitSha,
  resolveChangedFilesForScan
} from "./scan-command/index.ts";
import {
  cleanupPublicationV2BestEffort,
  publishScanV2
} from "./scan-command/publication-v2.ts";

export type QualityScanRuntimeOptions = {
  config: ResolvedQualityConfig;
  dependencies: ScannerDependencySnapshot;
  root: string;
  options: QualityScanOptions;
  banner?: (scanProfile: QualityScanOptions["scanProfile"]) => void;
  timingsEnabled?: boolean;
};

interface PreparedReference {
  readonly input: CurrentCompositionReferenceInputs;
  readonly temporaryRoot: string;
}

export async function runQualityScan(
  runtimeOptions: QualityScanRuntimeOptions
): Promise<QualityScanProcessOutcome> {
  const { banner, config, dependencies, options, root, timingsEnabled } =
    runtimeOptions;
  const timings = createTimings(timingsEnabled);
  const artifactDir = resolve(root, options.artifactDir);
  const invocationId = `invocation/v1:${randomUUID()}`;
  const commitSha = timings.measure("git rev-parse HEAD", () => getGitSha(root));
  const changeScope = timings.measure("detect changed scan inputs", () =>
    detectScanInputChange({
      baselineSha: options.baselineCommitSha,
      cwd: root,
      scanInputPaths: [...config.include]
    })
  );
  const changedFiles = timings.measure("resolve changed files", () =>
    resolveChangedFilesForScan({ config, opts: options, root, scope: changeScope })
  );
  console.log(`Changed files in scan scope: ${changedFiles.length}`);

  banner?.(options.scanProfile);
  const current = timings.measure("prepare exact current inputs", () =>
    prepareCurrentInputs({ config, root, commitSha })
  );
  const reference = timings.measure("prepare explicit reference", () =>
    prepareReference({
      commitSha: options.baselineCommitSha,
      config,
      gate: options.gatePolicy,
      repositoryRoot: root
    })
  );

  try {
    const selectedCheckIds = selectedChecks(options.scanProfile);
    const composition = await timings.measureAsync("compose Check records", () =>
      composeCurrentCheckRecords({
        baseline: reference?.input ?? null,
        changedFiles,
        config,
        current,
        dependencies,
        gate: options.gatePolicy,
        invocationKey: invocationId,
        selectedCheckIds,
        verificationOutput: options.verificationOutput
      })
    );
    const references = reference === null ||
        (options.gatePolicy !== "changed" && options.gatePolicy !== "regressions")
      ? []
      : [reference.input.identity];
    const model = timings.measure("validate publication model", () =>
      createPublicationModelV2({
        decision: composition.decision,
        humanStatus: composition.humanStatus,
        invocation: {
          invocationId,
          projectRoot: ".",
          timestamp: new Date().toISOString()
        },
        referenceFacts: composition.referenceFacts,
        references,
        snapshot: composition.snapshot,
        verificationOutput: options.verificationOutput
      })
    );
    const published = timings.measure("publish v2 artifacts", () =>
      publishScanV2({
        artifactDir,
        changedFiles,
        model,
        reportPresentation: {
          ...config.report,
          topN: options.topN
        }
      })
    );
    timings.print();
    return published.outcome;
  } catch (error: unknown) {
    cleanupPublicationV2BestEffort(artifactDir);
    console.log("");
    console.log("❌ Quality scan failed.");
    console.log(`Artifacts in: ${artifactDir}/`);
    console.error(`Fatal quality scan issue: ${errorMessage(error)}`);
    return "failed";
  } finally {
    if (reference !== null) {
      rmSync(reference.temporaryRoot, { recursive: true, force: true });
    }
  }
}

function prepareCurrentInputs(input: Readonly<{
  commitSha: string;
  config: ResolvedQualityConfig;
  root: string;
}>): CurrentCompositionExactInputs {
  console.log("Collecting scan inputs...");
  const scanFiles = collectScanFiles(input.root, input.config);
  const fileMap = classifyFiles(
    scanFiles,
    input.config.codeAreas,
    input.config.generatedFiles
  );
  const fingerprints = buildFingerprints(fileMap, input.root);
  console.log(`  Found ${scanFiles.length} files in scan scope`);
  console.log(`  Code areas: ${Array.from(fileMap.keys()).join(", ")}`);
  return exactCompositionInputs({
    cacheRootDir: resolve(input.root, input.config.cacheDir),
    commitSha: input.commitSha,
    config: input.config,
    fileMap,
    fingerprints,
    rootDir: input.root,
    scanFiles
  });
}

function prepareReference(input: Readonly<{
  commitSha: string | null;
  config: ResolvedQualityConfig;
  gate: QualityScanOptions["gatePolicy"];
  repositoryRoot: string;
}>): PreparedReference | null {
  if (input.commitSha === null ||
      (input.gate !== "changed" && input.gate !== "regressions")) {
    return null;
  }
  const temporaryRoot = join(tmpdir(), `quality-reference-${randomUUID()}`);
  const identity = baselineReferenceIdentity(input.commitSha);
  const materialized = materializeBaselineRevision({
    baselineWorkDir: temporaryRoot,
    commitSha: input.commitSha,
    cwd: input.repositoryRoot
  });
  if (!materialized.ok) {
    return Object.freeze({
      temporaryRoot,
      input: Object.freeze({
        ...emptyCompositionExactInputs({
          cacheRootDir: resolve(input.repositoryRoot, input.config.cacheDir),
          commitSha: input.commitSha,
          rootDir: temporaryRoot
        }),
        identity,
        status: "unavailable" as const
      })
    });
  }

  const scanFiles = collectBaselineFiles(materialized.workDir, input.config);
  const fileMap = classifyFiles(
    scanFiles,
    input.config.codeAreas,
    input.config.generatedFiles
  );
  const fingerprints = buildFingerprints(fileMap, materialized.workDir);
  return Object.freeze({
    temporaryRoot,
    input: Object.freeze({
      ...exactCompositionInputs({
        cacheRootDir: resolve(input.repositoryRoot, input.config.cacheDir),
        commitSha: input.commitSha,
        config: input.config,
        fileMap,
        fingerprints,
        rootDir: materialized.workDir,
        scanFiles
      }),
      identity
    })
  });
}

function selectedChecks(
  profile: QualityScanOptions["scanProfile"]
): readonly CurrentBuiltinCheckId[] {
  return profile === "quick"
    ? Object.freeze(["file-metrics", "function-metrics"])
    : Object.freeze(["duplicate-detection", "file-metrics", "function-metrics"]);
}

export function qualityScanErrorExitCode(err: unknown): 2 | 3 {
  const message = errorMessage(err);
  return (err instanceof Error && "code" in err && err.code === "ENOENT") ||
    message.includes("config")
    ? 3
    : 2;
}

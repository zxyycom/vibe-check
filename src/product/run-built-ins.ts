import { randomUUID } from "node:crypto";
import { rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

import {
  BUILT_IN_CHECK_DEFINITIONS,
  type ProjectDefinition,
  type ProjectEffects,
  type RunControls
} from "./project-definition.ts";
import { referenceIdentity } from "./run-policy.ts";
import { resolveSelectedScannerDependencySnapshot } from "./scanner-dependencies.ts";
import {
  createDuplicateDetectionBinding,
  resolveDuplicateDetectionApplicability
} from "./quality-core/src/check-record/builtins/duplicate-detection.ts";
import {
  createFileMetricsBinding,
  resolveFileMetricsApplicability
} from "./quality-core/src/check-record/builtins/file-metrics.ts";
import {
  createFunctionMetricsBinding,
  resolveFunctionMetricsApplicability
} from "./quality-core/src/check-record/builtins/function-metrics.ts";
import type { FinalCoreSnapshot } from "./quality-core/src/check-record/model.ts";
import type { ReferenceFacts } from "./quality-core/src/check-record/policy-model.ts";
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

export interface BuiltInRuntime {
  readonly applicability: ReadonlyMap<string, () => unknown>;
  readonly bindings: ReadonlyMap<string, unknown>;
  readonly cleanup: () => void;
  readonly referenceFacts: ReadonlyMap<string, (snapshot: FinalCoreSnapshot) => ReferenceFacts>;
}

interface RuntimeMaps {
  readonly applicability: Map<string, () => unknown>;
  readonly bindings: Map<string, unknown>;
  readonly referenceFacts: Map<string, (snapshot: FinalCoreSnapshot) => ReferenceFacts>;
}
type ExactInputs = ReturnType<typeof prepareBuiltInExactInputs>;

export function prepareBuiltInRuntime(
  definition: ProjectDefinition,
  controls: RunControls,
  selectedCheckIds: readonly string[],
  cache: ProjectEffects["cache"],
  onCacheActivity: (activity: "failed" | "read" | "write") => void
): BuiltInRuntime {
  const selectedBuiltIns = selectedCheckIds.filter((checkId) => (
    Object.hasOwn(BUILT_IN_CHECK_DEFINITIONS, checkId)
  ));
  if (selectedBuiltIns.length === 0) {
    return Object.freeze({
      applicability: new Map(),
      bindings: new Map(),
      cleanup: () => undefined,
      referenceFacts: new Map()
    });
  }
  const requiredDependencies = selectedBuiltIns.map((checkId) => (
    checkId === "duplicate-detection" ? "duplication"
      : checkId === "file-metrics" ? "file" : "function"
  )) as ("duplication" | "file" | "function")[];
  const dependencies = resolveSelectedScannerDependencySnapshot({
    controls: controls.operationalDependencies,
    definition: definition.operationalDependencies,
    environment: supportedEnvironmentSnapshot()
  }, requiredDependencies);
  const root = resolve(controls.projectRoot ?? process.cwd());
  const config = definition.quality;
  const current = prepareExactInputs(root, config, resolve(root, cache.directory));
  const comparison = controls.comparison === undefined
    ? null
    : prepareComparisonReference(root, config, controls.comparison, cache.directory);
  try {
    const maps: RuntimeMaps = {
      applicability: new Map(),
      bindings: new Map(),
      referenceFacts: new Map()
    };
    const changedFiles = controls.changedFiles ?? [];
    if (selectedBuiltIns.includes("duplicate-detection")) {
      addDuplicateRuntime(maps, {
        cache,
        changedFiles,
        comparison,
        config,
        configVersion: definition.apiVersion,
        current,
        dependency: dependencies.duplication!,
        onCacheActivity
      });
    }
    if (selectedBuiltIns.includes("file-metrics")) {
      addFileRuntime(maps, {
        changedFiles,
        comparison,
        config,
        current,
        dependency: dependencies.file!
      });
    }
    if (selectedBuiltIns.includes("function-metrics")) {
      addFunctionRuntime(maps, {
        changedFiles,
        comparison,
        config,
        current,
        dependency: dependencies.function!
      });
    }
    return Object.freeze({
      ...maps,
      cleanup: comparison === null ? () => undefined : comparison.cleanup
    });
  } catch (error) {
    comparison?.cleanup();
    throw error;
  }
}

function addDuplicateRuntime(maps: RuntimeMaps, input: Readonly<{
  cache: ProjectEffects["cache"];
  changedFiles: readonly string[];
  comparison: ComparisonReference | null;
  config: ProjectDefinition["quality"];
  configVersion: ProjectDefinition["apiVersion"];
  current: ExactInputs;
  dependency: Parameters<typeof createDuplicateDetectionBinding>[0]["dependency"];
  onCacheActivity: (activity: "failed" | "read" | "write") => void;
}>): void {
  const current = duplicateInput(input.current.duplicateDetection, input.config);
  const runtime = createDuplicateDetectionBinding({
    cache: { enabled: input.cache.enabled, onActivity: input.onCacheActivity },
    changedFiles: [...input.changedFiles],
    current,
    dependency: input.dependency,
    reference: input.comparison === null ? null : {
      ...duplicateInput(input.comparison.input.duplicateDetection, input.config),
      referenceName: input.comparison.input.identity.referenceName
    },
    semantics: {
      changedDelta: input.config.checks.duplication.fragments.changedDelta,
      codeAreas: input.config.codeAreas,
      configVersion: input.configVersion
    }
  });
  maps.applicability.set("duplicate-detection", () => (
    resolveDuplicateDetectionApplicability(current.areas)
  ));
  maps.bindings.set("duplicate-detection", {
    checkId: "duplicate-detection",
    execute: runtime.binding
  });
  maps.referenceFacts.set("duplicate-detection", runtime.referenceFacts);
}

function addFileRuntime(maps: RuntimeMaps, input: CommonRuntimeInput & Readonly<{
  dependency: Parameters<typeof createFileMetricsBinding>[0]["dependency"];
}>): void {
  const runtime = createFileMetricsBinding({
    changedFiles: [...input.changedFiles],
    current: input.current.fileMetrics,
    dependency: input.dependency,
    reference: input.comparison === null ? null : {
      ...input.comparison.input.fileMetrics,
      referenceName: input.comparison.input.identity.referenceName
    },
    semantics: {
      codeAreas: input.config.codeAreas,
      generatedFiles: input.config.generatedFiles,
      codeLines: input.config.checks.files.codeLines
    }
  });
  maps.applicability.set("file-metrics", () => (
    resolveFileMetricsApplicability(input.current.fileMetrics.approvedExactPaths)
  ));
  maps.bindings.set("file-metrics", { checkId: "file-metrics", execute: runtime.binding });
  maps.referenceFacts.set("file-metrics", runtime.referenceFacts);
}

function addFunctionRuntime(maps: RuntimeMaps, input: CommonRuntimeInput & Readonly<{
  dependency: Parameters<typeof createFunctionMetricsBinding>[0]["dependency"];
}>): void {
  const runtime = createFunctionMetricsBinding({
    changedFiles: [...input.changedFiles],
    current: input.current.functionMetrics,
    dependency: input.dependency,
    reference: input.comparison === null ? null : {
      ...input.comparison.input.functionMetrics,
      referenceName: input.comparison.input.identity.referenceName
    },
    semantics: {
      codeAreas: input.config.codeAreas,
      generatedFiles: input.config.generatedFiles,
      functions: input.config.checks.functions
    }
  });
  maps.applicability.set("function-metrics", () => (
    resolveFunctionMetricsApplicability(input.current.functionMetrics.approvedExactPaths)
  ));
  maps.bindings.set("function-metrics", {
    checkId: "function-metrics",
    execute: runtime.binding
  });
  maps.referenceFacts.set("function-metrics", runtime.referenceFacts);
}

interface CommonRuntimeInput {
  readonly changedFiles: readonly string[];
  readonly comparison: ComparisonReference | null;
  readonly config: ProjectDefinition["quality"];
  readonly current: ExactInputs;
}

type ComparisonReference = Readonly<{
  readonly cleanup: () => void;
  readonly input: BuiltInReferenceInputs;
}>;

function prepareComparisonReference(
  root: string,
  config: ProjectDefinition["quality"],
  comparison: NonNullable<RunControls["comparison"]>,
  cacheDirectory: string
): ComparisonReference {
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
  try {
    return Object.freeze({
      cleanup: () => rmSync(temporaryRoot, { recursive: true, force: true }),
      input: Object.freeze({
        ...prepareExactInputs(
          materialized.workDir,
          config,
          resolve(root, cacheDirectory),
          collectBaselineFiles
        ),
        identity: referenceIdentity(comparison)
      })
    });
  } catch (error) {
    rmSync(temporaryRoot, { recursive: true, force: true });
    throw error;
  }
}

function prepareExactInputs(
  root: string,
  config: ProjectDefinition["quality"],
  cacheRootDir: string,
  collectFiles: typeof collectScanFiles = collectScanFiles
): ExactInputs {
  const scanFiles = collectFiles(root, config);
  const fileMap = classifyFiles(scanFiles, config.codeAreas, config.generatedFiles);
  return prepareBuiltInExactInputs({
    cacheRootDir,
    commitSha: getGitSha(root),
    config,
    fileMap,
    fingerprints: buildFingerprints(fileMap, root),
    rootDir: root,
    scanFiles
  });
}

function duplicateInput(
  input: ExactInputs["duplicateDetection"],
  config: ProjectDefinition["quality"]
) {
  return Object.freeze({
    areas: Object.freeze(input.areas.map((area) => Object.freeze({
      ...area,
      minimumTokens: config.checks.duplication.minimumTokensByCodeArea[area.codeArea]
        ?? config.checks.duplication.defaultMinimumTokens
    }))),
    cacheRootDir: input.cacheRootDir,
    commitSha: input.commitSha,
    rootDir: input.rootDir
  });
}

function supportedEnvironmentSnapshot(): Readonly<Record<string, string | undefined>> {
  return Object.freeze({
    VIBE_CHECK_JSCPD_CMD: process.env.VIBE_CHECK_JSCPD_CMD,
    VIBE_CHECK_LIZARD_CMD: process.env.VIBE_CHECK_LIZARD_CMD,
    VIBE_CHECK_SCC_CMD: process.env.VIBE_CHECK_SCC_CMD
  });
}

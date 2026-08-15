import { resolve } from "node:path";

import type {
  NormalizedCheck,
  ProjectDefinition,
  ProjectEffects,
  RunControls
} from "../definition/project.ts";
import {
  duplicateDetection,
  fileMetrics,
  functionMetrics,
  isBuiltInCheckId,
  type BuiltInCheckId,
  type BuiltInCheckOptionsById
} from "../definition/built-ins.ts";
import { resolveQualityConfiguration } from "../definition/quality.ts";
import { CURRENT_PUBLIC_CONTRACT, type OperationalDependencyId } from "../public-contract/current.ts";
import {
  prepareComparisonReference,
  prepareCurrentBuiltInInputs,
  type BuiltInExactInputs,
  type ComparisonReference
} from "./built-in-inputs.ts";
import { resolveSelectedScannerDependencySnapshot } from "../scanner-dependencies/index.ts";
import {
  createDuplicateDetectionBinding,
  resolveDuplicateDetectionApplicability
} from "../quality-core/check-record/builtins/duplicate-detection.ts";
import {
  createFileMetricsBinding,
  resolveFileMetricsApplicability
} from "../quality-core/check-record/builtins/file-metrics.ts";
import {
  createFunctionMetricsBinding,
  resolveFunctionMetricsApplicability
} from "../quality-core/check-record/builtins/function-metrics.ts";
import type { BuiltInCheckBinding } from "../quality-core/check-record/builtins/builtin-support.ts";
import type { CoreSnapshot } from "../quality-core/check-record/model.ts";
import type { ResolvedQualityConfig } from "../quality-core/model/schema.ts";
import type { ReferenceFacts } from "../quality-core/check-record/policy-model.ts";

/**
 * Built-in preparation is Run pre-work only. `resolve` is consumed exactly
 * once while joining a canonical Normalized Check to its Resolved Check.
 */
export interface BuiltInRuntime {
  readonly cleanup: () => void;
  readonly resolve: (checkId: string) => BuiltInRuntimeEntry | undefined;
}

export interface BuiltInRuntimeEntry {
  readonly applicability: "applicable" | "not-applicable";
  readonly execute: BuiltInCheckBinding;
  readonly referenceFacts: (snapshot: CoreSnapshot) => ReferenceFacts;
}

type ExactInputs = BuiltInExactInputs;

const BUILT_IN_DEPENDENCIES = Object.freeze({
  "duplicate-detection": "duplication",
  "file-metrics": "file",
  "function-metrics": "function"
} as const satisfies Readonly<Record<BuiltInCheckId, OperationalDependencyId>>);

export function prepareBuiltInRuntime(input: Readonly<{
  cache: ProjectEffects["cache"];
  checks: readonly NormalizedCheck[];
  controls: RunControls;
  definition: ProjectDefinition;
  onCacheActivity: (activity: "failed" | "read" | "write") => void;
}>): BuiltInRuntime {
  const selectedBuiltIns = selectedBuiltInCheckIds(input.checks);
  if (selectedBuiltIns.length === 0) return emptyRuntime();

  const requiredDependencies = selectedBuiltIns.map((checkId) => BUILT_IN_DEPENDENCIES[checkId]);
  const dependencies = resolveSelectedScannerDependencySnapshot({
    controls: input.controls.operationalDependencies,
    definition: input.definition.operationalDependencies,
    environment: supportedEnvironmentSnapshot()
  }, requiredDependencies);
  const root = resolve(input.controls.projectRoot ?? process.cwd());
  const config = resolveQualityConfiguration({
    project: input.definition.quality,
    checks: {
      duplication: builtInOptions(input.checks, "duplicate-detection") ?? duplicateDetection.options,
      files: builtInOptions(input.checks, "file-metrics") ?? fileMetrics.options,
      functions: builtInOptions(input.checks, "function-metrics") ?? functionMetrics.options
    }
  });
  const current = prepareCurrentBuiltInInputs({
    cacheDirectory: input.cache.directory,
    config,
    root
  });
  const comparison = input.controls.comparison === undefined
    ? null
    : prepareComparisonReference({
      cacheDirectory: input.cache.directory,
      comparison: input.controls.comparison,
      config,
      root
    });

  try {
    const entries = new Map<string, BuiltInRuntimeEntry>();
    const changedFiles = input.controls.changedFiles ?? [];
    if (selectedBuiltIns.includes("duplicate-detection")) {
      addDuplicateRuntime(entries, {
        cache: input.cache,
        changedFiles,
        comparison,
        config,
        configVersion: input.definition.apiVersion,
        current,
        dependency: requiredDependency(dependencies, "duplication"),
        onCacheActivity: input.onCacheActivity
      });
    }
    if (selectedBuiltIns.includes("file-metrics")) {
      addFileRuntime(entries, {
        changedFiles,
        comparison,
        config,
        current,
        dependency: requiredDependency(dependencies, "file")
      });
    }
    if (selectedBuiltIns.includes("function-metrics")) {
      addFunctionRuntime(entries, {
        changedFiles,
        comparison,
        config,
        current,
        dependency: requiredDependency(dependencies, "function")
      });
    }
    return Object.freeze({
      cleanup: comparison === null ? () => undefined : comparison.cleanup,
      resolve: (checkId: string) => entries.get(checkId)
    });
  } catch (error) {
    comparison?.cleanup();
    throw error;
  }
}

function emptyRuntime(): BuiltInRuntime {
  return Object.freeze({ cleanup: () => undefined, resolve: () => undefined });
}

function selectedBuiltInCheckIds(checks: readonly NormalizedCheck[]): readonly BuiltInCheckId[] {
  const ids: BuiltInCheckId[] = [];
  for (const check of checks) {
    if (check.kind !== "built-in") continue;
    if (!isBuiltInCheckId(check.definition.checkId)) {
      throw new TypeError("Normalized built-in Check has an unknown identity");
    }
    ids.push(check.definition.checkId);
  }
  return Object.freeze(ids);
}

function builtInOptions<Id extends BuiltInCheckId>(
  checks: readonly NormalizedCheck[],
  checkId: Id
): BuiltInCheckOptionsById[Id] | undefined {
  const check = checks.find((candidate): candidate is Extract<NormalizedCheck, {
    readonly kind: "built-in";
  }> => candidate.kind === "built-in" && candidate.definition.checkId === checkId);
  return check === undefined ? undefined : check.options as BuiltInCheckOptionsById[Id];
}

function requiredDependency<Id extends OperationalDependencyId>(
  dependencies: ReturnType<typeof resolveSelectedScannerDependencySnapshot>,
  dependencyId: Id
): NonNullable<ReturnType<typeof resolveSelectedScannerDependencySnapshot>[Id]> {
  const dependency = dependencies[dependencyId];
  if (dependency === undefined) throw new TypeError(`Missing selected dependency ${dependencyId}`);
  return dependency;
}

function addDuplicateRuntime(entries: Map<string, BuiltInRuntimeEntry>, input: Readonly<{
  cache: ProjectEffects["cache"];
  changedFiles: readonly string[];
  comparison: ComparisonReference | null;
  config: ResolvedQualityConfig;
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
  entries.set("duplicate-detection", Object.freeze({
    applicability: resolveDuplicateDetectionApplicability(current.areas),
    execute: runtime.binding,
    referenceFacts: runtime.referenceFacts
  }));
}

function addFileRuntime(entries: Map<string, BuiltInRuntimeEntry>, input: CommonRuntimeInput & Readonly<{
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
  entries.set("file-metrics", Object.freeze({
    applicability: resolveFileMetricsApplicability(input.current.fileMetrics.approvedExactPaths),
    execute: runtime.binding,
    referenceFacts: runtime.referenceFacts
  }));
}

function addFunctionRuntime(entries: Map<string, BuiltInRuntimeEntry>, input: CommonRuntimeInput & Readonly<{
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
  entries.set("function-metrics", Object.freeze({
    applicability: resolveFunctionMetricsApplicability(input.current.functionMetrics.approvedExactPaths),
    execute: runtime.binding,
    referenceFacts: runtime.referenceFacts
  }));
}

interface CommonRuntimeInput {
  readonly changedFiles: readonly string[];
  readonly comparison: ComparisonReference | null;
  readonly config: ResolvedQualityConfig;
  readonly current: ExactInputs;
}

function duplicateInput(
  input: ExactInputs["duplicateDetection"],
  config: ResolvedQualityConfig
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
  return Object.freeze(Object.fromEntries(
    Object.values(CURRENT_PUBLIC_CONTRACT.operationalDependencies).map(({ environment }) => (
      [environment, process.env[environment]] as const
    ))
  ));
}

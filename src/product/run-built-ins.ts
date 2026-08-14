import { resolve } from "node:path";

import {
  BUILT_IN_CHECK_DEFINITIONS,
  type ProjectDefinition,
  type ProjectEffects,
  type RunControls
} from "./project-definition.ts";
import { CURRENT_PUBLIC_CONTRACT, type OperationalDependencyId } from "./current-public-contract.ts";
import {
  prepareComparisonReference,
  prepareCurrentBuiltInInputs,
  type BuiltInExactInputs,
  type ComparisonReference
} from "./run-built-in-inputs.ts";
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
import type { CheckExecutionBinding } from "./quality-core/src/check-record/catalog.ts";
import type { ReferenceFacts } from "./quality-core/src/check-record/policy-model.ts";

export interface BuiltInRuntime {
  readonly applicability: ReadonlyMap<string, BuiltInApplicability>;
  readonly bindings: ReadonlyMap<string, BuiltInBinding>;
  readonly cleanup: () => void;
  readonly referenceFacts: ReadonlyMap<string, (snapshot: FinalCoreSnapshot) => ReferenceFacts>;
}

interface RuntimeMaps {
  readonly applicability: Map<string, BuiltInApplicability>;
  readonly bindings: Map<string, BuiltInBinding>;
  readonly referenceFacts: Map<string, (snapshot: FinalCoreSnapshot) => ReferenceFacts>;
}
type ExactInputs = BuiltInExactInputs;
type BuiltInApplicability = () => Readonly<
  | { readonly status: "not-applicable" }
  | { readonly status: "applicable"; readonly workHandles: readonly string[] }
>;
type BuiltInBinding = Readonly<{ readonly checkId: string; readonly execute: CheckExecutionBinding }>;
const BUILT_IN_DEPENDENCIES = Object.freeze({
  "duplicate-detection": "duplication",
  "file-metrics": "file",
  "function-metrics": "function"
} as const satisfies Readonly<Record<keyof typeof BUILT_IN_CHECK_DEFINITIONS, OperationalDependencyId>>);

export function prepareBuiltInRuntime(input: Readonly<{
  cache: ProjectEffects["cache"];
  controls: RunControls;
  definition: ProjectDefinition;
  onCacheActivity: (activity: "failed" | "read" | "write") => void;
  selectedCheckIds: readonly string[];
}>): BuiltInRuntime {
  const selectedBuiltIns = selectedBuiltInCheckIds(input.selectedCheckIds);
  if (selectedBuiltIns.length === 0) {
    return Object.freeze({
      applicability: new Map(),
      bindings: new Map(),
      cleanup: () => undefined,
      referenceFacts: new Map()
    });
  }
  const requiredDependencies = selectedBuiltIns.map((checkId) => BUILT_IN_DEPENDENCIES[checkId]);
  const dependencies = resolveSelectedScannerDependencySnapshot({
    controls: input.controls.operationalDependencies,
    definition: input.definition.operationalDependencies,
    environment: supportedEnvironmentSnapshot()
  }, requiredDependencies);
  const root = resolve(input.controls.projectRoot ?? process.cwd());
  const config = input.definition.quality;
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
    const maps: RuntimeMaps = {
      applicability: new Map(),
      bindings: new Map(),
      referenceFacts: new Map()
    };
    const changedFiles = input.controls.changedFiles ?? [];
    if (selectedBuiltIns.includes("duplicate-detection")) {
      addDuplicateRuntime(maps, {
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
      addFileRuntime(maps, {
        changedFiles,
        comparison,
        config,
        current,
        dependency: requiredDependency(dependencies, "file")
      });
    }
    if (selectedBuiltIns.includes("function-metrics")) {
      addFunctionRuntime(maps, {
        changedFiles,
        comparison,
        config,
        current,
        dependency: requiredDependency(dependencies, "function")
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

function selectedBuiltInCheckIds(
  selectedCheckIds: readonly string[]
): readonly (keyof typeof BUILT_IN_CHECK_DEFINITIONS)[] {
  return selectedCheckIds.filter((checkId): checkId is keyof typeof BUILT_IN_CHECK_DEFINITIONS => (
    Object.hasOwn(BUILT_IN_CHECK_DEFINITIONS, checkId)
  ));
}

function requiredDependency<Id extends OperationalDependencyId>(
  dependencies: ReturnType<typeof resolveSelectedScannerDependencySnapshot>,
  dependencyId: Id
): NonNullable<ReturnType<typeof resolveSelectedScannerDependencySnapshot>[Id]> {
  const dependency = dependencies[dependencyId];
  if (dependency === undefined) throw new TypeError(`Missing selected dependency ${dependencyId}`);
  return dependency;
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
  return Object.freeze(Object.fromEntries(
    Object.values(CURRENT_PUBLIC_CONTRACT.operationalDependencies).map(({ environment }) => (
      [environment, process.env[environment]] as const
    ))
  ));
}

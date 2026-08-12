import type { ScannerDependencySnapshot } from "../../../scanner-dependencies.ts";
import type { ResolvedQualityConfig } from "../model/schema.ts";
import {
  createDuplicateDetectionBinding,
  type DuplicateDetectionAreaInput,
  type DuplicateDetectionExactInputSet
} from "./builtins/duplicate-detection.ts";
import {
  createFileMetricsBinding,
  type FileMetricsExactInputSet
} from "./builtins/file-metrics.ts";
import {
  createFunctionMetricsBinding,
  type FunctionMetricsExactInputSet
} from "./builtins/function-metrics.ts";
import type { NamedReferenceIdentity } from "./policy-model.ts";

type DuplicateAreaExactInput = Readonly<
  Omit<DuplicateDetectionAreaInput, "minimumTokens">
>;

export interface CurrentCompositionExactInputs {
  readonly duplicateDetection: Readonly<{
    areas: readonly DuplicateAreaExactInput[];
    cacheRootDir: string;
    commitSha: string;
    rootDir: string;
  }>;
  readonly fileMetrics: FileMetricsExactInputSet;
  readonly functionMetrics: FunctionMetricsExactInputSet;
}

export interface CurrentCompositionReferenceInputs extends CurrentCompositionExactInputs {
  readonly identity: NamedReferenceIdentity;
  readonly status?: "available" | "unavailable";
}

interface CurrentRuntimeInput {
  readonly changedFiles: readonly string[];
  readonly config: ResolvedQualityConfig;
  readonly current: CurrentCompositionExactInputs;
  readonly dependencies: ScannerDependencySnapshot;
}

export type CurrentRuntimes = Readonly<{
  duplicateDetection: ReturnType<typeof createDuplicateDetectionBinding>;
  fileMetrics: ReturnType<typeof createFileMetricsBinding>;
  functionMetrics: ReturnType<typeof createFunctionMetricsBinding>;
}>;

export function createCurrentRuntimes(
  input: CurrentRuntimeInput,
  reference: CurrentCompositionReferenceInputs | null
): CurrentRuntimes {
  const measurementReference = reference?.status === "unavailable" ? null : reference;
  return Object.freeze({
    duplicateDetection: createDuplicateRuntime(input, measurementReference),
    fileMetrics: createFileMetricsRuntime(input, measurementReference),
    functionMetrics: createFunctionMetricsRuntime(input, measurementReference)
  });
}

function createFileMetricsRuntime(
  input: CurrentRuntimeInput,
  reference: CurrentCompositionReferenceInputs | null
) {
  return createFileMetricsBinding({
    changedFiles: input.changedFiles,
    current: input.current.fileMetrics,
    dependency: input.dependencies.file,
    reference: reference === null ? null : {
      ...reference.fileMetrics,
      referenceName: reference.identity.referenceName
    },
    semantics: {
      codeAreas: input.config.codeAreas,
      generatedFiles: input.config.generatedFiles,
      codeLines: input.config.checks.files.codeLines
    }
  });
}

function createFunctionMetricsRuntime(
  input: CurrentRuntimeInput,
  reference: CurrentCompositionReferenceInputs | null
) {
  return createFunctionMetricsBinding({
    changedFiles: input.changedFiles,
    current: input.current.functionMetrics,
    dependency: input.dependencies.function,
    reference: reference === null ? null : {
      ...reference.functionMetrics,
      referenceName: reference.identity.referenceName
    },
    semantics: {
      codeAreas: input.config.codeAreas,
      generatedFiles: input.config.generatedFiles,
      functions: input.config.checks.functions
    }
  });
}

function createDuplicateRuntime(
  input: CurrentRuntimeInput,
  reference: CurrentCompositionReferenceInputs | null
) {
  return createDuplicateDetectionBinding({
    changedFiles: input.changedFiles,
    current: resolveDuplicateDetectionInput(input.current.duplicateDetection, input.config),
    dependency: input.dependencies.duplication,
    reference: reference === null ? null : {
      ...resolveDuplicateDetectionInput(reference.duplicateDetection, input.config),
      referenceName: reference.identity.referenceName
    },
    semantics: {
      changedDelta: input.config.checks.duplication.fragments.changedDelta,
      codeAreas: input.config.codeAreas,
      configVersion: input.config.version
    }
  });
}

export function resolveDuplicateDetectionInput(
  input: CurrentCompositionExactInputs["duplicateDetection"],
  config: ResolvedQualityConfig
): DuplicateDetectionExactInputSet {
  return Object.freeze({
    cacheRootDir: input.cacheRootDir,
    commitSha: input.commitSha,
    rootDir: input.rootDir,
    areas: Object.freeze(input.areas.map((area) => Object.freeze({
      ...area,
      minimumTokens: config.checks.duplication.minimumTokensByCodeArea[area.codeArea]
        ?? config.checks.duplication.defaultMinimumTokens
    })))
  });
}

import {
  DUPLICATE_DETECTION_CHECK_DEFINITION
} from "../quality-core/check-record/builtins/duplicate-detection.ts";
import {
  FILE_METRICS_CHECK_DEFINITION
} from "../quality-core/check-record/builtins/file-metrics.ts";
import {
  FUNCTION_METRICS_CHECK_DEFINITION
} from "../quality-core/check-record/builtins/function-metrics.ts";
import { createCatalogFingerprint } from "../quality-core/check-record/identity.ts";
import type { CheckDefinition } from "../quality-core/check-record/model.ts";
import {
  snapshotClosedRecord
} from "../quality-core/check-record/plain-record-values.ts";
import { validateCheckDefinition } from "../quality-core/check-record/validation.ts";
import type {
  AnyBuiltInCheck,
  BuiltInCheckConstruction,
  BuiltInCheckId,
  DuplicateDetectionCheck,
  DuplicateDetectionOptions,
  FileMetricsCheck,
  FileMetricsOptions,
  FunctionMetricsCheck,
  FunctionMetricsOptions
} from "./built-in-data-model.ts";
import {
  parseMaxParallel,
  parseSchedulingValue
} from "./adjustment-patches.ts";
import { parseBuiltInCheckOptions } from "./built-in-options.ts";

export type {
  AnyBuiltInCheck as BuiltInCheck,
  BuiltInCheckById,
  BuiltInCheckData,
  BuiltInCheckId,
  BuiltInCheckOptions,
  BuiltInCheckOptionsById,
  BuiltInCheckReplacementById,
  DuplicateDetectionOptions,
  FileMetricsOptions,
  FunctionMetricsOptions
} from "./built-in-data-model.ts";
export type {
  BuiltInCheckReplacement,
  BuiltInCheckSchedulingAppend,
  DuplicateDetectionOptionsReplacement,
  FileMetricsOptionsReplacement,
  FunctionMetricsOptionsReplacement
} from "./adjustment-patches.ts";

const BUILT_IN_DEFINITIONS = Object.freeze({
  "duplicate-detection": Object.freeze({
    definition: deepFreeze({ ...DUPLICATE_DETECTION_CHECK_DEFINITION }),
    options: deepFreeze({
      defaultMinimumTokens: 75,
      fragments: { changedDelta: 1 },
      minimumTokensByCodeArea: {}
    } satisfies DuplicateDetectionOptions)
  }),
  "file-metrics": Object.freeze({
    definition: deepFreeze({ ...FILE_METRICS_CHECK_DEFINITION }),
    options: deepFreeze({
      codeLines: {
        absoluteFloor: 300,
        changedDelta: 80,
        lowDecisionTokenAllowance: {
          codeLineFloor: 500,
          maxDecisionTokens: 10
        }
      }
    } satisfies FileMetricsOptions)
  }),
  "function-metrics": Object.freeze({
    definition: deepFreeze({ ...FUNCTION_METRICS_CHECK_DEFINITION }),
    options: deepFreeze({
      codeLines: {
        absoluteFloor: 50,
        changedDelta: 20,
        lowComplexityAllowance: {
          codeLineFloor: 150,
          maxCyclomaticComplexityExclusive: 5
        }
      },
      cyclomaticComplexity: { absoluteFloor: 10, changedDelta: 5 },
      parameterCount: { absoluteFloor: 5, changedDelta: 2 }
    } satisfies FunctionMetricsOptions)
  })
} as const);

export const duplicateDetection = buildBuiltInCheck({
  checkId: "duplicate-detection",
  options: duplicateDefaultOptions()
});
export const fileMetrics = buildBuiltInCheck({
  checkId: "file-metrics",
  options: fileMetricsDefaultOptions()
});
export const functionMetrics = buildBuiltInCheck({
  checkId: "function-metrics",
  options: functionMetricsDefaultOptions()
});

export function isBuiltInCheckId(value: string): value is BuiltInCheckId {
  return Object.hasOwn(BUILT_IN_DEFINITIONS, value);
}

export function builtInDefinition(checkId: BuiltInCheckId): CheckDefinition {
  return BUILT_IN_DEFINITIONS[checkId].definition;
}

export function duplicateDefaultOptions(): DuplicateDetectionOptions {
  return BUILT_IN_DEFINITIONS["duplicate-detection"].options;
}

export function fileMetricsDefaultOptions(): FileMetricsOptions {
  return BUILT_IN_DEFINITIONS["file-metrics"].options;
}

export function functionMetricsDefaultOptions(): FunctionMetricsOptions {
  return BUILT_IN_DEFINITIONS["function-metrics"].options;
}

export function buildBuiltInCheck(input: Extract<BuiltInCheckConstruction, { readonly checkId: "duplicate-detection" }>): DuplicateDetectionCheck;
export function buildBuiltInCheck(input: Extract<BuiltInCheckConstruction, { readonly checkId: "file-metrics" }>): FileMetricsCheck;
export function buildBuiltInCheck(input: Extract<BuiltInCheckConstruction, { readonly checkId: "function-metrics" }>): FunctionMetricsCheck;
export function buildBuiltInCheck(input: BuiltInCheckConstruction): AnyBuiltInCheck {
  if (input.checkId === "duplicate-detection") return buildDuplicateDetectionCheck(input);
  if (input.checkId === "file-metrics") return buildFileMetricsCheck(input);
  return buildFunctionMetricsCheck(input);
}

export function parseBuiltInCheck(value: unknown): AnyBuiltInCheck | undefined {
  const data = snapshotClosedRecord(value);
  return data === undefined ? undefined : parseBuiltInCheckData(data);
}

export function parseBuiltInCheckData(data: Readonly<Record<string, unknown>>): AnyBuiltInCheck | undefined {
  const checkId = parseBuiltInCheckId(data);
  if (checkId === undefined || !hasCanonicalMetadata(data, checkId)) return undefined;
  const scheduling = parseScheduling(data);
  if (scheduling === undefined) return undefined;
  if (checkId === "duplicate-detection") return parseDuplicateDetectionCheck(data, scheduling);
  if (checkId === "file-metrics") return parseFileMetricsCheck(data, scheduling);
  return parseFunctionMetricsCheck(data, scheduling);
}

function buildDuplicateDetectionCheck(
  input: Extract<BuiltInCheckConstruction, { readonly checkId: "duplicate-detection" }>
): DuplicateDetectionCheck {
  return deepFreeze({
    ...BUILT_IN_DEFINITIONS["duplicate-detection"].definition,
    kind: "built-in" as const,
    options: input.options,
    ...(input.dependsOn === undefined ? {} : { dependsOn: input.dependsOn }),
    ...(input.maxParallel === undefined ? {} : { maxParallel: input.maxParallel }),
    ...(input.mutex === undefined ? {} : { mutex: input.mutex })
  });
}

function buildFileMetricsCheck(
  input: Extract<BuiltInCheckConstruction, { readonly checkId: "file-metrics" }>
): FileMetricsCheck {
  return deepFreeze({
    ...BUILT_IN_DEFINITIONS["file-metrics"].definition,
    kind: "built-in" as const,
    options: input.options,
    ...(input.dependsOn === undefined ? {} : { dependsOn: input.dependsOn }),
    ...(input.maxParallel === undefined ? {} : { maxParallel: input.maxParallel }),
    ...(input.mutex === undefined ? {} : { mutex: input.mutex })
  });
}

function buildFunctionMetricsCheck(
  input: Extract<BuiltInCheckConstruction, { readonly checkId: "function-metrics" }>
): FunctionMetricsCheck {
  return deepFreeze({
    ...BUILT_IN_DEFINITIONS["function-metrics"].definition,
    kind: "built-in" as const,
    options: input.options,
    ...(input.dependsOn === undefined ? {} : { dependsOn: input.dependsOn }),
    ...(input.maxParallel === undefined ? {} : { maxParallel: input.maxParallel }),
    ...(input.mutex === undefined ? {} : { mutex: input.mutex })
  });
}

function parseBuiltInCheckId(data: Readonly<Record<string, unknown>>): BuiltInCheckId | undefined {
  if (!hasExactKeys(data, ["kind", "checkId", "displayName", "recordTypes", "options"], ["dependsOn", "maxParallel", "mutex"])
    || data.kind !== "built-in" || typeof data.checkId !== "string" || !isBuiltInCheckId(data.checkId)) return undefined;
  return data.checkId;
}

function hasCanonicalMetadata(data: Readonly<Record<string, unknown>>, checkId: BuiltInCheckId): boolean {
  const candidate = validateCheckDefinition({
    checkId,
    displayName: data.displayName,
    recordTypes: data.recordTypes
  });
  return candidate.ok && createCatalogFingerprint([candidate.value]).catalogFingerprint
    === createCatalogFingerprint([builtInDefinition(checkId)]).catalogFingerprint;
}

interface BuiltInScheduling {
  readonly dependsOn?: string | readonly string[];
  readonly maxParallel?: number;
  readonly mutex?: string | readonly string[];
}

function parseScheduling(data: Readonly<Record<string, unknown>>): BuiltInScheduling | undefined {
  const dependsOn = parseSchedulingField(data, "dependsOn");
  const mutex = parseSchedulingField(data, "mutex");
  const maxParallel = parseMaxParallelField(data);
  if (dependsOn === null || mutex === null || maxParallel === null) return undefined;
  return {
    ...(dependsOn === undefined ? {} : { dependsOn }),
    ...(mutex === undefined ? {} : { mutex }),
    ...(maxParallel === undefined ? {} : { maxParallel })
  };
}

function parseSchedulingField(
  data: Readonly<Record<string, unknown>>,
  field: "dependsOn" | "mutex"
): string | readonly string[] | null | undefined {
  if (!Object.hasOwn(data, field)) return undefined;
  try {
    return parseSchedulingValue(data[field], field);
  } catch {
    return null;
  }
}

function parseMaxParallelField(data: Readonly<Record<string, unknown>>): number | null | undefined {
  if (!Object.hasOwn(data, "maxParallel")) return undefined;
  try {
    return parseMaxParallel(data.maxParallel);
  } catch {
    return null;
  }
}

function parseDuplicateDetectionCheck(
  data: Readonly<Record<string, unknown>>,
  scheduling: BuiltInScheduling
): DuplicateDetectionCheck | undefined {
  const options = parseBuiltInCheckOptions("duplicate-detection", data.options);
  return options === undefined ? undefined : buildBuiltInCheck({ checkId: "duplicate-detection", options, ...scheduling });
}

function parseFileMetricsCheck(
  data: Readonly<Record<string, unknown>>,
  scheduling: BuiltInScheduling
): FileMetricsCheck | undefined {
  const options = parseBuiltInCheckOptions("file-metrics", data.options);
  return options === undefined ? undefined : buildBuiltInCheck({ checkId: "file-metrics", options, ...scheduling });
}

function parseFunctionMetricsCheck(
  data: Readonly<Record<string, unknown>>,
  scheduling: BuiltInScheduling
): FunctionMetricsCheck | undefined {
  const options = parseBuiltInCheckOptions("function-metrics", data.options);
  return options === undefined ? undefined : buildBuiltInCheck({ checkId: "function-metrics", options, ...scheduling });
}

function hasExactKeys(
  data: Readonly<Record<string, unknown>>,
  requiredKeys: readonly string[],
  optionalKeys: readonly string[]
): boolean {
  const keys = Object.keys(data);
  return requiredKeys.every((key) => keys.includes(key))
    && keys.every((key) => requiredKeys.includes(key) || optionalKeys.includes(key));
}

function deepFreeze<T>(value: T): T {
  if (typeof value !== "object" || value === null || Object.isFrozen(value)) return value;
  for (const nested of Object.values(value)) deepFreeze(nested);
  return Object.freeze(value);
}

import {
  DUPLICATE_DETECTION_CHECK_DEFINITION
} from "./quality-core/src/check-record/builtins/duplicate-detection.ts";
import {
  FILE_METRICS_CHECK_DEFINITION
} from "./quality-core/src/check-record/builtins/file-metrics.ts";
import {
  FUNCTION_METRICS_CHECK_DEFINITION
} from "./quality-core/src/check-record/builtins/function-metrics.ts";
import type { CheckDefinition } from "./quality-core/src/check-record/model.ts";

export interface DuplicateDetectionOptions {
  readonly defaultMinimumTokens: number;
  readonly fragments: Readonly<{ readonly changedDelta: number }>;
  readonly minimumTokensByCodeArea: Readonly<Record<string, number>>;
}

export interface FileMetricsOptions {
  readonly codeLines: Readonly<{
    readonly absoluteFloor: number;
    readonly changedDelta: number;
    readonly lowDecisionTokenAllowance: Readonly<{
      readonly codeLineFloor: number;
      readonly maxDecisionTokens: number;
    }>;
  }>;
}

export interface FunctionMetricsOptions {
  readonly codeLines: Readonly<{
    readonly absoluteFloor: number;
    readonly changedDelta: number;
    readonly lowComplexityAllowance: Readonly<{
      readonly codeLineFloor: number;
      readonly maxCyclomaticComplexityExclusive: number;
    }>;
  }>;
  readonly cyclomaticComplexity: Readonly<{
    readonly absoluteFloor: number;
    readonly changedDelta: number;
  }>;
  readonly parameterCount: Readonly<{
    readonly absoluteFloor: number;
    readonly changedDelta: number;
  }>;
}

export interface BuiltInCheck<Id extends string, Options> extends CheckDefinition {
  readonly kind: "built-in";
  readonly checkId: Id;
  readonly options: Readonly<Options>;
  readonly dependsOn?: string | readonly string[];
  readonly maxParallel?: number;
  readonly mutex?: string | readonly string[];
}

function freezeDescriptor<Id extends string, Options>(input: Readonly<{
  definition: CheckDefinition & Readonly<{ readonly checkId: Id }>;
  options: Options;
}>): BuiltInCheck<Id, Options> {
  return deepFreeze({
    ...input.definition,
    kind: "built-in" as const,
    options: input.options
  });
}

export const duplicateDetection = freezeDescriptor({
  definition: DUPLICATE_DETECTION_CHECK_DEFINITION,
  options: {
    defaultMinimumTokens: 75,
    fragments: { changedDelta: 1 },
    minimumTokensByCodeArea: {}
  } satisfies DuplicateDetectionOptions
});

export const fileMetrics = freezeDescriptor({
  definition: FILE_METRICS_CHECK_DEFINITION,
  options: {
    codeLines: {
      absoluteFloor: 300,
      changedDelta: 80,
      lowDecisionTokenAllowance: {
        codeLineFloor: 500,
        maxDecisionTokens: 10
      }
    }
  } satisfies FileMetricsOptions
});

export const functionMetrics = freezeDescriptor({
  definition: FUNCTION_METRICS_CHECK_DEFINITION,
  options: {
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
  } satisfies FunctionMetricsOptions
});

export const BUILT_IN_CHECKS = Object.freeze({
  "duplicate-detection": duplicateDetection,
  "file-metrics": fileMetrics,
  "function-metrics": functionMetrics
} as const);

export type BuiltInCheckId = keyof typeof BUILT_IN_CHECKS;
export type BuiltInCheckDescriptor = typeof BUILT_IN_CHECKS[BuiltInCheckId];
export type BuiltInCheckOptions = BuiltInCheckDescriptor["options"];
export interface BuiltInCheckOptionsById {
  readonly "duplicate-detection": DuplicateDetectionOptions;
  readonly "file-metrics": FileMetricsOptions;
  readonly "function-metrics": FunctionMetricsOptions;
}

export function isBuiltInCheckId(value: string): value is BuiltInCheckId {
  return Object.hasOwn(BUILT_IN_CHECKS, value);
}

export function builtInDefinition(checkId: BuiltInCheckId): CheckDefinition {
  const { kind: _kind, options: _options, ...definition } = BUILT_IN_CHECKS[checkId];
  return deepFreeze(definition);
}

function deepFreeze<T>(value: T): T {
  if (typeof value !== "object" || value === null || Object.isFrozen(value)) return value;
  for (const nested of Object.values(value)) deepFreeze(nested);
  return Object.freeze(value);
}

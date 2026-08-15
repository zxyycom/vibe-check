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
import {
  createBuiltInDescriptor,
  freezeBuiltInData
} from "./built-in-check-adjustments.ts";
import {
  parseDuplicateDetectionOptionsReplacement,
  parseFileMetricsOptionsReplacement,
  parseFunctionMetricsOptionsReplacement,
  type DuplicateDetectionOptionsReplacement,
  type FileMetricsOptionsReplacement,
  type FunctionMetricsOptionsReplacement
} from "./built-in-check-adjustment-patches.ts";

export type {
  BuiltInCheck,
  BuiltInCheckReplacement,
  BuiltInCheckSchedulingAppend
} from "./built-in-check-adjustments.ts";
export type {
  DuplicateDetectionOptionsReplacement,
  FileMetricsOptionsReplacement,
  FunctionMetricsOptionsReplacement
} from "./built-in-check-adjustment-patches.ts";
export { materializeBuiltInDescriptor } from "./built-in-check-adjustments.ts";

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

export const duplicateDetection = createBuiltInDescriptor({
  definition: DUPLICATE_DETECTION_CHECK_DEFINITION,
  options: {
    defaultMinimumTokens: 75,
    fragments: { changedDelta: 1 },
    minimumTokensByCodeArea: {}
  } satisfies DuplicateDetectionOptions,
  parseOptionsReplacement: parseDuplicateDetectionOptionsReplacement,
  replaceOptions: replaceDuplicateDetectionOptions
});

export const fileMetrics = createBuiltInDescriptor({
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
  } satisfies FileMetricsOptions,
  parseOptionsReplacement: parseFileMetricsOptionsReplacement,
  replaceOptions: replaceFileMetricsOptions
});

export const functionMetrics = createBuiltInDescriptor({
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
  } satisfies FunctionMetricsOptions,
  parseOptionsReplacement: parseFunctionMetricsOptionsReplacement,
  replaceOptions: replaceFunctionMetricsOptions
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
  const {
    kind: _kind,
    options: _options,
    replace: _replace,
    append: _append,
    ...definition
  } = BUILT_IN_CHECKS[checkId];
  return freezeBuiltInData(definition);
}

function replaceDuplicateDetectionOptions(
  current: Readonly<DuplicateDetectionOptions>,
  replacement: DuplicateDetectionOptionsReplacement
): DuplicateDetectionOptions {
  return {
    defaultMinimumTokens: replacement.defaultMinimumTokens ?? current.defaultMinimumTokens,
    fragments: { changedDelta: replacement.fragments?.changedDelta ?? current.fragments.changedDelta },
    minimumTokensByCodeArea: replacement.minimumTokensByCodeArea ?? current.minimumTokensByCodeArea
  };
}

function replaceFileMetricsOptions(
  current: Readonly<FileMetricsOptions>,
  replacement: FileMetricsOptionsReplacement
): FileMetricsOptions {
  const codeLines = replacement.codeLines;
  const allowance = codeLines?.lowDecisionTokenAllowance;
  return {
    codeLines: {
      absoluteFloor: codeLines?.absoluteFloor ?? current.codeLines.absoluteFloor,
      changedDelta: codeLines?.changedDelta ?? current.codeLines.changedDelta,
      lowDecisionTokenAllowance: {
        codeLineFloor: allowance?.codeLineFloor ?? current.codeLines.lowDecisionTokenAllowance.codeLineFloor,
        maxDecisionTokens: allowance?.maxDecisionTokens ?? current.codeLines.lowDecisionTokenAllowance.maxDecisionTokens
      }
    }
  };
}

function replaceFunctionMetricsOptions(
  current: Readonly<FunctionMetricsOptions>,
  replacement: FunctionMetricsOptionsReplacement
): FunctionMetricsOptions {
  return {
    codeLines: replaceFunctionCodeLines(current.codeLines, replacement.codeLines),
    cyclomaticComplexity: replaceMetricThreshold(current.cyclomaticComplexity, replacement.cyclomaticComplexity),
    parameterCount: replaceMetricThreshold(current.parameterCount, replacement.parameterCount)
  };
}

function replaceFunctionCodeLines(
  current: FunctionMetricsOptions["codeLines"],
  replacement: FunctionMetricsOptionsReplacement["codeLines"]
): FunctionMetricsOptions["codeLines"] {
  const allowance = replacement?.lowComplexityAllowance;
  return {
    absoluteFloor: replacement?.absoluteFloor ?? current.absoluteFloor,
    changedDelta: replacement?.changedDelta ?? current.changedDelta,
    lowComplexityAllowance: {
      codeLineFloor: allowance?.codeLineFloor ?? current.lowComplexityAllowance.codeLineFloor,
      maxCyclomaticComplexityExclusive: allowance?.maxCyclomaticComplexityExclusive
        ?? current.lowComplexityAllowance.maxCyclomaticComplexityExclusive
    }
  };
}

function replaceMetricThreshold(
  current: Readonly<{ readonly absoluteFloor: number; readonly changedDelta: number }>,
  replacement: Readonly<{ readonly absoluteFloor?: number; readonly changedDelta?: number }> | undefined
): Readonly<{ readonly absoluteFloor: number; readonly changedDelta: number }> {
  return {
    absoluteFloor: replacement?.absoluteFloor ?? current.absoluteFloor,
    changedDelta: replacement?.changedDelta ?? current.changedDelta
  };
}

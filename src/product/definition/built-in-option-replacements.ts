import type {
  DuplicateDetectionOptions,
  FileMetricsOptions,
  FunctionMetricsOptions
} from "./built-in-data-model.ts";
import type {
  DuplicateDetectionOptionsReplacement,
  FileMetricsOptionsReplacement,
  FunctionMetricsOptionsReplacement
} from "./adjustment-patches.ts";

export function replaceDuplicateDetectionOptions(
  current: DuplicateDetectionOptions,
  replacement: DuplicateDetectionOptionsReplacement | undefined
): DuplicateDetectionOptions {
  return {
    defaultMinimumTokens: replacement?.defaultMinimumTokens ?? current.defaultMinimumTokens,
    fragments: { changedDelta: replacement?.fragments?.changedDelta ?? current.fragments.changedDelta },
    minimumTokensByCodeArea: replacement?.minimumTokensByCodeArea ?? current.minimumTokensByCodeArea
  };
}

export function replaceFileMetricsOptions(
  current: FileMetricsOptions,
  replacement: FileMetricsOptionsReplacement | undefined
): FileMetricsOptions {
  const codeLines = replacement?.codeLines;
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

export function replaceFunctionMetricsOptions(
  current: FunctionMetricsOptions,
  replacement: FunctionMetricsOptionsReplacement | undefined
): FunctionMetricsOptions {
  return {
    codeLines: replaceFunctionCodeLines(current.codeLines, replacement?.codeLines),
    cyclomaticComplexity: replaceMetricThreshold(current.cyclomaticComplexity, replacement?.cyclomaticComplexity),
    parameterCount: replaceMetricThreshold(current.parameterCount, replacement?.parameterCount)
  };
}

function replaceFunctionCodeLines(
  current: FunctionMetricsOptions["codeLines"],
  replacement: FunctionMetricsOptionsReplacement["codeLines"] | undefined
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

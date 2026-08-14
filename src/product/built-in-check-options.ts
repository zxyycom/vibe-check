import type {
  BuiltInCheckId,
  BuiltInCheckOptions,
  DuplicateDetectionOptions,
  FileMetricsOptions,
  FunctionMetricsOptions
} from "./built-in-checks.ts";
import { snapshotClosedRecord } from "./quality-core/src/check-record/plain-record-values.ts";

export function parseBuiltInCheckOptions(
  checkId: BuiltInCheckId,
  value: unknown
): BuiltInCheckOptions | undefined {
  const data = snapshotClosedRecord(value);
  if (data === undefined) return undefined;
  if (checkId === "duplicate-detection") return parseDuplicateDetectionOptions(data);
  if (checkId === "file-metrics") return parseFileMetricsOptions(data);
  return parseFunctionMetricsOptions(data);
}

export function builtInOptionCodeAreasAreKnown(
  checkId: BuiltInCheckId | null,
  options: BuiltInCheckOptions | null,
  codeAreas: Readonly<Record<string, unknown>>
): boolean {
  return checkId !== "duplicate-detection" || options === null
    || Object.keys((options as DuplicateDetectionOptions).minimumTokensByCodeArea)
      .every((area) => Object.hasOwn(codeAreas, area));
}

function parseDuplicateDetectionOptions(
  data: Readonly<Record<string, unknown>>
): DuplicateDetectionOptions | undefined {
  const fragments = exactData(data.fragments, ["changedDelta"]);
  if (!exactData(data, ["defaultMinimumTokens", "fragments", "minimumTokensByCodeArea"])
    || fragments === undefined || !finiteNumber(data.defaultMinimumTokens)
    || !finiteNumber(fragments.changedDelta) || !isNumberRecord(data.minimumTokensByCodeArea)) return undefined;
  return Object.freeze({
    defaultMinimumTokens: data.defaultMinimumTokens,
    fragments: Object.freeze({ changedDelta: fragments.changedDelta }),
    minimumTokensByCodeArea: Object.freeze({ ...data.minimumTokensByCodeArea })
  });
}

function parseFileMetricsOptions(
  data: Readonly<Record<string, unknown>>
): FileMetricsOptions | undefined {
  const codeLines = exactData(data.codeLines, ["absoluteFloor", "changedDelta", "lowDecisionTokenAllowance"]);
  const allowance = codeLines === undefined
    ? undefined
    : exactData(codeLines.lowDecisionTokenAllowance, ["codeLineFloor", "maxDecisionTokens"]);
  if (!exactData(data, ["codeLines"]) || codeLines === undefined || allowance === undefined
    || !finiteNumber(codeLines.absoluteFloor) || !finiteNumber(codeLines.changedDelta)
    || !finiteNumber(allowance.codeLineFloor) || !finiteNumber(allowance.maxDecisionTokens)) return undefined;
  return Object.freeze({
    codeLines: Object.freeze({
      absoluteFloor: codeLines.absoluteFloor,
      changedDelta: codeLines.changedDelta,
      lowDecisionTokenAllowance: Object.freeze({
        codeLineFloor: allowance.codeLineFloor,
        maxDecisionTokens: allowance.maxDecisionTokens
      })
    })
  });
}

function parseFunctionMetricsOptions(
  data: Readonly<Record<string, unknown>>
): FunctionMetricsOptions | undefined {
  if (!exactData(data, ["codeLines", "cyclomaticComplexity", "parameterCount"])) return undefined;
  const codeLines = parseFunctionCodeLineOptions(data.codeLines);
  const cyclomaticComplexity = parseMetricThreshold(data.cyclomaticComplexity);
  const parameterCount = parseMetricThreshold(data.parameterCount);
  if (codeLines === undefined || cyclomaticComplexity === undefined || parameterCount === undefined) return undefined;
  return Object.freeze({
    codeLines,
    cyclomaticComplexity: Object.freeze({
      absoluteFloor: cyclomaticComplexity.absoluteFloor,
      changedDelta: cyclomaticComplexity.changedDelta
    }),
    parameterCount: Object.freeze({
      absoluteFloor: parameterCount.absoluteFloor,
      changedDelta: parameterCount.changedDelta
    })
  });
}

function parseFunctionCodeLineOptions(
  value: unknown
): FunctionMetricsOptions["codeLines"] | undefined {
  const codeLines = exactData(value, ["absoluteFloor", "changedDelta", "lowComplexityAllowance"]);
  const allowance = codeLines === undefined
    ? undefined
    : exactData(codeLines.lowComplexityAllowance, ["codeLineFloor", "maxCyclomaticComplexityExclusive"]);
  if (codeLines === undefined || allowance === undefined || !finiteNumber(codeLines.absoluteFloor)
    || !finiteNumber(codeLines.changedDelta) || !finiteNumber(allowance.codeLineFloor)
    || !finiteNumber(allowance.maxCyclomaticComplexityExclusive)) return undefined;
  return Object.freeze({
    absoluteFloor: codeLines.absoluteFloor,
    changedDelta: codeLines.changedDelta,
    lowComplexityAllowance: Object.freeze({
      codeLineFloor: allowance.codeLineFloor,
      maxCyclomaticComplexityExclusive: allowance.maxCyclomaticComplexityExclusive
    })
  });
}

function parseMetricThreshold(
  value: unknown
): Readonly<{ readonly absoluteFloor: number; readonly changedDelta: number }> | undefined {
  const data = exactData(value, ["absoluteFloor", "changedDelta"]);
  return data !== undefined && finiteNumber(data.absoluteFloor) && finiteNumber(data.changedDelta)
    ? Object.freeze({ absoluteFloor: data.absoluteFloor, changedDelta: data.changedDelta })
    : undefined;
}

function exactData(
  value: unknown,
  requiredKeys: readonly string[]
): Readonly<Record<string, unknown>> | undefined {
  const data = snapshotClosedRecord(value);
  if (data === undefined) return undefined;
  const keys = Object.keys(data);
  return requiredKeys.every((key) => keys.includes(key)) && keys.length === requiredKeys.length
    ? data
    : undefined;
}

function isNumberRecord(value: unknown): value is Readonly<Record<string, number>> {
  const data = snapshotClosedRecord(value);
  return data !== undefined && Object.values(data).every(finiteNumber);
}

function finiteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

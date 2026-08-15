import { isCheckTreeReferenceId } from "./check-tree/identity.ts";
import {
  snapshotClosedArray,
  snapshotClosedRecord
} from "../quality-core/check-record/plain-record-values.ts";

export interface DuplicateDetectionOptionsReplacement {
  readonly defaultMinimumTokens?: number;
  readonly fragments?: Readonly<{ readonly changedDelta?: number }>;
  /** Replaces the complete code-area threshold map; individual entries are not merged. */
  readonly minimumTokensByCodeArea?: Readonly<Record<string, number>>;
}

export interface FileMetricsOptionsReplacement {
  readonly codeLines?: Readonly<{
    readonly absoluteFloor?: number;
    readonly changedDelta?: number;
    readonly lowDecisionTokenAllowance?: Readonly<{
      readonly codeLineFloor?: number;
      readonly maxDecisionTokens?: number;
    }>;
  }>;
}

export interface FunctionMetricsOptionsReplacement {
  readonly codeLines?: Readonly<{
    readonly absoluteFloor?: number;
    readonly changedDelta?: number;
    readonly lowComplexityAllowance?: Readonly<{
      readonly codeLineFloor?: number;
      readonly maxCyclomaticComplexityExclusive?: number;
    }>;
  }>;
  readonly cyclomaticComplexity?: Readonly<{
    readonly absoluteFloor?: number;
    readonly changedDelta?: number;
  }>;
  readonly parameterCount?: Readonly<{
    readonly absoluteFloor?: number;
    readonly changedDelta?: number;
  }>;
}

export interface BuiltInCheckReplacement<OptionsReplacement> {
  readonly options?: OptionsReplacement;
  readonly dependsOn?: string | readonly string[];
  readonly maxParallel?: number;
  readonly mutex?: string | readonly string[];
}

export interface BuiltInCheckSchedulingAppend {
  readonly dependsOn?: string | readonly string[];
  readonly mutex?: string | readonly string[];
}

type SchedulingField = "dependsOn" | "mutex";

export function parseBuiltInReplacement<OptionsReplacement>(
  value: unknown,
  parseOptions: (value: unknown) => OptionsReplacement
): BuiltInCheckReplacement<OptionsReplacement> {
  const data = snapshotPatch(value, ["options", "dependsOn", "maxParallel", "mutex"]);
  return {
    ...(Object.hasOwn(data, "options") ? { options: parseOptions(data.options) } : {}),
    ...(Object.hasOwn(data, "dependsOn") ? { dependsOn: parseSchedulingValue(data.dependsOn, "dependsOn") } : {}),
    ...(Object.hasOwn(data, "maxParallel") ? { maxParallel: parseMaxParallel(data.maxParallel) } : {}),
    ...(Object.hasOwn(data, "mutex") ? { mutex: parseSchedulingValue(data.mutex, "mutex") } : {})
  };
}

export function parseSchedulingAppend(value: unknown): BuiltInCheckSchedulingAppend {
  const data = snapshotPatch(value, ["dependsOn", "mutex"]);
  return {
    ...(Object.hasOwn(data, "dependsOn") ? { dependsOn: parseSchedulingValue(data.dependsOn, "dependsOn") } : {}),
    ...(Object.hasOwn(data, "mutex") ? { mutex: parseSchedulingValue(data.mutex, "mutex") } : {})
  };
}

export function parseDuplicateDetectionOptionsReplacement(value: unknown): DuplicateDetectionOptionsReplacement {
  const data = snapshotPatch(value, ["defaultMinimumTokens", "fragments", "minimumTokensByCodeArea"]);
  return {
    ...(Object.hasOwn(data, "defaultMinimumTokens")
      ? { defaultMinimumTokens: finiteNumber(data.defaultMinimumTokens) }
      : {}),
    ...(Object.hasOwn(data, "fragments")
      ? { fragments: parseNumberFields(data.fragments, ["changedDelta"]) }
      : {}),
    ...(Object.hasOwn(data, "minimumTokensByCodeArea")
      ? { minimumTokensByCodeArea: parseNumberMap(data.minimumTokensByCodeArea) }
      : {})
  };
}

export function parseFileMetricsOptionsReplacement(value: unknown): FileMetricsOptionsReplacement {
  const data = snapshotPatch(value, ["codeLines"]);
  if (!Object.hasOwn(data, "codeLines")) return {};
  const codeLines = snapshotPatch(data.codeLines, ["absoluteFloor", "changedDelta", "lowDecisionTokenAllowance"]);
  return {
    codeLines: {
      ...(Object.hasOwn(codeLines, "absoluteFloor")
        ? { absoluteFloor: finiteNumber(codeLines.absoluteFloor) }
        : {}),
      ...(Object.hasOwn(codeLines, "changedDelta")
        ? { changedDelta: finiteNumber(codeLines.changedDelta) }
        : {}),
      ...(Object.hasOwn(codeLines, "lowDecisionTokenAllowance")
        ? { lowDecisionTokenAllowance: parseNumberFields(
          codeLines.lowDecisionTokenAllowance,
          ["codeLineFloor", "maxDecisionTokens"]
        ) }
        : {})
    }
  };
}

export function parseFunctionMetricsOptionsReplacement(value: unknown): FunctionMetricsOptionsReplacement {
  const data = snapshotPatch(value, ["codeLines", "cyclomaticComplexity", "parameterCount"]);
  return {
    ...(Object.hasOwn(data, "codeLines")
      ? { codeLines: parseFunctionCodeLinesReplacement(data.codeLines) }
      : {}),
    ...(Object.hasOwn(data, "cyclomaticComplexity")
      ? { cyclomaticComplexity: parseNumberFields(data.cyclomaticComplexity, ["absoluteFloor", "changedDelta"]) }
      : {}),
    ...(Object.hasOwn(data, "parameterCount")
      ? { parameterCount: parseNumberFields(data.parameterCount, ["absoluteFloor", "changedDelta"]) }
      : {})
  };
}

export function appendScheduling(
  current: string | readonly string[] | undefined,
  appended: string | readonly string[]
): readonly string[] {
  const values = [...schedulingValues(current), ...schedulingValues(appended)];
  return Object.freeze(values.filter((value, index) => values.indexOf(value) === index));
}

export function parseMaxParallel(value: unknown): number {
  return typeof value === "number" && Number.isSafeInteger(value) && value > 0
    ? value
    : invalidAdjustment();
}

export function parseSchedulingValue(
  value: unknown,
  field: SchedulingField
): string | readonly string[] {
  if (typeof value === "string" && isSchedulingValue(value, field)) return value;
  const items = snapshotClosedArray(value);
  if (items === undefined || items.length === 0
    || items.some((item) => typeof item !== "string" || !isSchedulingValue(item, field))) {
    return invalidAdjustment();
  }
  return Object.freeze([...items] as string[]);
}

function parseFunctionCodeLinesReplacement(
  value: unknown
): NonNullable<FunctionMetricsOptionsReplacement["codeLines"]> {
  const data = snapshotPatch(value, ["absoluteFloor", "changedDelta", "lowComplexityAllowance"]);
  return {
    ...(Object.hasOwn(data, "absoluteFloor") ? { absoluteFloor: finiteNumber(data.absoluteFloor) } : {}),
    ...(Object.hasOwn(data, "changedDelta") ? { changedDelta: finiteNumber(data.changedDelta) } : {}),
    ...(Object.hasOwn(data, "lowComplexityAllowance")
      ? { lowComplexityAllowance: parseNumberFields(
        data.lowComplexityAllowance,
        ["codeLineFloor", "maxCyclomaticComplexityExclusive"]
      ) }
      : {})
  };
}

function parseNumberFields(value: unknown, allowedKeys: readonly string[]): Readonly<Record<string, number>> {
  const data = snapshotPatch(value, allowedKeys);
  return Object.freeze(Object.fromEntries(Object.entries(data).map(([key, field]) => [key, finiteNumber(field)])));
}

function parseNumberMap(value: unknown): Readonly<Record<string, number>> {
  const data = snapshotClosedRecord(value);
  if (data === undefined) return invalidAdjustment();
  return Object.freeze(Object.fromEntries(Object.entries(data).map(([key, field]) => [key, finiteNumber(field)])));
}

function snapshotPatch(value: unknown, allowedKeys: readonly string[]): Readonly<Record<string, unknown>> {
  const data = snapshotClosedRecord(value);
  return data === undefined || Object.keys(data).some((key) => !allowedKeys.includes(key))
    ? invalidAdjustment()
    : data;
}

function isSchedulingValue(value: string, field: SchedulingField): boolean {
  return field === "dependsOn" ? isCheckTreeReferenceId(value) : value.length > 0;
}

function schedulingValues(value: string | readonly string[] | undefined): readonly string[] {
  return value === undefined ? [] : typeof value === "string" ? [value] : value;
}

function finiteNumber(value: unknown): number {
  return typeof value === "number" && Number.isFinite(value) ? value : invalidAdjustment();
}

function invalidAdjustment(): never {
  throw new TypeError("Invalid built-in Check adjustment");
}

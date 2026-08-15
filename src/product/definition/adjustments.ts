import {
  buildBuiltInCheck,
  parseBuiltInCheck
} from "./built-ins.ts";
import {
  replaceDuplicateDetectionOptions,
  replaceFileMetricsOptions,
  replaceFunctionMetricsOptions
} from "./built-in-option-replacements.ts";
import type {
  AnyBuiltInCheck,
  BuiltInCheckReplacementById,
  DuplicateDetectionCheck,
  FileMetricsCheck,
  FunctionMetricsCheck
} from "./built-in-data-model.ts";
import {
  appendScheduling,
  parseBuiltInReplacement,
  parseDuplicateDetectionOptionsReplacement,
  parseFileMetricsOptionsReplacement,
  parseFunctionMetricsOptionsReplacement,
  parseSchedulingAppend,
  type BuiltInCheckSchedulingAppend
} from "./adjustment-patches.ts";

export type {
  BuiltInCheckReplacement,
  BuiltInCheckSchedulingAppend,
  DuplicateDetectionOptionsReplacement,
  FileMetricsOptionsReplacement,
  FunctionMetricsOptionsReplacement
} from "./adjustment-patches.ts";

export function replace(
  check: DuplicateDetectionCheck,
  replacement: BuiltInCheckReplacementById["duplicate-detection"]
): DuplicateDetectionCheck;
export function replace(
  check: FileMetricsCheck,
  replacement: BuiltInCheckReplacementById["file-metrics"]
): FileMetricsCheck;
export function replace(
  check: FunctionMetricsCheck,
  replacement: BuiltInCheckReplacementById["function-metrics"]
): FunctionMetricsCheck;
export function replace(check: unknown, replacement: unknown): AnyBuiltInCheck {
  const source = parseBuiltInCheck(check);
  if (source === undefined) return invalidAdjustment();
  if (source.checkId === "duplicate-detection") return replaceDuplicateDetection(source, replacement);
  if (source.checkId === "file-metrics") return replaceFileMetrics(source, replacement);
  return replaceFunctionMetrics(source, replacement);
}

export function append(
  check: DuplicateDetectionCheck,
  additions: BuiltInCheckSchedulingAppend
): DuplicateDetectionCheck;
export function append(check: FileMetricsCheck, additions: BuiltInCheckSchedulingAppend): FileMetricsCheck;
export function append(check: FunctionMetricsCheck, additions: BuiltInCheckSchedulingAppend): FunctionMetricsCheck;
export function append(check: unknown, additions: unknown): AnyBuiltInCheck {
  const source = parseBuiltInCheck(check);
  if (source === undefined) return invalidAdjustment();
  const parsed = parseSchedulingAppend(additions);
  if (source.checkId === "duplicate-detection") return appendDuplicateDetection(source, parsed);
  if (source.checkId === "file-metrics") return appendFileMetrics(source, parsed);
  return appendFunctionMetrics(source, parsed);
}

function replaceDuplicateDetection(source: DuplicateDetectionCheck, replacement: unknown): DuplicateDetectionCheck {
  const parsed = parseBuiltInReplacement(replacement, parseDuplicateDetectionOptionsReplacement);
  return buildBuiltInCheck({
    checkId: "duplicate-detection",
    options: parsed.options === undefined
      ? source.options
      : replaceDuplicateDetectionOptions(source.options, parsed.options),
    dependsOn: parsed.dependsOn ?? source.dependsOn,
    maxParallel: parsed.maxParallel ?? source.maxParallel,
    mutex: parsed.mutex ?? source.mutex
  });
}

function replaceFileMetrics(source: FileMetricsCheck, replacement: unknown): FileMetricsCheck {
  const parsed = parseBuiltInReplacement(replacement, parseFileMetricsOptionsReplacement);
  return buildBuiltInCheck({
    checkId: "file-metrics",
    options: parsed.options === undefined
      ? source.options
      : replaceFileMetricsOptions(source.options, parsed.options),
    dependsOn: parsed.dependsOn ?? source.dependsOn,
    maxParallel: parsed.maxParallel ?? source.maxParallel,
    mutex: parsed.mutex ?? source.mutex
  });
}

function replaceFunctionMetrics(source: FunctionMetricsCheck, replacement: unknown): FunctionMetricsCheck {
  const parsed = parseBuiltInReplacement(replacement, parseFunctionMetricsOptionsReplacement);
  return buildBuiltInCheck({
    checkId: "function-metrics",
    options: parsed.options === undefined
      ? source.options
      : replaceFunctionMetricsOptions(source.options, parsed.options),
    dependsOn: parsed.dependsOn ?? source.dependsOn,
    maxParallel: parsed.maxParallel ?? source.maxParallel,
    mutex: parsed.mutex ?? source.mutex
  });
}

function appendDuplicateDetection(
  source: DuplicateDetectionCheck,
  additions: BuiltInCheckSchedulingAppend
): DuplicateDetectionCheck {
  return buildBuiltInCheck({
    checkId: "duplicate-detection",
    options: source.options,
    dependsOn: appendValue(source.dependsOn, additions.dependsOn),
    maxParallel: source.maxParallel,
    mutex: appendValue(source.mutex, additions.mutex)
  });
}

function appendFileMetrics(
  source: FileMetricsCheck,
  additions: BuiltInCheckSchedulingAppend
): FileMetricsCheck {
  return buildBuiltInCheck({
    checkId: "file-metrics",
    options: source.options,
    dependsOn: appendValue(source.dependsOn, additions.dependsOn),
    maxParallel: source.maxParallel,
    mutex: appendValue(source.mutex, additions.mutex)
  });
}

function appendFunctionMetrics(
  source: FunctionMetricsCheck,
  additions: BuiltInCheckSchedulingAppend
): FunctionMetricsCheck {
  return buildBuiltInCheck({
    checkId: "function-metrics",
    options: source.options,
    dependsOn: appendValue(source.dependsOn, additions.dependsOn),
    maxParallel: source.maxParallel,
    mutex: appendValue(source.mutex, additions.mutex)
  });
}

function appendValue(
  current: string | readonly string[] | undefined,
  additions: string | readonly string[] | undefined
): string | readonly string[] | undefined {
  return additions === undefined ? current : appendScheduling(current, additions);
}

function invalidAdjustment(): never {
  throw new TypeError("Invalid built-in Check adjustment");
}

import type {
  DuplicateCodeFragment,
  FileMetric,
  FunctionMetric,
  ResolvedQualityConfig
} from "../../model/schema.ts";
import type {
  FunctionBaselineComparison,
  FunctionBaselineComparisonIndex,
  WarningBaseline,
  WarningContext
} from "./warning-model.ts";

export function buildWarningContext(
  config: ResolvedQualityConfig,
  baseline: WarningBaseline,
  currentFunctions: FunctionMetric[]
): WarningContext {
  const baselineFiles = buildFileBaselineMap(baseline?.files || []);
  const baselineDuplicateIndex = buildDuplicateBaselineIndex(baseline?.duplicates || []);
  const hasBaselineFiles = Array.isArray(baseline?.files);
  const hasBaselineDuplicates = Array.isArray(baseline?.duplicates);
  const functionBaselineComparisons = buildFunctionBaselineComparisons(
    currentFunctions,
    baseline?.functions ?? [],
    Array.isArray(baseline?.functions)
  );

  return {
    baselineDuplicateIndex,
    baselineFiles,
    config,
    functionBaselineComparisons,
    hasBaselineDuplicates,
    hasBaselineFiles
  };
}

export function functionBaselineComparison(
  func: FunctionMetric,
  context: WarningContext
): FunctionBaselineComparison {
  return context.functionBaselineComparisons.get(func.file)?.get(func.name)
    ?? { kind: "not-comparable" };
}

export function countMatchingBaselineDuplicates(
  dup: DuplicateCodeFragment,
  baselineIndex: Map<string, number>,
  hasBaselineDuplicates: boolean
): number | null {
  if (!hasBaselineDuplicates) {
    return null;
  }
  return baselineIndex.get(duplicateKey(dup)) || 0;
}

function buildFileBaselineMap(files: FileMetric[]): Map<string, FileMetric> {
  return new Map(files.map((file) => [file.path, file]));
}

function buildFunctionBaselineComparisons(
  currentFunctions: FunctionMetric[],
  baselineFunctions: FunctionMetric[],
  hasBaselineFunctions: boolean
): FunctionBaselineComparisonIndex {
  const comparisons: FunctionBaselineComparisonIndex = new Map();
  if (!hasBaselineFunctions) {
    return comparisons;
  }

  const currentGroups = groupFunctionsByFileAndName(currentFunctions);
  const baselineGroups = groupFunctionsByFileAndName(baselineFunctions);

  for (const [file, currentNames] of currentGroups) {
    for (const [name, currentGroup] of currentNames) {
      const baselineGroup = baselineGroups.get(file)?.get(name) ?? [];
      setFunctionBaselineComparison(
        comparisons,
        file,
        name,
        compareFunctionGroups(name, currentGroup, baselineGroup)
      );
    }
  }

  return comparisons;
}

function compareFunctionGroups(
  name: string,
  currentGroup: FunctionMetric[],
  baselineGroup: FunctionMetric[]
): FunctionBaselineComparison {
  if (!isStableFunctionName(name) || currentGroup.length !== 1 || baselineGroup.length > 1) {
    return { kind: "not-comparable" };
  }
  if (baselineGroup.length === 0) {
    return { kind: "new" };
  }
  return { baseline: baselineGroup[0]!, kind: "matched" };
}

function groupFunctionsByFileAndName(
  functions: FunctionMetric[]
): Map<string, Map<string, FunctionMetric[]>> {
  const groups = new Map<string, Map<string, FunctionMetric[]>>();
  for (const func of functions) {
    let names = groups.get(func.file);
    if (!names) {
      names = new Map();
      groups.set(func.file, names);
    }
    const group = names.get(func.name) ?? [];
    group.push(func);
    names.set(func.name, group);
  }
  return groups;
}

function setFunctionBaselineComparison(
  comparisons: FunctionBaselineComparisonIndex,
  file: string,
  name: string,
  comparison: FunctionBaselineComparison
): void {
  let names = comparisons.get(file);
  if (!names) {
    names = new Map();
    comparisons.set(file, names);
  }
  names.set(name, comparison);
}

function isStableFunctionName(name: string): boolean {
  return name.trim() !== "" && name !== "(anonymous)" && name !== "unknown";
}

function buildDuplicateBaselineIndex(duplicates: DuplicateCodeFragment[]): Map<string, number> {
  const index = new Map<string, number>();
  for (const dup of duplicates) {
    const key = duplicateKey(dup);
    index.set(key, (index.get(key) || 0) + 1);
  }
  return index;
}

function duplicateKey(dup: DuplicateCodeFragment): string {
  return dup.locations
    .map((loc) => `${loc.path}:${loc.startLine}`)
    .sort()
    .join("|");
}

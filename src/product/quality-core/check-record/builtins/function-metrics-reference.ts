import type { RelationId } from "./builtin-support.ts";
import type { FunctionMetricAnalysis, FunctionValues } from "./function-metrics-analysis.ts";
import { recordKey, type FunctionRecordCandidate } from "./function-metrics-records.ts";
import type { FunctionMetricsSemantics } from "./function-metrics.ts";

export function buildFunctionRelations(
  candidates: readonly FunctionRecordCandidate[],
  currentAnalysis: FunctionMetricAnalysis,
  referenceAnalysis: FunctionMetricAnalysis,
  semantics: FunctionMetricsSemantics
): Map<string, readonly RelationId[]> {
  const relations = new Map<string, readonly RelationId[]>();
  for (const candidate of candidates) {
    relations.set(
      recordKey(candidate.record),
      relationForCandidate(candidate, currentAnalysis, referenceAnalysis, semantics)
    );
  }
  return relations;
}

function relationForCandidate(
  candidate: FunctionRecordCandidate,
  currentAnalysis: FunctionMetricAnalysis,
  referenceAnalysis: FunctionMetricAnalysis,
  semantics: FunctionMetricsSemantics
): readonly RelationId[] {
  if (!candidate.isChanged) {
    return Object.freeze([]);
  }
  const currentGroup = currentAnalysis.groups.get(candidate.comparisonKey) ?? [];
  const referenceGroup = referenceAnalysis.groups.get(candidate.comparisonKey) ?? [];
  if (hasAmbiguousComparison(candidate, currentGroup, referenceGroup)) {
    return Object.freeze(["changed"]);
  }
  const baselineValue = baselineValueForCandidate(candidate, referenceGroup[0]);
  if (baselineValue === null) {
    return Object.freeze(["changed"]);
  }
  const delta = candidate.value - baselineValue;
  return Object.freeze([relationForDelta(candidate, delta, semantics)]);
}

function hasAmbiguousComparison(
  candidate: FunctionRecordCandidate,
  currentGroup: readonly FunctionValues[],
  referenceGroup: readonly FunctionValues[]
): boolean {
  return !candidate.hasStableName || currentGroup.length !== 1 || referenceGroup.length > 1;
}

function relationForDelta(
  candidate: FunctionRecordCandidate,
  delta: number,
  semantics: FunctionMetricsSemantics
): RelationId {
  return delta > changedDeltaForRecordType(candidate.record.recordTypeId, semantics)
    ? "regression"
    : "changed";
}

function baselineValueForCandidate(
  candidate: FunctionRecordCandidate,
  reference: FunctionValues | undefined
): number | null {
  return reference === undefined ? 0 : valueForRecordType(reference, candidate.record.recordTypeId);
}

function valueForRecordType(values: FunctionValues, recordTypeId: string): number | null {
  switch (recordTypeId) {
    case "function-code-lines":
      return values.codeLines;
    case "function-cyclomatic-complexity":
      return values.cyclomaticComplexity;
    case "function-parameter-count":
      return values.parameterCount;
    default:
      return null;
  }
}

function changedDeltaForRecordType(
  recordTypeId: string,
  semantics: FunctionMetricsSemantics
): number {
  switch (recordTypeId) {
    case "function-code-lines":
      return semantics.functions.codeLines.changedDelta;
    case "function-cyclomatic-complexity":
      return semantics.functions.cyclomaticComplexity.changedDelta;
    case "function-parameter-count":
      return semantics.functions.parameterCount.changedDelta;
    default:
      return Number.POSITIVE_INFINITY;
  }
}

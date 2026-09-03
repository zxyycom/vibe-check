import type { FunctionMetric } from "./measurement-model.ts";
import { canonicalJsonBytes } from "../../data-boundary/canonical-data.ts";

export interface FunctionMetricInstance {
  readonly metric: FunctionMetric;
  readonly semanticSubject: string;
}

export interface FunctionMetricAnalysis {
  readonly instances: readonly FunctionMetricInstance[];
}

export function analyzeFunctionMetrics(
  metrics: readonly unknown[]
): FunctionMetricAnalysis | undefined {
  const metricsByIdentity = groupValidMetrics(metrics);
  if (metricsByIdentity === undefined) {
    return undefined;
  }
  const instances: FunctionMetricInstance[] = [];
  for (const group of metricsByIdentity.values()) {
    const sortedGroup = [...group].sort(compareFunctionInstances);
    instances.push(...createFunctionInstances(sortedGroup));
  }
  instances.sort((left, right) => compareText(left.semanticSubject, right.semanticSubject));
  return Object.freeze({ instances: Object.freeze(instances) });
}

function groupValidMetrics(metrics: readonly unknown[]): Map<string, FunctionMetric[]> | undefined {
  const groups = new Map<string, FunctionMetric[]>();
  for (const metric of metrics) {
    if (!isValidFunctionMetric(metric)) {
      return undefined;
    }
    const key = functionIdentityKey(metric);
    const group = groups.get(key) ?? [];
    group.push(metric);
    groups.set(key, group);
  }
  return groups;
}

function createFunctionInstances(sortedGroup: readonly FunctionMetric[]): FunctionMetricInstance[] {
  return sortedGroup.map((metric, index) =>
    Object.freeze({
      metric,
      semanticSubject:
        isStableFunctionName(metric.name) && sortedGroup.length === 1
          ? functionSubject(metric)
          : ambiguousFunctionSubject(metric, index + 1)
    })
  );
}

function isValidFunctionMetric(metric: unknown): metric is FunctionMetric {
  if (!isRecord(metric)) return false;
  return (
    typeof metric.file === "string" &&
    metric.file.length > 0 &&
    typeof metric.name === "string" &&
    metric.name.length > 0 &&
    hasValidFunctionLocation(metric) &&
    hasValidFunctionMeasurements(metric)
  );
}

function hasValidFunctionLocation(metric: Readonly<Record<string, unknown>>): boolean {
  return (
    isPositiveSafeInteger(metric.startLine) &&
    isPositiveSafeInteger(metric.endLine) &&
    metric.endLine >= metric.startLine
  );
}

function hasValidFunctionMeasurements(metric: Readonly<Record<string, unknown>>): boolean {
  return (
    isValidNonNegativeInteger(metric.lines) &&
    isValidNonNegativeInteger(metric.parameterCount) &&
    validCyclomaticComplexity(metric.cyclomaticComplexity) &&
    validNestingDepth(metric.nestingDepth) &&
    validComplexityContributors(metric.complexityContributors)
  );
}

function validCyclomaticComplexity(value: unknown): boolean {
  if (!isRecord(value) || value.source !== "typescript-analyzer") return false;
  return value.value === null || isValidNonNegativeInteger(value.value);
}

function validNestingDepth(value: unknown): boolean {
  return (
    isRecord(value) &&
    value.source === "typescript-analyzer" &&
    isValidNonNegativeInteger(value.value)
  );
}

function validComplexityContributors(value: unknown): boolean {
  return (
    Array.isArray(value) &&
    value.every(
      (contributor) =>
        isRecord(contributor) &&
        typeof contributor.token === "string" &&
        isPositiveSafeInteger(contributor.line)
    )
  );
}

function isValidNonNegativeInteger(value: unknown): value is number {
  return typeof value === "number" && Number.isSafeInteger(value) && value >= 0;
}

function isPositiveSafeInteger(value: unknown): value is number {
  return typeof value === "number" && Number.isSafeInteger(value) && value >= 1;
}

function isRecord(value: unknown): value is Readonly<Record<string, unknown>> {
  return typeof value === "object" && value !== null;
}

function functionSubject(metric: Pick<FunctionMetric, "file" | "name">): string {
  const identity = new TextDecoder().decode(
    canonicalJsonBytes({
      file: metric.file,
      name: metric.name
    })
  );
  return `function:${identity}`;
}

function ambiguousFunctionSubject(
  metric: Pick<FunctionMetric, "file" | "name">,
  occurrence: number
): string {
  const identity = new TextDecoder().decode(
    canonicalJsonBytes({
      file: metric.file,
      name: metric.name,
      occurrence
    })
  );
  return `function-instance:${identity}`;
}

function functionIdentityKey(metric: Pick<FunctionMetric, "file" | "name">): string {
  return `${metric.file}\u0000${metric.name}`;
}

function compareFunctionInstances(left: FunctionMetric, right: FunctionMetric): number {
  return (
    left.startLine - right.startLine ||
    left.endLine - right.endLine ||
    left.lines - right.lines ||
    (left.cyclomaticComplexity.value ?? -1) - (right.cyclomaticComplexity.value ?? -1) ||
    left.nestingDepth.value - right.nestingDepth.value ||
    compareComplexityContributors(left.complexityContributors, right.complexityContributors) ||
    left.parameterCount - right.parameterCount
  );
}

function compareComplexityContributors(
  left: FunctionMetric["complexityContributors"],
  right: FunctionMetric["complexityContributors"]
): number {
  const commonLength = Math.min(left.length, right.length);
  for (let index = 0; index < commonLength; index += 1) {
    const lineDifference = left[index].line - right[index].line;
    if (lineDifference !== 0) return lineDifference;
    const tokenDifference = compareText(left[index].token, right[index].token);
    if (tokenDifference !== 0) return tokenDifference;
  }
  return left.length - right.length;
}

export function isStableFunctionName(name: string): boolean {
  return name.trim() !== "" && name !== "(anonymous)" && name !== "unknown";
}

function compareText(left: string, right: string): number {
  if (left < right) return -1;
  if (left > right) return 1;
  return 0;
}

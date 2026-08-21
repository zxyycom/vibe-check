import type { FunctionMetric } from "../../model/schema.ts";
import { canonicalJsonBytes } from "../identity.ts";
import { compareText } from "./builtin-support.ts";

export interface FunctionMetricInstance {
  readonly metric: FunctionMetric;
  readonly semanticSubject: string;
}

export interface FunctionMetricAnalysis {
  readonly instances: readonly FunctionMetricInstance[];
}

export function analyzeFunctionMetrics(
  metrics: readonly FunctionMetric[]
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

function groupValidMetrics(
  metrics: readonly FunctionMetric[]
): Map<string, FunctionMetric[]> | undefined {
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

function isValidFunctionMetric(metric: FunctionMetric): boolean {
  return (
    typeof metric.file === "string" &&
    metric.file.length > 0 &&
    typeof metric.name === "string" &&
    metric.name.length > 0 &&
    hasValidFunctionLocation(metric) &&
    hasValidFunctionMeasurements(metric)
  );
}

function hasValidFunctionLocation(metric: FunctionMetric): boolean {
  return (
    Number.isSafeInteger(metric.startLine) &&
    metric.startLine >= 1 &&
    Number.isSafeInteger(metric.endLine) &&
    metric.endLine >= metric.startLine
  );
}

function hasValidFunctionMeasurements(metric: FunctionMetric): boolean {
  const complexity = metric.cyclomaticComplexity.value;
  return (
    Number.isSafeInteger(metric.lines) &&
    metric.lines >= 0 &&
    Number.isSafeInteger(metric.parameterCount) &&
    metric.parameterCount >= 0 &&
    (complexity === null || isValidComplexity(complexity))
  );
}

function isValidComplexity(complexity: number): boolean {
  return Number.isSafeInteger(complexity) && complexity >= 0;
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
    left.lines - right.lines ||
    (left.cyclomaticComplexity.value ?? -1) - (right.cyclomaticComplexity.value ?? -1) ||
    left.parameterCount - right.parameterCount
  );
}

export function isStableFunctionName(name: string): boolean {
  return name.trim() !== "" && name !== "(anonymous)" && name !== "unknown";
}

import {
  isStableFunctionName,
  type FunctionMetricAnalysis,
  type FunctionMetricInstance
} from "./analysis.ts";
import type { FunctionMetric, FunctionMetricsAreaInput } from "./measurement-model.ts";
import type { ResolvedFunctionMetricsLimits } from "./options.ts";

type FunctionMetricName = "cyclomatic-complexity" | "function-code-density" | "parameter-count";

export interface FunctionRecordCandidate {
  readonly data: Readonly<{
    readonly blocking: boolean;
    readonly codeAreas: readonly string[];
    readonly functionName: string;
    readonly limit: number;
    readonly metric: FunctionMetricName;
    readonly path: string;
    readonly startLine: number;
    readonly value: number;
  }>;
  readonly id: string;
}

type MatchingFunctionMetricAreas = readonly [
  FunctionMetricsAreaInput,
  ...FunctionMetricsAreaInput[]
];

interface FunctionPolicyContext {
  readonly blocking: boolean;
  readonly codeAreas: readonly string[];
  readonly functionName: string;
}

interface FunctionMetricEvaluation {
  readonly blocking: boolean;
  readonly codeAreas: readonly string[];
  readonly functionName: string;
  readonly limit: number;
  readonly metric: FunctionMetricName;
  readonly path: string;
  readonly startLine: number;
  readonly subject: string;
  readonly value: number;
}

/** 为每个超过 matching-area 最严格阈值的 metric 构造 supplemental fact。 */
export function buildFunctionRecordCandidates(
  analysis: FunctionMetricAnalysis,
  areas: readonly FunctionMetricsAreaInput[]
): readonly FunctionRecordCandidate[] | undefined {
  const areasByPath = indexAreasByPath(areas);
  const candidates: FunctionRecordCandidate[] = [];
  for (const instance of analysis.instances) {
    const [firstArea, ...remainingAreas] = areasByPath.get(instance.metric.file) ?? [];
    if (firstArea === undefined) return undefined;
    const matchingAreas = [firstArea, ...remainingAreas] as const;
    const policyContext = resolveFunctionPolicyContext(instance, matchingAreas);
    for (const evaluation of metricEvaluations(instance, policyContext, matchingAreas)) {
      appendFindingCandidate(candidates, evaluation);
    }
  }
  candidates.sort((left, right) => compareText(left.id, right.id));
  return Object.freeze(candidates);
}

function indexAreasByPath(
  areas: readonly FunctionMetricsAreaInput[]
): ReadonlyMap<string, readonly FunctionMetricsAreaInput[]> {
  const mutableAreas = new Map<string, FunctionMetricsAreaInput[]>();
  for (const area of areas) {
    for (const path of area.approvedExactPaths) {
      const matchingAreas = mutableAreas.get(path) ?? [];
      matchingAreas.push(area);
      mutableAreas.set(path, matchingAreas);
    }
  }
  return new Map(
    Array.from(mutableAreas, ([path, matchingAreas]) => [path, Object.freeze(matchingAreas)])
  );
}

function resolveFunctionPolicyContext(
  instance: FunctionMetricInstance,
  matchingAreas: MatchingFunctionMetricAreas
): Readonly<FunctionPolicyContext> {
  return Object.freeze({
    blocking: matchingAreas.some((area) => area.findingPolicy === "blocking"),
    codeAreas: Object.freeze(uniqueSorted(matchingAreas.map((area) => area.codeArea))),
    functionName: isStableFunctionName(instance.metric.name) ? instance.metric.name : "<anonymous>"
  });
}

function metricEvaluations(
  instance: FunctionMetricInstance,
  policyContext: FunctionPolicyContext,
  matchingAreas: MatchingFunctionMetricAreas
): FunctionMetricEvaluation[] {
  const evaluations: FunctionMetricEvaluation[] = [];
  const complexityEvaluation = complexityMetricEvaluation(instance, policyContext, matchingAreas);
  if (complexityEvaluation !== null) evaluations.push(complexityEvaluation);
  evaluations.push(
    codeLinesMetricEvaluation(instance, policyContext, matchingAreas),
    parameterMetricEvaluation(instance, policyContext, matchingAreas)
  );
  return evaluations;
}

function sharedMetricEvaluation(
  instance: FunctionMetricInstance,
  policyContext: FunctionPolicyContext
) {
  return {
    blocking: policyContext.blocking,
    codeAreas: policyContext.codeAreas,
    functionName: policyContext.functionName,
    path: instance.metric.file,
    startLine: instance.metric.startLine,
    subject: instance.semanticSubject
  } as const;
}

function complexityMetricEvaluation(
  instance: FunctionMetricInstance,
  policyContext: FunctionPolicyContext,
  matchingAreas: MatchingFunctionMetricAreas
): FunctionMetricEvaluation | null {
  const value = instance.metric.cyclomaticComplexity.value;
  if (value === null) return null;
  return {
    ...sharedMetricEvaluation(instance, policyContext),
    limit: Math.min(...matchingAreas.map((area) => area.limits.cyclomaticComplexity.maximum)),
    metric: "cyclomatic-complexity",
    value
  };
}

function codeLinesMetricEvaluation(
  instance: FunctionMetricInstance,
  policyContext: FunctionPolicyContext,
  matchingAreas: MatchingFunctionMetricAreas
): FunctionMetricEvaluation {
  return {
    ...sharedMetricEvaluation(instance, policyContext),
    limit: Math.min(
      ...matchingAreas.map((area) => functionCodeLineMaximum(instance.metric, area.limits))
    ),
    metric: "function-code-density",
    value: instance.metric.lines
  };
}

function parameterMetricEvaluation(
  instance: FunctionMetricInstance,
  policyContext: FunctionPolicyContext,
  matchingAreas: MatchingFunctionMetricAreas
): FunctionMetricEvaluation {
  return {
    ...sharedMetricEvaluation(instance, policyContext),
    limit: Math.min(...matchingAreas.map((area) => area.limits.parameters.maximum)),
    metric: "parameter-count",
    value: instance.metric.parameterCount
  };
}

function appendFindingCandidate(
  candidates: FunctionRecordCandidate[],
  evaluation: FunctionMetricEvaluation
): void {
  if (evaluation.value <= evaluation.limit) return;
  candidates.push(
    Object.freeze({
      id: `${evaluation.subject}:${evaluation.metric}`,
      data: Object.freeze({
        blocking: evaluation.blocking,
        codeAreas: evaluation.codeAreas,
        functionName: evaluation.functionName,
        limit: evaluation.limit,
        metric: evaluation.metric,
        path: evaluation.path,
        startLine: evaluation.startLine,
        value: evaluation.value
      })
    })
  );
}

function functionCodeLineMaximum(
  metric: FunctionMetric,
  limits: ResolvedFunctionMetricsLimits
): number {
  const allowance = limits.codeLines.lowComplexityAllowance;
  const complexity = metric.cyclomaticComplexity.value;
  return complexity !== null && complexity < allowance.cyclomaticComplexityBelow
    ? allowance.maximum
    : limits.codeLines.maximum;
}

function uniqueSorted(values: readonly string[]): string[] {
  return [...new Set(values)].sort(compareText);
}

function compareText(left: string, right: string): number {
  if (left < right) return -1;
  if (left > right) return 1;
  return 0;
}

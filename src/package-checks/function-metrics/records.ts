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

interface CandidateInput {
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

/** Builds every supplemental fact that exceeds the strictest matching area limit. */
export function buildFunctionRecordCandidates(
  analysis: FunctionMetricAnalysis,
  areas: readonly FunctionMetricsAreaInput[]
): readonly FunctionRecordCandidate[] | undefined {
  const policiesByPath = buildPathPolicies(areas);
  const candidates: FunctionRecordCandidate[] = [];
  for (const instance of analysis.instances) {
    const policies = policiesByPath.get(instance.metric.file);
    if (policies === undefined || policies.length === 0) return undefined;
    const context = candidateContext(instance, policies);
    for (const input of metricCandidateInputs(instance, context, policies)) {
      appendCandidate(candidates, input);
    }
  }
  candidates.sort((left, right) => compareText(left.id, right.id));
  return Object.freeze(candidates);
}

function buildPathPolicies(
  areas: readonly FunctionMetricsAreaInput[]
): ReadonlyMap<string, readonly FunctionMetricsAreaInput[]> {
  const mutablePolicies = new Map<string, FunctionMetricsAreaInput[]>();
  for (const area of areas) {
    for (const path of area.approvedExactPaths) {
      const policies = mutablePolicies.get(path) ?? [];
      policies.push(area);
      mutablePolicies.set(path, policies);
    }
  }
  return new Map(
    Array.from(mutablePolicies, ([path, policies]) => [path, Object.freeze(policies)] as const)
  );
}

function candidateContext(
  instance: FunctionMetricInstance,
  policies: readonly FunctionMetricsAreaInput[]
): Readonly<{
  readonly blocking: boolean;
  readonly codeAreas: readonly string[];
  readonly functionName: string;
}> {
  return Object.freeze({
    blocking: policies.some((policy) => policy.findingPolicy === "blocking"),
    codeAreas: Object.freeze(uniqueSorted(policies.map((policy) => policy.codeArea))),
    functionName: isStableFunctionName(instance.metric.name) ? instance.metric.name : "<anonymous>"
  });
}

function metricCandidateInputs(
  instance: FunctionMetricInstance,
  context: ReturnType<typeof candidateContext>,
  policies: readonly FunctionMetricsAreaInput[]
): CandidateInput[] {
  const inputs: CandidateInput[] = [];
  const complexityInput = complexityCandidateInput(instance, context, policies);
  if (complexityInput !== null) inputs.push(complexityInput);
  inputs.push(
    codeLinesCandidateInput(instance, context, policies),
    parameterCandidateInput(instance, context, policies)
  );
  return inputs;
}

function sharedCandidateInput(
  instance: FunctionMetricInstance,
  context: ReturnType<typeof candidateContext>
) {
  return {
    blocking: context.blocking,
    codeAreas: context.codeAreas,
    functionName: context.functionName,
    path: instance.metric.file,
    startLine: instance.metric.startLine,
    subject: instance.semanticSubject
  } as const;
}

function complexityCandidateInput(
  instance: FunctionMetricInstance,
  context: ReturnType<typeof candidateContext>,
  policies: readonly FunctionMetricsAreaInput[]
): CandidateInput | null {
  const value = instance.metric.cyclomaticComplexity.value;
  if (value === null) return null;
  return {
    ...sharedCandidateInput(instance, context),
    limit: Math.min(...policies.map((policy) => policy.limits.cyclomaticComplexity.maximum)),
    metric: "cyclomatic-complexity",
    value
  };
}

function codeLinesCandidateInput(
  instance: FunctionMetricInstance,
  context: ReturnType<typeof candidateContext>,
  policies: readonly FunctionMetricsAreaInput[]
): CandidateInput {
  return {
    ...sharedCandidateInput(instance, context),
    limit: Math.min(
      ...policies.map((policy) => functionCodeLineMaximum(instance.metric, policy.limits))
    ),
    metric: "function-code-density",
    value: instance.metric.lines
  };
}

function parameterCandidateInput(
  instance: FunctionMetricInstance,
  context: ReturnType<typeof candidateContext>,
  policies: readonly FunctionMetricsAreaInput[]
): CandidateInput {
  return {
    ...sharedCandidateInput(instance, context),
    limit: Math.min(...policies.map((policy) => policy.limits.parameters.maximum)),
    metric: "parameter-count",
    value: instance.metric.parameterCount
  };
}

function appendCandidate(candidates: FunctionRecordCandidate[], input: CandidateInput): void {
  if (input.value <= input.limit) return;
  candidates.push(
    Object.freeze({
      id: `${input.subject}:${input.metric}`,
      data: Object.freeze({
        blocking: input.blocking,
        codeAreas: input.codeAreas,
        functionName: input.functionName,
        limit: input.limit,
        metric: input.metric,
        path: input.path,
        startLine: input.startLine,
        value: input.value
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

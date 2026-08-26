import { classifyFile } from "../project-files/code-area-classification.ts";
import type { FunctionMetric } from "./measurement-model.ts";
import {
  isStableFunctionName,
  type FunctionMetricAnalysis,
  type FunctionMetricInstance
} from "./analysis.ts";
import type { FunctionMetricsSemantics } from "./execution.ts";

type FunctionMetricName = "cyclomatic-complexity" | "function-code-density" | "parameter-count";

export interface FunctionRecordCandidate {
  readonly data: Readonly<{
    readonly codeArea: string;
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
  readonly codeArea: string;
  readonly functionName: string;
  readonly limit: number;
  readonly metric: FunctionMetricName;
  readonly path: string;
  readonly startLine: number;
  readonly subject: string;
  readonly value: number;
}

/** Builds only the supplemental facts that exceed this Check's own thresholds. */
export function buildFunctionRecordCandidates(
  analysis: FunctionMetricAnalysis,
  semantics: FunctionMetricsSemantics
): readonly FunctionRecordCandidate[] {
  const candidates: FunctionRecordCandidate[] = [];
  for (const instance of analysis.instances) {
    const context = candidateContext(instance, semantics);
    if (context === null) continue;
    for (const input of metricCandidateInputs(instance, context, semantics)) {
      appendCandidate(candidates, input);
    }
  }
  candidates.sort((left, right) => compareText(left.id, right.id));
  return Object.freeze(candidates);
}

function candidateContext(
  instance: FunctionMetricInstance,
  semantics: FunctionMetricsSemantics
): Readonly<{ readonly codeArea: string; readonly functionName: string }> | null {
  const codeArea = classifyFile(
    instance.metric.file,
    semantics.codeAreas,
    semantics.generatedFiles
  );
  const area = semantics.codeAreas[codeArea];
  if (area === undefined || area.warningPolicy === "exclude-warnings") return null;
  return Object.freeze({
    codeArea,
    functionName: isStableFunctionName(instance.metric.name) ? instance.metric.name : "<anonymous>"
  });
}

function metricCandidateInputs(
  instance: FunctionMetricInstance,
  context: NonNullable<ReturnType<typeof candidateContext>>,
  semantics: FunctionMetricsSemantics
): CandidateInput[] {
  const inputs: CandidateInput[] = [];
  const complexityInput = complexityCandidateInput(instance, context, semantics);
  if (complexityInput !== null) inputs.push(complexityInput);
  inputs.push(
    codeLinesCandidateInput(instance, context, semantics),
    parameterCandidateInput(instance, context, semantics)
  );
  return inputs;
}

function sharedCandidateInput(
  instance: FunctionMetricInstance,
  context: NonNullable<ReturnType<typeof candidateContext>>
) {
  return {
    codeArea: context.codeArea,
    functionName: context.functionName,
    path: instance.metric.file,
    startLine: instance.metric.startLine,
    subject: instance.semanticSubject
  } as const;
}

function complexityCandidateInput(
  instance: FunctionMetricInstance,
  context: NonNullable<ReturnType<typeof candidateContext>>,
  semantics: FunctionMetricsSemantics
): CandidateInput | null {
  const value = instance.metric.cyclomaticComplexity.value;
  if (value === null) return null;
  return {
    ...sharedCandidateInput(instance, context),
    limit: semantics.functions.cyclomaticComplexity.absoluteFloor,
    metric: "cyclomatic-complexity",
    value
  };
}

function codeLinesCandidateInput(
  instance: FunctionMetricInstance,
  context: NonNullable<ReturnType<typeof candidateContext>>,
  semantics: FunctionMetricsSemantics
): CandidateInput {
  return {
    ...sharedCandidateInput(instance, context),
    limit: functionCodeLineFloor(instance.metric, semantics),
    metric: "function-code-density",
    value: instance.metric.lines
  };
}

function parameterCandidateInput(
  instance: FunctionMetricInstance,
  context: NonNullable<ReturnType<typeof candidateContext>>,
  semantics: FunctionMetricsSemantics
): CandidateInput {
  return {
    ...sharedCandidateInput(instance, context),
    limit: semantics.functions.parameterCount.absoluteFloor,
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
        codeArea: input.codeArea,
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

function functionCodeLineFloor(
  metric: FunctionMetric,
  semantics: FunctionMetricsSemantics
): number {
  const allowance = semantics.functions.codeLines.lowComplexityAllowance;
  const complexity = metric.cyclomaticComplexity.value;
  return complexity !== null && complexity < allowance.maxCyclomaticComplexityExclusive
    ? allowance.codeLineFloor
    : semantics.functions.codeLines.absoluteFloor;
}

function compareText(left: string, right: string): number {
  if (left < right) return -1;
  if (left > right) return 1;
  return 0;
}

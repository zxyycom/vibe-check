import { classifyFile } from "../../model/code-areas.ts";
import type { CodeAreaDefinition, FunctionMetric } from "../../model/schema.ts";
import type { QualityRecordCandidate, RecordLevel } from "../model.ts";
import { compareText, isInChangedScope } from "./builtin-support.ts";
import {
  isStableFunctionName,
  type FunctionMetricAnalysis,
  type FunctionMetricInstance
} from "./function-metrics-analysis.ts";
import type { FunctionMetricsSemantics } from "./function-metrics.ts";

type FunctionRecordTypeId =
  | "function-code-lines"
  | "function-cyclomatic-complexity"
  | "function-parameter-count";

export interface FunctionRecordCandidate {
  readonly comparisonKey: string;
  readonly hasStableName: boolean;
  readonly isChanged: boolean;
  readonly record: QualityRecordCandidate;
  readonly value: number;
}

interface CandidateInput {
  readonly codeArea: string;
  readonly comparisonKey: string;
  readonly hasStableName: boolean;
  readonly isChanged: boolean;
  readonly level: RecordLevel;
  readonly limit: number;
  readonly message: string;
  readonly metric: string;
  readonly path: string;
  readonly recordTypeId: FunctionRecordTypeId;
  readonly startLine: number;
  readonly subject: string;
  readonly suggestion: string;
  readonly value: number;
}

export function buildFunctionRecordCandidates(
  analysis: FunctionMetricAnalysis,
  changedFiles: readonly string[],
  semantics: FunctionMetricsSemantics
): readonly FunctionRecordCandidate[] {
  const candidates: FunctionRecordCandidate[] = [];
  for (const instance of analysis.instances) {
    const context = candidateContext(instance, changedFiles, semantics);
    if (context === null) {
      continue;
    }
    for (const input of metricCandidateInputs(instance, context, semantics)) {
      appendCandidate(candidates, input);
    }
  }
  candidates.sort((left, right) => compareText(recordKey(left.record), recordKey(right.record)));
  return Object.freeze(candidates);
}

function candidateContext(
  instance: FunctionMetricInstance,
  changedFiles: readonly string[],
  semantics: FunctionMetricsSemantics
): Readonly<{
  codeArea: string;
  hasStableName: boolean;
  isChanged: boolean;
  level: RecordLevel;
}> | null {
  const codeArea = classifyFile(
    instance.metric.file,
    semantics.codeAreas as Record<string, CodeAreaDefinition>,
    semantics.generatedFiles
  );
  const area = semantics.codeAreas[codeArea];
  if (area === undefined || area.warningPolicy === "exclude-warnings") {
    return null;
  }
  return {
    codeArea,
    hasStableName: isStableFunctionName(instance.metric.name),
    isChanged: isInChangedScope(instance.metric.file, changedFiles),
    level: area.warningPolicy === "watchlist-only" ? "info" : "warning"
  };
}

function metricCandidateInputs(
  instance: FunctionMetricInstance,
  context: NonNullable<ReturnType<typeof candidateContext>>,
  semantics: FunctionMetricsSemantics
): CandidateInput[] {
  const inputs: CandidateInput[] = [];
  const complexityInput = complexityCandidateInput(instance, context, semantics);
  if (complexityInput !== null) {
    inputs.push(complexityInput);
  }
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
    comparisonKey: instance.comparisonKey,
    hasStableName: context.hasStableName,
    isChanged: context.isChanged,
    level: context.level,
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
  if (value === null) {
    return null;
  }
  const limit = semantics.functions.cyclomaticComplexity.absoluteFloor;
  return {
    ...sharedCandidateInput(instance, context),
    limit,
    message: `Function "${instance.metric.name}" in ${instance.metric.file}:${instance.metric.startLine} has cyclomatic complexity ${value} (threshold: ${limit} CC)`,
    metric: "cyclomatic-complexity",
    recordTypeId: "function-cyclomatic-complexity",
    suggestion: "Consider breaking this function into smaller, more focused functions",
    value
  };
}

function codeLinesCandidateInput(
  instance: FunctionMetricInstance,
  context: NonNullable<ReturnType<typeof candidateContext>>,
  semantics: FunctionMetricsSemantics
): CandidateInput {
  const { metric } = instance;
  const limit = functionCodeLineFloor(metric, semantics);
  const threshold = functionCodeLineThresholdLabel(metric, semantics);
  return {
    ...sharedCandidateInput(instance, context),
    limit,
    message: `Function "${metric.name}" in ${metric.file}:${metric.startLine} has ${metric.lines} code lines at cyclomatic complexity ${metric.cyclomaticComplexity.value ?? "n/a"} (Lizard NLOC; threshold: ${threshold})`,
    metric: "function-code-density",
    recordTypeId: "function-code-lines",
    suggestion: "Consider reducing branching or splitting the function when line count and complexity make it hard to review",
    value: metric.lines
  };
}

function parameterCandidateInput(
  instance: FunctionMetricInstance,
  context: NonNullable<ReturnType<typeof candidateContext>>,
  semantics: FunctionMetricsSemantics
): CandidateInput {
  const { metric } = instance;
  const limit = semantics.functions.parameterCount.absoluteFloor;
  return {
    ...sharedCandidateInput(instance, context),
    limit,
    message: `Function "${metric.name}" in ${metric.file}:${metric.startLine} has ${metric.parameterCount} parameters (threshold: ${limit} parameters)`,
    metric: "parameter-count",
    recordTypeId: "function-parameter-count",
    suggestion: "Consider using a parameter object or splitting the function",
    value: metric.parameterCount
  };
}

function appendCandidate(
  candidates: FunctionRecordCandidate[],
  input: CandidateInput
): void {
  if (input.value <= input.limit) {
    return;
  }
  candidates.push(Object.freeze({
    comparisonKey: input.comparisonKey,
    hasStableName: input.hasStableName,
    isChanged: input.isChanged,
    value: input.value,
    record: Object.freeze({
      recordTypeId: input.recordTypeId,
      level: input.level,
      semanticSubject: input.subject,
      message: input.message,
      fields: Object.freeze({
        codeArea: input.codeArea,
        limit: input.limit,
        metric: input.metric,
        suggestion: input.suggestion,
        value: input.value
      }),
      location: Object.freeze({ path: input.path, line: input.startLine, column: 1 })
    })
  }));
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

function functionCodeLineThresholdLabel(
  metric: FunctionMetric,
  semantics: FunctionMetricsSemantics
): string {
  const allowance = semantics.functions.codeLines.lowComplexityAllowance;
  const floor = functionCodeLineFloor(metric, semantics);
  const complexity = metric.cyclomaticComplexity.value;
  return complexity !== null && complexity < allowance.maxCyclomaticComplexityExclusive
    ? `${floor} code lines for CC < ${allowance.maxCyclomaticComplexityExclusive}`
    : `${floor} code lines`;
}

export function recordKey(
  record: Pick<QualityRecordCandidate, "recordTypeId" | "semanticSubject">
): string {
  return `${record.semanticSubject}\u0000${record.recordTypeId}`;
}

import type { FunctionMetric } from "../../model/schema.ts";
import { metricAreaWarningPolicy } from "./area-policy.ts";
import { functionBaselineComparison } from "./baseline-context.ts";
import { buildMetricWarning, deltaFrom } from "./metric-warning.ts";
import type {
  AreaWarningPolicy,
  FunctionBaselineComparison,
  WarningCandidate,
  WarningContext
} from "./warning-model.ts";

type FunctionWarningInput = {
  areaPolicy: AreaWarningPolicy;
  baselineComparison: FunctionBaselineComparison;
  context: WarningContext;
  func: FunctionMetric;
};

type FunctionWarningBuilder = (input: FunctionWarningInput) => WarningCandidate | null;

const FUNCTION_WARNING_BUILDERS: FunctionWarningBuilder[] = [
  buildFunctionComplexityWarning,
  buildFunctionCodeDensityWarning,
  buildFunctionParameterWarning
];

export function generateFunctionWarnings(functions: FunctionMetric[], context: WarningContext): WarningCandidate[] {
  const warnings: WarningCandidate[] = [];

  for (const func of functions) {
    const areaPolicy = metricAreaWarningPolicy(context.config, func.codeArea);
    if (!areaPolicy) continue;

    const baselineComparison = functionBaselineComparison(func, context);
    const warningInput = { areaPolicy, baselineComparison, context, func };
    for (const buildWarning of FUNCTION_WARNING_BUILDERS) {
      const warning = buildWarning(warningInput);
      if (warning) warnings.push(warning);
    }
  }

  return warnings;
}

function buildFunctionComplexityWarning(input: FunctionWarningInput): WarningCandidate | null {
  const { areaPolicy, baselineComparison, context, func } = input;
  const ccFloor = context.config.checks.functions.cyclomaticComplexity.absoluteFloor;
  const ccDelta = context.config.checks.functions.cyclomaticComplexity.changedDelta;
  const baselineCc = functionBaselineValue(
    baselineComparison,
    (baseline) => baseline.cyclomaticComplexity.value
  );
  const functionComplexity = func.cyclomaticComplexity.value;
  const ccDeltaValue = deltaFrom(functionComplexity, baselineCc);

  return buildMetricWarning({
    areaPolicy,
    baselineValue: baselineCc,
    codeArea: func.codeArea,
    deltaFloor: ccDelta,
    deltaValue: ccDeltaValue,
    floor: ccFloor,
    isChanged: func.isChanged,
    line: func.startLine,
    message: `Function "${func.name}" in ${func.file}:${func.startLine} has cyclomatic complexity ${functionComplexity} (threshold: ${ccFloor} CC)`,
    metric: "cyclomatic-complexity",
    path: func.file,
    ruleId: "lizard-cyclomatic-complexity",
    sourceTool: "lizard",
    suggestion: "Consider breaking this function into smaller, more focused functions",
    value: functionComplexity
  });
}

function buildFunctionCodeDensityWarning(input: FunctionWarningInput): WarningCandidate | null {
  const { areaPolicy, baselineComparison, context, func } = input;
  const densityConfig = context.config.checks.functions.codeLines;
  const lineFloor = functionCodeDensityFloor(func, context);
  const lineDeltaCfg = densityConfig.changedDelta;
  const baselineFunctionLines = functionBaselineValue(
    baselineComparison,
    (baseline) => baseline.lines
  );
  const functionLineDelta = deltaFrom(func.lines, baselineFunctionLines);
  const complexity = func.cyclomaticComplexity.value;

  return buildMetricWarning({
    areaPolicy,
    baselineValue: baselineFunctionLines,
    codeArea: func.codeArea,
    deltaFloor: lineDeltaCfg,
    deltaValue: functionLineDelta,
    floor: lineFloor,
    isChanged: func.isChanged,
    line: func.startLine,
    message: `Function "${func.name}" in ${func.file}:${func.startLine} has ${func.lines} code lines at cyclomatic complexity ${complexity ?? "n/a"} (Lizard NLOC; threshold: ${functionCodeDensityThresholdLabel(func, context)})`,
    metric: "function-code-density",
    path: func.file,
    ruleId: "lizard-function-code-density",
    sourceTool: "lizard",
    suggestion: "Consider reducing branching or splitting the function when line count and complexity make it hard to review",
    value: func.lines
  });
}

function functionCodeDensityFloor(func: FunctionMetric, context: WarningContext): number {
  const densityConfig = context.config.checks.functions.codeLines;
  const baseFloor = densityConfig.absoluteFloor;
  const allowance = densityConfig.lowComplexityAllowance;
  const complexity = func.cyclomaticComplexity.value;

  if (
    allowance &&
    complexity !== null &&
    complexity < allowance.maxCyclomaticComplexityExclusive
  ) {
    return allowance.codeLineFloor;
  }

  return baseFloor;
}

function functionCodeDensityThresholdLabel(func: FunctionMetric, context: WarningContext): string {
  const densityConfig = context.config.checks.functions.codeLines;
  const allowance = densityConfig.lowComplexityAllowance;
  const floor = functionCodeDensityFloor(func, context);
  const complexity = func.cyclomaticComplexity.value;

  if (
    allowance &&
    complexity !== null &&
    complexity < allowance.maxCyclomaticComplexityExclusive
  ) {
    return `${floor} code lines for CC < ${allowance.maxCyclomaticComplexityExclusive}`;
  }

  return `${floor} code lines`;
}

function buildFunctionParameterWarning(input: FunctionWarningInput): WarningCandidate | null {
  const { areaPolicy, baselineComparison, context, func } = input;
  const paramFloor = context.config.checks.functions.parameterCount.absoluteFloor;
  const paramDeltaCfg = context.config.checks.functions.parameterCount.changedDelta;
  const baselineParameterCount = functionBaselineValue(
    baselineComparison,
    (baseline) => baseline.parameterCount
  );
  const paramDeltaValue = deltaFrom(func.parameterCount, baselineParameterCount);

  return buildMetricWarning({
    areaPolicy,
    baselineValue: baselineParameterCount,
    codeArea: func.codeArea,
    deltaFloor: paramDeltaCfg,
    deltaValue: paramDeltaValue,
    floor: paramFloor,
    isChanged: func.isChanged,
    line: func.startLine,
    message: `Function "${func.name}" in ${func.file}:${func.startLine} has ${func.parameterCount} parameters (threshold: ${paramFloor} parameters)`,
    metric: "parameter-count",
    path: func.file,
    ruleId: "lizard-parameter-count",
    sourceTool: "lizard",
    suggestion: "Consider using a parameter object or splitting the function",
    value: func.parameterCount
  });
}

function functionBaselineValue(
  comparison: FunctionBaselineComparison,
  selectValue: (baseline: FunctionMetric) => number | null
): number | null {
  if (comparison.kind === "matched") {
    return selectValue(comparison.baseline);
  }
  return comparison.kind === "new" ? 0 : null;
}

import { snapshotClosedPolicyRecord } from "../../data-boundary/closed-values.ts";
import { isPositiveSafeInteger } from "../../data-boundary/value-shapes.ts";
import {
  defaultProjectFileSelection,
  resolveProjectFileSelection,
  snapshotProjectFileSelection
} from "../project-files/configuration.ts";
import {
  DEFAULT_FINDING_POLICY,
  resolveCodeAreaPolicyMap,
  resolveFindingPolicy,
  type FindingPolicy
} from "../code-quality-findings/policy.ts";
import { resolveFindingWaiverAuthoring } from "../code-quality-findings/finding-waiver-authoring.ts";
import { resolveFunctionMetricsFindingIdentity } from "./finding-waiver-identity.ts";
import {
  type ResolvedFunctionMetricsCodeAreaOptions,
  type ResolvedFunctionMetricsLimits,
  type ResolvedFunctionMetricsOptions
} from "./options.ts";
import { validResolvedFunctionMetricsOptions } from "./options-validation.ts";
import { FUNCTION_METRICS_SUPPORTED_FILE_GLOBS } from "./target-files.ts";

const DEFAULT_CODE_LINE_MAXIMUM = 60;
const DEFAULT_LOW_COMPLEXITY_CODE_LINE_MAXIMUM = 180;
const DEFAULT_LOW_COMPLEXITY_BELOW = 6;
const DEFAULT_CYCLOMATIC_COMPLEXITY_MAXIMUM = 12;
const DEFAULT_PARAMETER_MAXIMUM = 6;
const DEFAULT_FILES = Object.freeze({
  exclude: defaultProjectFileSelection.exclude,
  include: FUNCTION_METRICS_SUPPORTED_FILE_GLOBS,
  source: defaultProjectFileSelection.source
});

/** 校验 constructor input，并物化完整、冻结的 function-metrics options。 */
export function resolveFunctionMetricsOptions(
  value: unknown
): ResolvedFunctionMetricsOptions | undefined {
  const input = snapshotClosedPolicyRecord(value, {
    optional: ["codeAreas", "findingPolicy", "findingWaivers"]
  });
  if (input === undefined) return undefined;

  const findingPolicy = resolveFindingPolicy(input.findingPolicy, DEFAULT_FINDING_POLICY);
  if (findingPolicy === undefined) return undefined;
  const codeAreas = resolveCodeAreas(input.codeAreas, findingPolicy);
  const findingWaivers = resolveFindingWaiverAuthoring(
    input.findingWaivers,
    resolveFunctionMetricsFindingIdentity
  );
  if (codeAreas === undefined || findingWaivers === undefined) return undefined;

  const options = Object.freeze({ codeAreas, findingWaivers });
  return validResolvedFunctionMetricsOptions(options) ? options : undefined;
}

function resolveCodeAreas(
  value: unknown,
  defaultFindingPolicy: FindingPolicy
): ResolvedFunctionMetricsOptions["codeAreas"] | undefined {
  return resolveCodeAreaPolicyMap(
    value,
    () => defaultCodeArea(defaultFindingPolicy),
    (candidate) => resolveCodeArea(candidate, defaultFindingPolicy)
  );
}

function defaultCodeArea(findingPolicy: FindingPolicy): ResolvedFunctionMetricsCodeAreaOptions {
  return Object.freeze({
    files: snapshotProjectFileSelection(DEFAULT_FILES),
    findingPolicy,
    limits: defaultLimits()
  });
}

function resolveCodeArea(
  value: unknown,
  defaultFindingPolicy: FindingPolicy
): ResolvedFunctionMetricsCodeAreaOptions | undefined {
  const area = snapshotClosedPolicyRecord(value, {
    optional: ["findingPolicy", "limits"],
    required: ["files"]
  });
  if (area === undefined) return undefined;
  const files = resolveProjectFileSelection(area.files, DEFAULT_FILES);
  const findingPolicy = resolveFindingPolicy(area.findingPolicy, defaultFindingPolicy);
  const limits = resolveLimits(area.limits);
  return files === undefined || findingPolicy === undefined || limits === undefined
    ? undefined
    : Object.freeze({ files, findingPolicy, limits });
}

function resolveLimits(value: unknown): ResolvedFunctionMetricsLimits | undefined {
  if (value === undefined) return defaultLimits();
  const limits = snapshotClosedPolicyRecord(value, {
    optional: ["codeLines", "cyclomaticComplexity", "parameters"]
  });
  if (limits === undefined) return undefined;
  const codeLines = resolveCodeLineLimits(limits.codeLines);
  const cyclomaticComplexity = resolveMaximum(
    limits.cyclomaticComplexity,
    DEFAULT_CYCLOMATIC_COMPLEXITY_MAXIMUM
  );
  const parameters = resolveMaximum(limits.parameters, DEFAULT_PARAMETER_MAXIMUM);
  if (codeLines === undefined || cyclomaticComplexity === undefined || parameters === undefined) {
    return undefined;
  }
  return Object.freeze({ codeLines, cyclomaticComplexity, parameters });
}

function resolveCodeLineLimits(
  value: unknown
): ResolvedFunctionMetricsLimits["codeLines"] | undefined {
  if (value === undefined) return defaultLimits().codeLines;
  const codeLines = snapshotClosedPolicyRecord(value, {
    optional: ["lowComplexityAllowance", "maximum"]
  });
  if (codeLines === undefined) return undefined;
  const maximum = codeLines.maximum ?? DEFAULT_CODE_LINE_MAXIMUM;
  const allowance = resolveLowComplexityAllowance(codeLines.lowComplexityAllowance);
  if (!isPositiveSafeInteger(maximum) || allowance === undefined || allowance.maximum < maximum) {
    return undefined;
  }
  return Object.freeze({ lowComplexityAllowance: allowance, maximum });
}

function resolveLowComplexityAllowance(
  value: unknown
): ResolvedFunctionMetricsLimits["codeLines"]["lowComplexityAllowance"] | undefined {
  if (value === undefined) {
    return Object.freeze({
      cyclomaticComplexityBelow: DEFAULT_LOW_COMPLEXITY_BELOW,
      maximum: DEFAULT_LOW_COMPLEXITY_CODE_LINE_MAXIMUM
    });
  }
  const allowance = snapshotClosedPolicyRecord(value, {
    optional: ["cyclomaticComplexityBelow", "maximum"]
  });
  if (allowance === undefined) return undefined;
  const cyclomaticComplexityBelow =
    allowance.cyclomaticComplexityBelow ?? DEFAULT_LOW_COMPLEXITY_BELOW;
  const maximum = allowance.maximum ?? DEFAULT_LOW_COMPLEXITY_CODE_LINE_MAXIMUM;
  return isPositiveSafeInteger(cyclomaticComplexityBelow) && isPositiveSafeInteger(maximum)
    ? Object.freeze({ cyclomaticComplexityBelow, maximum })
    : undefined;
}

function resolveMaximum(
  value: unknown,
  fallback: number
): Readonly<{ readonly maximum: number }> | undefined {
  if (value === undefined) return Object.freeze({ maximum: fallback });
  const input = snapshotClosedPolicyRecord(value, { optional: ["maximum"] });
  if (input === undefined) return undefined;
  const maximum = input.maximum ?? fallback;
  return isPositiveSafeInteger(maximum) ? Object.freeze({ maximum }) : undefined;
}

function defaultLimits(): ResolvedFunctionMetricsLimits {
  return Object.freeze({
    codeLines: Object.freeze({
      lowComplexityAllowance: Object.freeze({
        cyclomaticComplexityBelow: DEFAULT_LOW_COMPLEXITY_BELOW,
        maximum: DEFAULT_LOW_COMPLEXITY_CODE_LINE_MAXIMUM
      }),
      maximum: DEFAULT_CODE_LINE_MAXIMUM
    }),
    cyclomaticComplexity: Object.freeze({ maximum: DEFAULT_CYCLOMATIC_COMPLEXITY_MAXIMUM }),
    parameters: Object.freeze({ maximum: DEFAULT_PARAMETER_MAXIMUM })
  });
}

import {
  hasRequiredAndOptionalRecordKeys,
  snapshotClosedRecord
} from "../../data-boundary/closed-values.ts";
import {
  resolveProjectFileSelection,
  snapshotDefaultProjectFileSelection
} from "../project-files/configuration.ts";
import {
  DEFAULT_FINDING_POLICY,
  resolveFindingPolicy,
  type FindingPolicy
} from "../code-quality-findings/policy.ts";
import {
  type ResolvedFunctionMetricsCodeAreaOptions,
  type ResolvedFunctionMetricsLimits,
  type ResolvedFunctionMetricsOptions
} from "./options.ts";
import { validResolvedFunctionMetricsOptions } from "./options-validation.ts";

const DEFAULT_LIZARD_EXECUTABLE = "lizard";
const DEFAULT_CODE_LINE_MAXIMUM = 60;
const DEFAULT_LOW_COMPLEXITY_CODE_LINE_MAXIMUM = 180;
const DEFAULT_LOW_COMPLEXITY_BELOW = 6;
const DEFAULT_CYCLOMATIC_COMPLEXITY_MAXIMUM = 12;
const DEFAULT_PARAMETER_MAXIMUM = 6;

interface PolicyRecordKeys {
  readonly optional?: readonly string[];
  readonly required?: readonly string[];
}

/** 校验 constructor input，并物化完整、冻结的 function-metrics options。 */
export function resolveFunctionMetricsOptions(
  value: unknown
): ResolvedFunctionMetricsOptions | undefined {
  const input = snapshotPolicyRecord(value, {
    optional: ["codeAreas", "findingPolicy", "scanner"]
  });
  if (input === undefined) return undefined;

  const findingPolicy = resolveFindingPolicy(input.findingPolicy, DEFAULT_FINDING_POLICY);
  if (findingPolicy === undefined) return undefined;
  const codeAreas = resolveCodeAreas(input.codeAreas, findingPolicy);
  const scanner = resolveScanner(input.scanner);
  if (codeAreas === undefined || scanner === undefined) return undefined;

  const options = Object.freeze({ codeAreas, scanner });
  return validResolvedFunctionMetricsOptions(options) ? options : undefined;
}

function resolveCodeAreas(
  value: unknown,
  defaultFindingPolicy: FindingPolicy
): ResolvedFunctionMetricsOptions["codeAreas"] | undefined {
  if (value === undefined) {
    return Object.freeze({ project: defaultCodeArea(defaultFindingPolicy) });
  }
  const areas = snapshotClosedRecord(value);
  if (areas === undefined || Object.keys(areas).length === 0) return undefined;

  const resolvedEntries: Array<readonly [string, ResolvedFunctionMetricsCodeAreaOptions]> = [];
  for (const [areaId, candidate] of Object.entries(areas)) {
    if (!nonEmptyString(areaId)) return undefined;
    const area = resolveCodeArea(candidate, defaultFindingPolicy);
    if (area === undefined) return undefined;
    resolvedEntries.push([areaId, area]);
  }
  return Object.freeze(Object.fromEntries(resolvedEntries));
}

function defaultCodeArea(findingPolicy: FindingPolicy): ResolvedFunctionMetricsCodeAreaOptions {
  return Object.freeze({
    files: snapshotDefaultProjectFileSelection(),
    findingPolicy,
    limits: defaultLimits()
  });
}

function resolveCodeArea(
  value: unknown,
  defaultFindingPolicy: FindingPolicy
): ResolvedFunctionMetricsCodeAreaOptions | undefined {
  const area = snapshotPolicyRecord(value, {
    optional: ["findingPolicy", "limits"],
    required: ["files"]
  });
  if (area === undefined) return undefined;
  const files = resolveProjectFileSelection(area.files);
  const findingPolicy = resolveFindingPolicy(area.findingPolicy, defaultFindingPolicy);
  const limits = resolveLimits(area.limits);
  return files === undefined || findingPolicy === undefined || limits === undefined
    ? undefined
    : Object.freeze({ files, findingPolicy, limits });
}

function resolveLimits(value: unknown): ResolvedFunctionMetricsLimits | undefined {
  if (value === undefined) return defaultLimits();
  const limits = snapshotPolicyRecord(value, {
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
  const codeLines = snapshotPolicyRecord(value, {
    optional: ["lowComplexityAllowance", "maximum"]
  });
  if (codeLines === undefined) return undefined;
  const maximum = codeLines.maximum ?? DEFAULT_CODE_LINE_MAXIMUM;
  const allowance = resolveLowComplexityAllowance(codeLines.lowComplexityAllowance);
  if (!positiveSafeInteger(maximum) || allowance === undefined || allowance.maximum < maximum) {
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
  const allowance = snapshotPolicyRecord(value, {
    optional: ["cyclomaticComplexityBelow", "maximum"]
  });
  if (allowance === undefined) return undefined;
  const cyclomaticComplexityBelow =
    allowance.cyclomaticComplexityBelow ?? DEFAULT_LOW_COMPLEXITY_BELOW;
  const maximum = allowance.maximum ?? DEFAULT_LOW_COMPLEXITY_CODE_LINE_MAXIMUM;
  return positiveSafeInteger(cyclomaticComplexityBelow) && positiveSafeInteger(maximum)
    ? Object.freeze({ cyclomaticComplexityBelow, maximum })
    : undefined;
}

function resolveMaximum(
  value: unknown,
  fallback: number
): Readonly<{ readonly maximum: number }> | undefined {
  if (value === undefined) return Object.freeze({ maximum: fallback });
  const input = snapshotPolicyRecord(value, { optional: ["maximum"] });
  if (input === undefined) return undefined;
  const maximum = input.maximum ?? fallback;
  return positiveSafeInteger(maximum) ? Object.freeze({ maximum }) : undefined;
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

function resolveScanner(value: unknown): ResolvedFunctionMetricsOptions["scanner"] | undefined {
  if (value === undefined) return Object.freeze({ executable: DEFAULT_LIZARD_EXECUTABLE });
  const scanner = snapshotPolicyRecord(value, { optional: ["executable"] });
  if (scanner === undefined) return undefined;
  const executable = scanner.executable ?? DEFAULT_LIZARD_EXECUTABLE;
  return nonEmptyString(executable) ? Object.freeze({ executable }) : undefined;
}

function snapshotPolicyRecord(
  value: unknown,
  keys: PolicyRecordKeys
): Readonly<Record<string, unknown>> | undefined {
  const record = snapshotClosedRecord(value);
  if (
    record === undefined ||
    !hasRequiredAndOptionalRecordKeys(record, {
      optional: keys.optional ?? [],
      required: keys.required ?? []
    })
  ) {
    return undefined;
  }
  return record;
}

function positiveSafeInteger(value: unknown): value is number {
  return typeof value === "number" && Number.isSafeInteger(value) && value > 0;
}

function nonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.length > 0;
}

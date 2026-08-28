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
import type { ResolvedFileMetricsCodeAreaOptions, ResolvedFileMetricsOptions } from "./options.ts";
import { isValidResolvedFileMetricsOptions } from "./options-validation.ts";

const DEFAULT_EXECUTABLE = "scc";
const DEFAULT_MAXIMUM_CODE_LINES = 300;
const DEFAULT_ALLOWANCE_MAXIMUM_CODE_LINES = 500;
const DEFAULT_ALLOWANCE_MAXIMUM_DECISION_TOKENS = 10;

interface PolicyRecordKeys {
  readonly optional?: readonly string[];
  readonly required?: readonly string[];
}

/** 校验 constructor input，并将所有可省略 policy 物化为完整、冻结的 Check options。 */
export function resolveFileMetricsOptions(
  authoredOptions: unknown
): ResolvedFileMetricsOptions | undefined {
  const input = snapshotPolicyRecord(authoredOptions, {
    optional: ["codeAreas", "findingPolicy", "scanner"]
  });
  if (input === undefined) return undefined;

  const findingPolicy = resolveFindingPolicy(input.findingPolicy, DEFAULT_FINDING_POLICY);
  if (findingPolicy === undefined) return undefined;
  const codeAreas = resolveCodeAreas(input.codeAreas, findingPolicy);
  const scanner = resolveScanner(input.scanner);
  if (codeAreas === undefined || scanner === undefined) return undefined;

  const options = Object.freeze({ codeAreas, scanner });
  return isValidResolvedFileMetricsOptions(options) ? options : undefined;
}

function resolveCodeAreas(
  value: unknown,
  defaultFindingPolicy: FindingPolicy
): ResolvedFileMetricsOptions["codeAreas"] | undefined {
  if (value === undefined) return Object.freeze({ project: defaultCodeArea(defaultFindingPolicy) });
  const areas = snapshotClosedRecord(value);
  if (areas === undefined || Object.keys(areas).length === 0) return undefined;

  const resolvedEntries: Array<readonly [string, ResolvedFileMetricsCodeAreaOptions]> = [];
  for (const [areaId, candidate] of Object.entries(areas)) {
    if (!isNonEmptyString(areaId)) return undefined;
    const area = resolveCodeArea(candidate, defaultFindingPolicy);
    if (area === undefined) return undefined;
    resolvedEntries.push([areaId, area]);
  }
  return Object.freeze(Object.fromEntries(resolvedEntries));
}

function defaultCodeArea(findingPolicy: FindingPolicy): ResolvedFileMetricsCodeAreaOptions {
  return Object.freeze({
    codeLines: defaultCodeLines(),
    files: snapshotDefaultProjectFileSelection(),
    findingPolicy
  });
}

function resolveCodeArea(
  value: unknown,
  defaultFindingPolicy: FindingPolicy
): ResolvedFileMetricsCodeAreaOptions | undefined {
  const area = snapshotPolicyRecord(value, {
    optional: ["codeLines", "findingPolicy"],
    required: ["files"]
  });
  if (area === undefined) return undefined;
  const files = resolveProjectFileSelection(area.files);
  const findingPolicy = resolveFindingPolicy(area.findingPolicy, defaultFindingPolicy);
  const codeLines = resolveCodeLines(area.codeLines);
  return files === undefined || findingPolicy === undefined || codeLines === undefined
    ? undefined
    : Object.freeze({ codeLines, files, findingPolicy });
}

function resolveCodeLines(
  value: unknown
): ResolvedFileMetricsCodeAreaOptions["codeLines"] | undefined {
  if (value === undefined) return defaultCodeLines();
  const codeLines = snapshotPolicyRecord(value, {
    optional: ["lowDecisionTokenAllowance", "maximum"]
  });
  if (codeLines === undefined) return undefined;
  const maximum = codeLines.maximum ?? DEFAULT_MAXIMUM_CODE_LINES;
  const lowDecisionTokenAllowance = resolveAllowance(codeLines.lowDecisionTokenAllowance);
  if (
    !isPositiveSafeInteger(maximum) ||
    lowDecisionTokenAllowance === undefined ||
    lowDecisionTokenAllowance.maximumCodeLines <= maximum
  ) {
    return undefined;
  }
  return Object.freeze({ lowDecisionTokenAllowance, maximum });
}

function defaultCodeLines(): ResolvedFileMetricsCodeAreaOptions["codeLines"] {
  return Object.freeze({
    lowDecisionTokenAllowance: Object.freeze({
      maximumCodeLines: DEFAULT_ALLOWANCE_MAXIMUM_CODE_LINES,
      maximumDecisionTokens: DEFAULT_ALLOWANCE_MAXIMUM_DECISION_TOKENS
    }),
    maximum: DEFAULT_MAXIMUM_CODE_LINES
  });
}

function resolveAllowance(
  value: unknown
): ResolvedFileMetricsCodeAreaOptions["codeLines"]["lowDecisionTokenAllowance"] | undefined {
  if (value === undefined) return defaultCodeLines().lowDecisionTokenAllowance;
  const allowance = snapshotPolicyRecord(value, {
    optional: ["maximumCodeLines", "maximumDecisionTokens"]
  });
  if (allowance === undefined) return undefined;
  const maximumCodeLines = allowance.maximumCodeLines ?? DEFAULT_ALLOWANCE_MAXIMUM_CODE_LINES;
  const maximumDecisionTokens =
    allowance.maximumDecisionTokens ?? DEFAULT_ALLOWANCE_MAXIMUM_DECISION_TOKENS;
  if (
    !isPositiveSafeInteger(maximumCodeLines) ||
    !isNonNegativeSafeInteger(maximumDecisionTokens)
  ) {
    return undefined;
  }
  return Object.freeze({ maximumCodeLines, maximumDecisionTokens });
}

function resolveScanner(value: unknown): ResolvedFileMetricsOptions["scanner"] | undefined {
  if (value === undefined) return Object.freeze({ executable: DEFAULT_EXECUTABLE });
  const scanner = snapshotPolicyRecord(value, { optional: ["executable"] });
  if (scanner === undefined) return undefined;
  const executable = scanner.executable ?? DEFAULT_EXECUTABLE;
  return isNonEmptyString(executable) ? Object.freeze({ executable }) : undefined;
}

function snapshotPolicyRecord(
  value: unknown,
  keys: PolicyRecordKeys
): Readonly<Record<string, unknown>> | undefined {
  const record = snapshotClosedRecord(value);
  return record !== undefined &&
    hasRequiredAndOptionalRecordKeys(record, {
      optional: keys.optional ?? [],
      required: keys.required ?? []
    })
    ? record
    : undefined;
}

function isPositiveSafeInteger(value: unknown): value is number {
  return typeof value === "number" && Number.isSafeInteger(value) && value > 0;
}

function isNonNegativeSafeInteger(value: unknown): value is number {
  return typeof value === "number" && Number.isSafeInteger(value) && value >= 0;
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.length > 0;
}

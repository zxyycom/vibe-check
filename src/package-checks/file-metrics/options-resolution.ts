import {
  snapshotClosedArray,
  snapshotClosedPolicyRecord
} from "../../data-boundary/closed-values.ts";
import {
  isNonEmptyString,
  isNonNegativeSafeInteger,
  isPositiveSafeInteger
} from "../../data-boundary/value-shapes.ts";
import {
  resolveProjectFileSelection,
  snapshotDefaultProjectFileSelection
} from "../project-files/configuration.ts";
import {
  DEFAULT_FINDING_POLICY,
  resolveCodeAreaPolicyMap,
  resolveFindingPolicy,
  type FindingPolicy
} from "../code-quality-findings/policy.ts";
import { isNormalizedProjectRelativePath } from "../host-environment/path.ts";
import type {
  FileMetricsFindingIdentity,
  FileMetricsFindingWaiver,
  ResolvedFileMetricsCodeAreaOptions,
  ResolvedFileMetricsOptions
} from "./options.ts";
import { isValidResolvedFileMetricsOptions } from "./options-validation.ts";

const DEFAULT_EXECUTABLE = "scc";
const DEFAULT_MAXIMUM_CODE_LINES = 360;
const DEFAULT_ALLOWANCE_MAXIMUM_CODE_LINES = 600;
const DEFAULT_ALLOWANCE_MAXIMUM_DECISION_TOKENS = 12;

/** 校验 constructor input，并将所有可省略 policy 物化为完整、冻结的 Check options。 */
export function resolveFileMetricsOptions(
  authoredOptions: unknown
): ResolvedFileMetricsOptions | undefined {
  const input = snapshotClosedPolicyRecord(authoredOptions, {
    optional: ["codeAreas", "findingPolicy", "findingWaivers", "scanner"]
  });
  if (input === undefined) return undefined;

  const findingPolicy = resolveFindingPolicy(input.findingPolicy, DEFAULT_FINDING_POLICY);
  if (findingPolicy === undefined) return undefined;
  const codeAreas = resolveCodeAreas(input.codeAreas, findingPolicy);
  const findingWaivers = resolveFindingWaivers(input.findingWaivers);
  const scanner = resolveScanner(input.scanner);
  if (codeAreas === undefined || findingWaivers === undefined || scanner === undefined)
    return undefined;

  const options = Object.freeze({ codeAreas, findingWaivers, scanner });
  return isValidResolvedFileMetricsOptions(options) ? options : undefined;
}

function resolveFindingWaivers(value: unknown): readonly FileMetricsFindingWaiver[] | undefined {
  if (value === undefined) return Object.freeze([]);
  const candidates = snapshotClosedArray(value);
  if (candidates === undefined) return undefined;
  const waivers: FileMetricsFindingWaiver[] = [];
  const seenIdentities = new Set<string>();
  for (const candidate of candidates) {
    const waiver = resolveFindingWaiver(candidate);
    if (waiver === undefined) return undefined;
    const identityKey = `${waiver.identity.metric}\u0000${waiver.identity.path}`;
    if (seenIdentities.has(identityKey)) return undefined;
    seenIdentities.add(identityKey);
    waivers.push(waiver);
  }
  return Object.freeze(waivers);
}

function resolveFindingWaiver(value: unknown): FileMetricsFindingWaiver | undefined {
  const waiver = snapshotClosedPolicyRecord(value, { required: ["identity", "reason"] });
  if (waiver === undefined || !isNonEmptyString(waiver.reason)) return undefined;
  const identity = resolveFindingIdentity(waiver.identity);
  return identity === undefined ? undefined : Object.freeze({ identity, reason: waiver.reason });
}

function resolveFindingIdentity(value: unknown): FileMetricsFindingIdentity | undefined {
  const identity = snapshotClosedPolicyRecord(value, { required: ["metric", "path"] });
  return identity === undefined ||
    identity.metric !== "code-lines" ||
    !isNormalizedProjectRelativePath(identity.path)
    ? undefined
    : Object.freeze({ metric: "code-lines", path: identity.path });
}

function resolveCodeAreas(
  value: unknown,
  defaultFindingPolicy: FindingPolicy
): ResolvedFileMetricsOptions["codeAreas"] | undefined {
  return resolveCodeAreaPolicyMap(
    value,
    () => defaultCodeArea(defaultFindingPolicy),
    (candidate) => resolveCodeArea(candidate, defaultFindingPolicy)
  );
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
  const area = snapshotClosedPolicyRecord(value, {
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
  const codeLines = snapshotClosedPolicyRecord(value, {
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
  const allowance = snapshotClosedPolicyRecord(value, {
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
  const scanner = snapshotClosedPolicyRecord(value, { optional: ["executable"] });
  if (scanner === undefined) return undefined;
  const executable = scanner.executable ?? DEFAULT_EXECUTABLE;
  return isNonEmptyString(executable) ? Object.freeze({ executable }) : undefined;
}

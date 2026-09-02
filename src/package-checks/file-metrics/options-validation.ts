import {
  snapshotClosedArray,
  snapshotClosedRecord,
  snapshotExactClosedRecord
} from "../../data-boundary/closed-values.ts";
import {
  isNonEmptyString,
  isNonNegativeSafeInteger,
  isPositiveSafeInteger
} from "../../data-boundary/value-shapes.ts";
import { validProjectFileSelection } from "../project-files/configuration.ts";
import { validFindingPolicy } from "../code-quality-findings/policy.ts";
import { isNormalizedProjectRelativePath } from "../host-environment/path.ts";
import type { ResolvedFileMetricsOptions } from "./options.ts";

/** 验证 constructor 产物或普通对象组合形成的完整 file-metrics options。 */
export function isValidResolvedFileMetricsOptions(
  resolvedOptions: unknown
): resolvedOptions is ResolvedFileMetricsOptions {
  const options = snapshotExactClosedRecord(resolvedOptions, [
    "codeAreas",
    "findingWaivers",
    "scanner"
  ]);
  return (
    options !== undefined &&
    isValidCodeAreas(options.codeAreas) &&
    isValidFindingWaivers(options.findingWaivers) &&
    isValidScanner(options.scanner)
  );
}

function isValidFindingWaivers(value: unknown): boolean {
  const waivers = snapshotClosedArray(value);
  if (waivers === undefined) return false;
  const identities = new Set<string>();
  for (const candidate of waivers) {
    const waiver = snapshotExactClosedRecord(candidate, ["identity", "reason"]);
    const identity =
      waiver === undefined
        ? undefined
        : snapshotExactClosedRecord(waiver.identity, ["metric", "path"]);
    if (
      waiver === undefined ||
      identity === undefined ||
      identity.metric !== "code-lines" ||
      !isNormalizedProjectRelativePath(identity.path) ||
      !isNonEmptyString(waiver.reason)
    ) {
      return false;
    }
    const identityKey = `${identity.metric}\u0000${identity.path}`;
    if (identities.has(identityKey)) return false;
    identities.add(identityKey);
  }
  return true;
}

function isValidCodeAreas(value: unknown): boolean {
  const codeAreas = snapshotClosedRecord(value);
  if (codeAreas === undefined || Object.keys(codeAreas).length === 0) return false;
  return Object.entries(codeAreas).every(
    ([areaId, candidate]) => areaId.length > 0 && isValidCodeArea(candidate)
  );
}

function isValidCodeArea(value: unknown): boolean {
  const area = snapshotExactClosedRecord(value, ["codeLines", "files", "findingPolicy"]);
  return (
    area !== undefined &&
    validProjectFileSelection(area.files) &&
    validFindingPolicy(area.findingPolicy) &&
    isValidCodeLinePolicy(area.codeLines)
  );
}

function isValidCodeLinePolicy(value: unknown): boolean {
  const policy = snapshotExactClosedRecord(value, ["lowDecisionTokenAllowance", "maximum"]);
  if (policy === undefined || !isPositiveSafeInteger(policy.maximum)) return false;
  const allowance = snapshotExactClosedRecord(policy.lowDecisionTokenAllowance, [
    "maximumCodeLines",
    "maximumDecisionTokens"
  ]);
  return (
    allowance !== undefined &&
    isPositiveSafeInteger(allowance.maximumCodeLines) &&
    allowance.maximumCodeLines > policy.maximum &&
    isNonNegativeSafeInteger(allowance.maximumDecisionTokens)
  );
}

function isValidScanner(value: unknown): boolean {
  const scanner = snapshotExactClosedRecord(value, ["executable"]);
  return scanner !== undefined && isNonEmptyString(scanner.executable);
}

import { canonicalizeJsonObject } from "../../data-boundary/canonical-data.ts";
import {
  hasExactPlainRecordKeys,
  hasRequiredAndOptionalRecordKeys,
  snapshotClosedRecord
} from "../../data-boundary/closed-values.ts";
import {
  defaultProjectFileSelection,
  resolveProjectFileSelection,
  snapshotProjectFileSelection
} from "../project-files/configuration.ts";
import { DEFAULT_FINDING_POLICY, resolveFindingPolicy } from "../code-quality-findings/policy.ts";
import type { ResolvedMarkdownLinkValidationOptions } from "./options.ts";
import { validMarkdownLinkValidationOptions } from "./options-validation.ts";

const DEFAULT_LIMITS = Object.freeze({
  maxMarkdownBytes: 1_048_576,
  maxOccurrences: 10_000,
  maxTargetReads: 1_000
});
const DEFAULT_FILES = Object.freeze({
  exclude: defaultProjectFileSelection.exclude,
  include: Object.freeze(["**/*.[mM][dD]", "**/*.[mM][aA][rR][kK][dD][oO][wW][nN]"]),
  source: defaultProjectFileSelection.source
});

/** 将可省略 Markdown link policy 物化为完整、冻结的 execution options。 */
export function resolveMarkdownLinkValidationOptions(
  value: unknown
): ResolvedMarkdownLinkValidationOptions | undefined {
  const input = snapshotClosedRecord(value);
  if (!isMarkdownLinkValidationInput(input)) return undefined;
  const limits = resolvedLimits(input.limits);
  const files = resolvedFiles(input.files);
  const findingPolicy = resolveFindingPolicy(input.findingPolicy, DEFAULT_FINDING_POLICY);
  const cache = resolvedCache(input.cache);
  if (
    limits === undefined ||
    files === undefined ||
    findingPolicy === undefined ||
    cache === undefined
  )
    return undefined;
  const candidate = optionsCandidate(input, files, findingPolicy, limits, cache);
  return candidate !== undefined && validMarkdownLinkValidationOptions(candidate)
    ? candidate
    : undefined;
}

function optionsCandidate(
  input: Readonly<Record<string, unknown>>,
  files: Exclude<ReturnType<typeof resolvedFiles>, undefined>,
  findingPolicy: Exclude<ReturnType<typeof resolveFindingPolicy>, undefined>,
  limits: Readonly<Record<string, unknown>>,
  cache: ResolvedMarkdownLinkValidationOptions["cache"]
) {
  return canonicalizeJsonObject({
    files,
    findingPolicy,
    requireExistingTargets:
      input.requireExistingTargets === undefined ? true : input.requireExistingTargets,
    validateSameDocumentAnchors:
      input.validateSameDocumentAnchors === undefined ? true : input.validateSameDocumentAnchors,
    validateCrossDocumentAnchors:
      input.validateCrossDocumentAnchors === undefined ? true : input.validateCrossDocumentAnchors,
    rootExternalTargetMode:
      input.rootExternalTargetMode === undefined ? "report" : input.rootExternalTargetMode,
    requireNonEmptyDirectories:
      input.requireNonEmptyDirectories === undefined ? false : input.requireNonEmptyDirectories,
    cache,
    limits
  });
}

function isMarkdownLinkValidationInput(
  input: Readonly<Record<string, unknown>> | undefined
): input is Readonly<Record<string, unknown>> {
  return (
    input !== undefined &&
    hasRequiredAndOptionalRecordKeys(input, {
      optional: [
        "files",
        "findingPolicy",
        "requireExistingTargets",
        "validateSameDocumentAnchors",
        "validateCrossDocumentAnchors",
        "rootExternalTargetMode",
        "requireNonEmptyDirectories",
        "cache",
        "limits"
      ],
      required: []
    })
  );
}

function resolvedCache(value: unknown): ResolvedMarkdownLinkValidationOptions["cache"] | undefined {
  if (value === undefined) return Object.freeze({ enabled: false as const });
  const cache = snapshotClosedRecord(value);
  if (cache === undefined) return undefined;
  if (hasExactPlainRecordKeys(cache, ["enabled"]) && cache.enabled === false) {
    return Object.freeze({ enabled: false as const });
  }
  if (
    hasExactPlainRecordKeys(cache, ["enabled", "directory"]) &&
    cache.enabled === true &&
    typeof cache.directory === "string"
  ) {
    return Object.freeze({ enabled: true as const, directory: cache.directory });
  }
  return undefined;
}

function resolvedFiles(value: unknown) {
  return value === undefined
    ? snapshotProjectFileSelection(DEFAULT_FILES)
    : resolveProjectFileSelection(value, DEFAULT_FILES);
}

function resolvedLimits(value: unknown): Readonly<Record<string, unknown>> | undefined {
  if (value === undefined) return DEFAULT_LIMITS;
  const limits = snapshotClosedRecord(value);
  if (
    limits === undefined ||
    !hasRequiredAndOptionalRecordKeys(limits, {
      optional: ["maxMarkdownBytes", "maxOccurrences", "maxTargetReads"],
      required: []
    })
  ) {
    return undefined;
  }
  return Object.freeze({
    maxMarkdownBytes:
      limits.maxMarkdownBytes === undefined
        ? DEFAULT_LIMITS.maxMarkdownBytes
        : limits.maxMarkdownBytes,
    maxOccurrences:
      limits.maxOccurrences === undefined ? DEFAULT_LIMITS.maxOccurrences : limits.maxOccurrences,
    maxTargetReads:
      limits.maxTargetReads === undefined ? DEFAULT_LIMITS.maxTargetReads : limits.maxTargetReads
  });
}

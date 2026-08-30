import { canonicalizeJsonObject } from "../../data-boundary/canonical-data.ts";
import {
  hasRequiredAndOptionalRecordKeys,
  snapshotClosedRecord
} from "../../data-boundary/closed-values.ts";
import {
  resolveProjectFileSelection,
  snapshotDefaultProjectFileSelection
} from "../project-files/configuration.ts";
import { DEFAULT_FINDING_POLICY, resolveFindingPolicy } from "../code-quality-findings/policy.ts";
import type { ResolvedMarkdownLinkValidationOptions } from "./options.ts";
import { validMarkdownLinkValidationOptions } from "./options-validation.ts";

const DEFAULT_LIMITS = Object.freeze({
  maxMarkdownBytes: 1_048_576,
  maxOccurrences: 10_000,
  maxTargetReads: 1_000
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
  if (limits === undefined || files === undefined || findingPolicy === undefined) return undefined;
  const candidate = optionsCandidate(input, files, findingPolicy, limits);
  return candidate !== undefined && validMarkdownLinkValidationOptions(candidate)
    ? candidate
    : undefined;
}

function optionsCandidate(
  input: Readonly<Record<string, unknown>>,
  files: Exclude<ReturnType<typeof resolvedFiles>, undefined>,
  findingPolicy: Exclude<ReturnType<typeof resolveFindingPolicy>, undefined>,
  limits: Readonly<Record<string, unknown>>
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
        "limits"
      ],
      required: []
    })
  );
}

function resolvedFiles(value: unknown) {
  return value === undefined
    ? snapshotDefaultProjectFileSelection()
    : resolveProjectFileSelection(value);
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

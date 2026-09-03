import { isAbsolute } from "node:path";

import { snapshotExactClosedRecord } from "../../data-boundary/closed-values.ts";
import { isPositiveSafeInteger } from "../../data-boundary/value-shapes.ts";
import { validProjectFileSelection } from "../project-files/configuration.ts";
import { validFindingPolicy } from "../code-quality-findings/policy.ts";
import type { ResolvedMarkdownLinkValidationOptions } from "./options.ts";

function boundedPositiveSafeInteger(value: unknown, maximum: number): value is number {
  return isPositiveSafeInteger(value) && value <= maximum;
}

export function validMarkdownLinkValidationOptions(
  value: unknown
): value is ResolvedMarkdownLinkValidationOptions {
  const options = snapshotExactClosedRecord(value, [
    "files",
    "findingPolicy",
    "requireExistingTargets",
    "validateSameDocumentAnchors",
    "validateCrossDocumentAnchors",
    "rootExternalTargetMode",
    "requireNonEmptyDirectories",
    "cache",
    "limits"
  ]);
  return options !== undefined && validOptionFields(options);
}

function validOptionFields(options: Readonly<Record<string, unknown>>): boolean {
  return (
    validProjectFileSelection(options.files) &&
    validFindingPolicy(options.findingPolicy) &&
    validAnchorValidationOptions(options) &&
    validMarkdownLinkCache(options.cache) &&
    validMarkdownLinkLimits(options.limits)
  );
}

function validMarkdownLinkCache(value: unknown): boolean {
  const disabled = snapshotExactClosedRecord(value, ["enabled"]);
  if (disabled !== undefined && disabled.enabled === false) return true;
  const enabled = snapshotExactClosedRecord(value, ["enabled", "directory"]);
  return (
    enabled !== undefined &&
    enabled.enabled === true &&
    typeof enabled.directory === "string" &&
    enabled.directory.length > 0 &&
    !enabled.directory.includes("\0") &&
    isAbsolute(enabled.directory)
  );
}

function validAnchorValidationOptions(options: Readonly<Record<string, unknown>>): boolean {
  return (
    typeof options.requireExistingTargets === "boolean" &&
    typeof options.validateSameDocumentAnchors === "boolean" &&
    typeof options.validateCrossDocumentAnchors === "boolean" &&
    validRootExternalTargetMode(options.rootExternalTargetMode) &&
    typeof options.requireNonEmptyDirectories === "boolean"
  );
}

function validRootExternalTargetMode(value: unknown): boolean {
  return value === "ignore" || value === "report" || value === "validate";
}

function validMarkdownLinkLimits(value: unknown): boolean {
  const limits = snapshotExactClosedRecord(value, [
    "maxMarkdownBytes",
    "maxOccurrences",
    "maxTargetReads"
  ]);
  return (
    limits !== undefined &&
    boundedPositiveSafeInteger(limits.maxMarkdownBytes, 16_777_216) &&
    boundedPositiveSafeInteger(limits.maxOccurrences, 100_000) &&
    boundedPositiveSafeInteger(limits.maxTargetReads, 10_000)
  );
}

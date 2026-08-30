import {
  hasExactPlainRecordKeys,
  snapshotClosedRecord
} from "../../data-boundary/closed-values.ts";
import { validProjectFileSelection } from "../project-files/configuration.ts";
import { validFindingPolicy } from "../code-quality-findings/policy.ts";
import type { ResolvedMarkdownLinkValidationOptions } from "./options.ts";

function exactRecord(
  value: unknown,
  keys: readonly string[]
): Readonly<Record<string, unknown>> | undefined {
  const record = snapshotClosedRecord(value);
  return record !== undefined && hasExactPlainRecordKeys(record, keys) ? record : undefined;
}

function positiveSafeInteger(value: unknown): value is number {
  return typeof value === "number" && Number.isSafeInteger(value) && value > 0;
}

function boundedPositiveSafeInteger(value: unknown, maximum: number): value is number {
  return positiveSafeInteger(value) && value <= maximum;
}

export function validMarkdownLinkValidationOptions(
  value: unknown
): value is ResolvedMarkdownLinkValidationOptions {
  const options = exactRecord(value, [
    "files",
    "findingPolicy",
    "requireExistingTargets",
    "validateSameDocumentAnchors",
    "validateCrossDocumentAnchors",
    "rootExternalTargetMode",
    "requireNonEmptyDirectories",
    "limits"
  ]);
  return options !== undefined && validOptionFields(options);
}

function validOptionFields(options: Readonly<Record<string, unknown>>): boolean {
  return (
    validProjectFileSelection(options.files) &&
    validFindingPolicy(options.findingPolicy) &&
    validAnchorValidationOptions(options) &&
    validMarkdownLinkLimits(options.limits)
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
  const limits = exactRecord(value, ["maxMarkdownBytes", "maxOccurrences", "maxTargetReads"]);
  return (
    limits !== undefined &&
    boundedPositiveSafeInteger(limits.maxMarkdownBytes, 16_777_216) &&
    boundedPositiveSafeInteger(limits.maxOccurrences, 100_000) &&
    boundedPositiveSafeInteger(limits.maxTargetReads, 10_000)
  );
}

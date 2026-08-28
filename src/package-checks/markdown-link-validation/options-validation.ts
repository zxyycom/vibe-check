import {
  hasExactPlainRecordKeys,
  snapshotClosedRecord
} from "../../data-boundary/closed-values.ts";
import { validProjectFileSelection } from "../project-files/configuration.ts";
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
    "requireExistingTargets",
    "validateSameDocumentAnchors",
    "validateCrossDocumentAnchors",
    "rootExternalTargetMode",
    "requireNonEmptyDirectories",
    "limits"
  ]);
  return (
    options !== undefined &&
    validProjectFileSelection(options.files) &&
    typeof options.requireExistingTargets === "boolean" &&
    typeof options.validateSameDocumentAnchors === "boolean" &&
    typeof options.validateCrossDocumentAnchors === "boolean" &&
    (options.rootExternalTargetMode === "ignore" ||
      options.rootExternalTargetMode === "report" ||
      options.rootExternalTargetMode === "validate") &&
    typeof options.requireNonEmptyDirectories === "boolean" &&
    validMarkdownLinkLimits(options.limits)
  );
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

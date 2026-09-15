import { snapshotExactClosedRecord } from "../../data-boundary/closed-values.ts";
import { isPositiveSafeInteger } from "../../data-boundary/value-shapes.ts";
import { validFindingPolicy } from "../code-quality-findings/policy.ts";
import { validProjectFileSelection } from "../project-files/configuration.ts";
import { MARKDOWN_LINT_RULE_NAMES, type ResolvedMarkdownLintOptions } from "./options.ts";

const KNOWN_RULES = new Set<string>(MARKDOWN_LINT_RULE_NAMES);

export function validMarkdownLintOptions(value: unknown): value is ResolvedMarkdownLintOptions {
  const options = snapshotExactClosedRecord(value, ["files", "findingPolicy", "rules", "limits"]);
  if (
    options === undefined ||
    !validProjectFileSelection(options.files) ||
    !validFindingPolicy(options.findingPolicy) ||
    !validRules(options.rules)
  ) {
    return false;
  }
  const limits = snapshotExactClosedRecord(options.limits, ["maxMarkdownBytes", "maxFindings"]);
  return (
    limits !== undefined &&
    isBoundedPositiveInteger(limits.maxMarkdownBytes, 16_777_216) &&
    isBoundedPositiveInteger(limits.maxFindings, 100_000)
  );
}

function validRules(value: unknown): value is readonly string[] {
  return (
    Array.isArray(value) &&
    value.length > 0 &&
    value.every((rule) => typeof rule === "string" && KNOWN_RULES.has(rule)) &&
    new Set(value).size === value.length
  );
}

function isBoundedPositiveInteger(value: unknown, maximum: number): value is number {
  return isPositiveSafeInteger(value) && value <= maximum;
}

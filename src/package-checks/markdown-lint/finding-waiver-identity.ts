import { snapshotExactClosedRecord } from "../../data-boundary/closed-values.ts";
import { isPositiveSafeInteger } from "../../data-boundary/value-shapes.ts";
import { isNormalizedProjectRelativePath } from "../host-environment/path.ts";
import {
  MARKDOWN_LINT_RULE_NAMES,
  type MarkdownLintFindingIdentity,
  type MarkdownLintRuleName
} from "./options.ts";

/** Validates and detaches the complete public location used for exact waiver matching. */
export function resolveMarkdownLintFindingIdentity(
  value: unknown
): MarkdownLintFindingIdentity | undefined {
  const identity = snapshotExactClosedRecord(value, ["path", "rule", "range"]);
  if (
    identity === undefined ||
    !isNormalizedProjectRelativePath(identity.path) ||
    !isMarkdownLintRuleName(identity.rule)
  ) {
    return undefined;
  }
  const range = snapshotExactClosedRecord(identity.range, ["start", "end"]);
  if (range === undefined) return undefined;
  const start = resolvePosition(range.start);
  const end = resolvePosition(range.end);
  if (
    start === undefined ||
    end === undefined ||
    start.line !== end.line ||
    end.column < start.column
  ) {
    return undefined;
  }
  return Object.freeze({
    path: identity.path,
    rule: identity.rule,
    range: Object.freeze({ start, end })
  });
}

function resolvePosition(
  value: unknown
): MarkdownLintFindingIdentity["range"]["start"] | undefined {
  const position = snapshotExactClosedRecord(value, ["line", "column"]);
  return position !== undefined &&
    isPositiveSafeInteger(position.line) &&
    isPositiveSafeInteger(position.column)
    ? Object.freeze({ line: position.line, column: position.column })
    : undefined;
}

function isMarkdownLintRuleName(value: unknown): value is MarkdownLintRuleName {
  return typeof value === "string" && MARKDOWN_LINT_RULE_NAMES.some((rule) => rule === value);
}

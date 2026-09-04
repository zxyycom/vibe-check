import type { LintScope } from "../../../development/lint.ts";
import type {
  ProcessFailureProjection,
  ProcessFailureRecord
} from "./process/failure-projection.ts";
import { safeWorkspaceRelativePath } from "./process/safe-workspace-path.ts";

const OXLINT_SEVERITIES = new Set(["error", "warning"]);
const OXLINT_RULE =
  /^[a-z][a-z0-9-]*(?:\/[a-z][a-z0-9-]*)?(?:\([a-z][a-z0-9-]*(?:\/[a-z][a-z0-9-]*)?\))?$/u;
const OXLINT_OUTPUT_KEYS = [
  "diagnostics",
  "number_of_files",
  "number_of_rules",
  "start_time",
  "threads_count"
];
const OXLINT_DIAGNOSTIC_KEYS = ["code", "filename", "help", "labels", "message", "severity", "url"];
const OXLINT_LABEL_KEYS = ["label", "span"];
const OXLINT_SPAN_KEYS = ["column", "length", "line", "offset"];
const OXLINT_SCOPE_DIRECTORY: Readonly<Record<LintScope, string>> = Object.freeze({
  product: "src",
  scripts: "scripts"
});

interface OxlintFailureProjectionInput {
  readonly scope: LintScope;
  readonly workspaceRoot: string;
}

interface OxlintFinding {
  readonly column: number;
  readonly path: string;
  readonly rule: string;
  readonly severity: "error" | "warning";
  readonly line: number;
}

/** Builds Records only from the closed oxlint JSON diagnostic protocol for one owned scope. */
export function createOxlintFailureProjection(
  input: OxlintFailureProjectionInput
): ProcessFailureProjection {
  return Object.freeze({
    recordsFromStdout: (stdout: string) => oxlintFailureRecords(stdout, input)
  });
}

function oxlintFailureRecords(
  stdout: string,
  input: OxlintFailureProjectionInput
): readonly ProcessFailureRecord[] | undefined {
  const findings = oxlintFindings(stdout, input);
  if (findings === undefined || findings.length === 0) return undefined;

  const occurrences = new Map<string, number>();
  return Object.freeze(
    findings.sort(compareFinding).map((finding) => {
      const baseId = oxlintRecordBaseId(finding);
      const occurrence = (occurrences.get(baseId) ?? 0) + 1;
      occurrences.set(baseId, occurrence);
      return Object.freeze({
        data: Object.freeze({
          kind: "oxlint-diagnostic",
          location: Object.freeze({ column: finding.column, line: finding.line }),
          occurrence,
          path: finding.path,
          rule: finding.rule,
          severity: finding.severity
        }),
        id: `${baseId}:${occurrence}`
      });
    })
  );
}

function oxlintFindings(
  stdout: string,
  input: OxlintFailureProjectionInput
): OxlintFinding[] | undefined {
  const output = parseJsonObject(stdout);
  if (output === undefined || !hasExactKeys(output, OXLINT_OUTPUT_KEYS)) return undefined;
  if (!validOutputMetadata(output) || !Array.isArray(output.diagnostics)) return undefined;

  const findings: OxlintFinding[] = [];
  for (const diagnostic of output.diagnostics) {
    const finding = oxlintFinding(diagnostic, input);
    if (finding === undefined) return undefined;
    findings.push(finding);
  }
  return findings;
}

function oxlintFinding(
  value: unknown,
  input: OxlintFailureProjectionInput
): OxlintFinding | undefined {
  if (!isRecord(value) || !hasExactKeys(value, OXLINT_DIAGNOSTIC_KEYS)) return undefined;
  const { code, filename, labels, severity } = value;
  if (!isSafeOxlintRule(code) || !isOxlintSeverity(severity) || !Array.isArray(labels))
    return undefined;
  const location = primaryLocation(labels);
  const path = safeWorkspaceRelativePath(input.workspaceRoot, filename);
  if (location === undefined || path === undefined || !inLintScope(path, input.scope))
    return undefined;
  return Object.freeze({ ...location, path, rule: code, severity });
}

function validOutputMetadata(value: Readonly<Record<string, unknown>>): boolean {
  return (
    positiveInteger(value.number_of_files) &&
    positiveInteger(value.number_of_rules) &&
    positiveInteger(value.threads_count) &&
    finiteNumber(value.start_time)
  );
}

function primaryLocation(
  labels: readonly unknown[]
): Readonly<{ readonly column: number; readonly line: number }> | undefined {
  let firstLocation: Readonly<{ readonly column: number; readonly line: number }> | undefined;
  for (const label of labels) {
    const location = labelLocation(label);
    if (location === undefined) return undefined;
    firstLocation ??= location;
  }
  return firstLocation;
}

function labelLocation(
  value: unknown
): Readonly<{ readonly column: number; readonly line: number }> | undefined {
  if (!isRecord(value)) return undefined;
  const span = labelSpan(value);
  if (span === undefined) return undefined;
  const { column, length, line, offset } = span;
  if (
    (Object.hasOwn(value, "label") && typeof value.label !== "string") ||
    !positiveInteger(column) ||
    !positiveInteger(line) ||
    !nonNegativeInteger(length) ||
    !nonNegativeInteger(offset)
  ) {
    return undefined;
  }
  return Object.freeze({ column, line });
}

function labelSpan(
  value: Readonly<Record<string, unknown>>
): Readonly<Record<string, unknown>> | undefined {
  if (!hasRequiredKnownKeys(value, ["span"], OXLINT_LABEL_KEYS)) {
    return undefined;
  }
  return isRecord(value.span) && hasExactKeys(value.span, OXLINT_SPAN_KEYS)
    ? value.span
    : undefined;
}

function inLintScope(path: string, scope: LintScope): boolean {
  return path.startsWith(`${OXLINT_SCOPE_DIRECTORY[scope]}/`);
}

function oxlintRecordBaseId(value: OxlintFinding): string {
  return ["oxlint", value.path, String(value.line), String(value.column), value.rule]
    .map(encodeRecordComponent)
    .join(":");
}

function compareFinding(left: OxlintFinding, right: OxlintFinding): number {
  return oxlintRecordBaseId(left).localeCompare(oxlintRecordBaseId(right));
}

function parseJsonObject(value: string): Readonly<Record<string, unknown>> | undefined {
  try {
    const parsed: unknown = JSON.parse(value);
    return isRecord(parsed) ? parsed : undefined;
  } catch {
    return undefined;
  }
}

function hasExactKeys(value: Readonly<Record<string, unknown>>, keys: readonly string[]): boolean {
  const valueKeys = Object.keys(value);
  return valueKeys.length === keys.length && keys.every((key) => Object.hasOwn(value, key));
}

function hasRequiredKnownKeys(
  value: Readonly<Record<string, unknown>>,
  requiredKeys: readonly string[],
  knownKeys: readonly string[]
): boolean {
  return (
    requiredKeys.every((key) => Object.hasOwn(value, key)) &&
    Object.keys(value).every((key) => knownKeys.includes(key))
  );
}

function isRecord(value: unknown): value is Readonly<Record<string, unknown>> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isOxlintSeverity(value: unknown): value is "error" | "warning" {
  return typeof value === "string" && OXLINT_SEVERITIES.has(value);
}

function isSafeOxlintRule(value: unknown): value is string {
  return typeof value === "string" && OXLINT_RULE.test(value);
}

function positiveInteger(value: unknown): value is number {
  return typeof value === "number" && Number.isSafeInteger(value) && value > 0;
}

function nonNegativeInteger(value: unknown): value is number {
  return typeof value === "number" && Number.isSafeInteger(value) && value >= 0;
}

function finiteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function encodeRecordComponent(value: string): string {
  return encodeURIComponent(value).replaceAll("(", "%28").replaceAll(")", "%29");
}

import { lint } from "markdownlint/promise";

import { snapshotClosedArray, snapshotClosedRecord } from "../../data-boundary/closed-values.ts";
import { MARKDOWN_LINT_RULE_NAMES, type MarkdownLintRuleName } from "./options.ts";

const FRONT_MATTER =
  /((^---[^\S\r\n\u2028\u2029]*$[\s\S]+?^---\s*)|(^\+\+\+[^\S\r\n\u2028\u2029]*$[\s\S]+?^(\+\+\+|\.\.\.)\s*)|(^\{[^\S\r\n\u2028\u2029]*$[\s\S]+?^\}\s*))(\r\n|\r|\n|$)/m;

const BACKEND_BY_RULE: Readonly<Record<MarkdownLintRuleName, string>> = {
  "heading-increment": "MD001",
  "no-reversed-links": "MD011",
  "no-missing-space-atx": "MD018",
  "fenced-code-language": "MD040",
  "no-empty-links": "MD042",
  "no-alt-text": "MD045",
  "link-fragments": "MD051",
  "reference-links-images": "MD052",
  "table-column-count": "MD056"
};

// Imported backend modules are fixed for this process; share one capability observation.
let referenceSupport: Promise<boolean> | undefined;

/** Rejects a backend graph that silently omits the selected undefined-reference capability. */
export async function supportsMarkdownLintRules(
  rules: readonly MarkdownLintRuleName[]
): Promise<boolean> {
  if (!rules.includes("reference-links-images")) return true;
  referenceSupport ??= probeReferenceSupport();
  return referenceSupport;
}

async function probeReferenceSupport(): Promise<boolean> {
  const sourcePath = "vibe-check-reference-capability.md";
  const sourceText = "[full][missing-full]\n[collapsed][]\n![image][missing-image]\n";
  const rules: readonly MarkdownLintRuleName[] = ["reference-links-images"];
  try {
    const raw: unknown = await lint({
      config: backendConfiguration(rules),
      frontMatter: FRONT_MATTER,
      noInlineConfig: true,
      strings: { [sourcePath]: sourceText }
    });
    const findings = parseBackendFindings(raw, sourcePath, sourceText, rules);
    const expectedRangeLengthsUtf16 = [20, 13, 23];
    return (
      typeof findings !== "string" &&
      findings.length === expectedRangeLengthsUtf16.length &&
      findings.every(
        (finding, index) =>
          finding.rule === "reference-links-images" &&
          finding.lineNumber === index + 1 &&
          finding.range?.[0] === 1 &&
          finding.range[1] === expectedRangeLengthsUtf16[index]
      )
    );
  } catch {
    return false;
  }
}

export interface MarkdownLintBackendFinding {
  readonly lineNumber: number;
  readonly range: readonly [number, number] | null;
  readonly rule: MarkdownLintRuleName;
}

/** Runs the fixed markdownlint Promise strings API and validates its raw protocol. */
export async function lintMarkdownString(
  sourcePath: string,
  sourceText: string,
  rules: readonly MarkdownLintRuleName[]
): Promise<readonly MarkdownLintBackendFinding[] | "backend-failed" | "backend-protocol-invalid"> {
  if (!(await supportsMarkdownLintRules(rules))) return "backend-failed";
  let raw: unknown;
  try {
    raw = await lint({
      config: backendConfiguration(rules),
      frontMatter: FRONT_MATTER,
      noInlineConfig: true,
      strings: { [sourcePath]: sourceText }
    });
  } catch {
    return "backend-failed";
  }
  return parseBackendFindings(raw, sourcePath, sourceText, rules);
}

function backendConfiguration(
  rules: readonly MarkdownLintRuleName[]
): Readonly<Record<string, unknown>> {
  const configuration: Record<string, unknown> = { default: false };
  for (const rule of rules) configuration[BACKEND_BY_RULE[rule]] = configurationFor(rule);
  if (rules.includes("reference-links-images") && !rules.includes("heading-increment")) {
    configuration.MD001 = configurationFor("heading-increment");
  }
  return configuration;
}

function configurationFor(rule: MarkdownLintRuleName): unknown {
  switch (rule) {
    case "heading-increment":
      return { front_matter_title: "^\\s*title\\s*[:=]" };
    case "fenced-code-language":
      return { allowed_languages: [], language_only: false };
    case "link-fragments":
      return { ignore_case: false, ignored_pattern: "" };
    case "reference-links-images":
      return { ignored_labels: ["x"], shortcut_syntax: false };
    case "no-reversed-links":
    case "no-missing-space-atx":
    case "no-empty-links":
    case "no-alt-text":
    case "table-column-count":
      return true;
  }
}

function parseBackendFindings(
  value: unknown,
  sourcePath: string,
  sourceText: string,
  selectedRules: readonly MarkdownLintRuleName[]
): readonly MarkdownLintBackendFinding[] | "backend-protocol-invalid" {
  const result = snapshotClosedRecord(value);
  if (
    result === undefined ||
    Object.keys(result).length !== 1 ||
    !Object.hasOwn(result, sourcePath) ||
    !Array.isArray(result[sourcePath])
  )
    return "backend-protocol-invalid";
  const lines = sourceText.split(/\r\n|\r|\n/u);
  const findings: MarkdownLintBackendFinding[] = [];
  for (const rawFinding of result[sourcePath]) {
    const finding = parseBackendFinding(rawFinding, lines);
    if (finding === undefined) return "backend-protocol-invalid";
    if (selectedRules.includes(finding.rule)) findings.push(finding);
  }
  return Object.freeze(findings);
}

function parseBackendFinding(
  value: unknown,
  lines: readonly string[]
): MarkdownLintBackendFinding | undefined {
  const fields = validatedBackendFindingFields(value, lines);
  if (fields === undefined) return undefined;
  const range = parseMarkdownLintRange(fields.errorRange, fields.line);
  return range === undefined
    ? undefined
    : Object.freeze({ lineNumber: fields.lineNumber, range, rule: fields.rule });
}

function validatedBackendFindingFields(
  value: unknown,
  lines: readonly string[]
):
  | Readonly<{
      readonly errorRange: unknown;
      readonly line: string;
      readonly lineNumber: number;
      readonly rule: MarkdownLintRuleName;
    }>
  | undefined {
  const finding = snapshotClosedRecord(value);
  if (finding === undefined) return undefined;
  const ruleNames = finding.ruleNames;
  const lineNumber = finding.lineNumber;
  if (
    !Array.isArray(ruleNames) ||
    typeof ruleNames[0] !== "string" ||
    typeof lineNumber !== "number"
  )
    return undefined;
  if (!Number.isSafeInteger(lineNumber) || lineNumber < 1 || lineNumber > lines.length)
    return undefined;
  const rule = ruleForBackend(ruleNames[0]);
  const line = lines[lineNumber - 1];
  return rule === undefined || line === undefined
    ? undefined
    : Object.freeze({ errorRange: finding.errorRange, line, lineNumber, rule });
}

function ruleForBackend(backendRule: string): MarkdownLintRuleName | undefined {
  return MARKDOWN_LINT_RULE_NAMES.find((rule) => BACKEND_BY_RULE[rule] === backendRule);
}

/** Validates one backend or restored-cache range against the current source line. */
export function parseMarkdownLintRange(
  value: unknown,
  line: string
): readonly [number, number] | null | undefined {
  if (value === null) return null;
  const range = snapshotClosedArray(value);
  if (range?.length !== 2) return undefined;
  const [column, length] = range;
  if (
    typeof column !== "number" ||
    typeof length !== "number" ||
    !Number.isSafeInteger(column) ||
    !Number.isSafeInteger(length) ||
    column < 1 ||
    length < 1 ||
    column - 1 + length > line.length
  )
    return undefined;
  return Object.freeze([column, length] as const);
}

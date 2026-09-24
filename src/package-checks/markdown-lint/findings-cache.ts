import { createHash } from "node:crypto";
import { createRequire } from "node:module";

import {
  snapshotClosedRecord,
  snapshotExactClosedRecord
} from "../../data-boundary/closed-values.ts";
import { cacheJsonByKey } from "../../package-tools/cache/cache-json-by-key.ts";
import {
  lintMarkdownString,
  parseMarkdownLintRange,
  type MarkdownLintBackendFinding
} from "./adapter.ts";
import {
  MARKDOWN_LINT_RULE_NAMES,
  type MarkdownLintCacheOptions,
  type MarkdownLintRuleName
} from "./options.ts";
import type { MarkdownLintUnavailableReason } from "./unavailable-reasons.ts";

type LintFacts = Readonly<{ readonly findings: readonly MarkdownLintBackendFinding[] }>;
type MarkdownLintCacheInput = Readonly<{
  readonly sourcePath: string;
  readonly sourceText: string;
  readonly rules: readonly MarkdownLintRuleName[];
  readonly cache: MarkdownLintCacheOptions;
  readonly signal: AbortSignal;
}>;
export type MarkdownLintFactsResult =
  | Readonly<{
      readonly findings: readonly MarkdownLintBackendFinding[];
      readonly source: "cache" | "computed" | "uncached";
    }>
  | MarkdownLintUnavailableReason;

/** Bump when adapter configuration or finding interpretation changes without a backend version change. */
const CACHE_FORMAT_VERSION = "markdown-lint-findings-v1";
const backendVersion = installedMarkdownlintVersion();

class LintComputationUnavailable extends Error {
  readonly reason: MarkdownLintUnavailableReason;

  constructor(reason: MarkdownLintUnavailableReason) {
    super(`Markdown lint unavailable: ${reason}`);
    this.reason = reason;
  }
}

/** Reuses only validated per-source findings; all source reads and Check settlement remain live. */
export async function lintMarkdownWithCache(
  input: MarkdownLintCacheInput
): Promise<MarkdownLintFactsResult> {
  const { sourcePath, sourceText, rules, cache, signal } = input;
  if (signal.aborted) return "cancelled";
  if (!cache.enabled || backendVersion === undefined) return lintFresh(input);

  try {
    const result = await cacheJsonByKey({
      directory: cache.directory,
      key: JSON.stringify({
        path: sourcePath,
        sourceDigest: createHash("sha256").update(sourceText, "utf8").digest("hex"),
        rules
      }),
      namespace: "markdown-lint-findings",
      version: `${CACHE_FORMAT_VERSION}:${backendVersion}`,
      compute: async () => {
        if (signal.aborted) throw new LintComputationUnavailable("cancelled");
        const findings = await lintMarkdownString(sourcePath, sourceText, rules);
        if (typeof findings === "string") throw new LintComputationUnavailable(findings);
        if (signal.aborted) throw new LintComputationUnavailable("cancelled");
        return { findings };
      },
      parse: (value) => parseLintFacts(value, sourceText, rules)
    });
    if (signal.aborted) return "cancelled";
    return Object.freeze({ findings: result.value.findings, source: result.source });
  } catch (error: unknown) {
    if (signal.aborted) return "cancelled";
    if (error instanceof LintComputationUnavailable) return error.reason;
    throw error;
  }
}

async function lintFresh(input: MarkdownLintCacheInput): Promise<MarkdownLintFactsResult> {
  const findings = await lintMarkdownString(input.sourcePath, input.sourceText, input.rules);
  if (input.signal.aborted) return "cancelled";
  return typeof findings === "string"
    ? findings
    : Object.freeze({ findings, source: "uncached" as const });
}

function parseLintFacts(
  value: unknown,
  sourceText: string,
  rules: readonly MarkdownLintRuleName[]
): LintFacts {
  const payload = snapshotExactClosedRecord(value, ["findings"]);
  if (payload === undefined || !Array.isArray(payload.findings))
    throw new TypeError("Invalid Markdown lint cache payload");
  const lines = sourceText.split(/\r\n|\r|\n/u);
  const findings = payload.findings.map((rawFinding: unknown) => {
    const finding = snapshotExactClosedRecord(rawFinding, ["lineNumber", "range", "rule"]);
    if (
      finding === undefined ||
      !isMarkdownLintRuleName(finding.rule) ||
      !rules.includes(finding.rule) ||
      typeof finding.lineNumber !== "number" ||
      !Number.isSafeInteger(finding.lineNumber) ||
      finding.lineNumber < 1 ||
      finding.lineNumber > lines.length
    )
      throw new TypeError("Invalid Markdown lint cached finding");
    const line = lines[finding.lineNumber - 1];
    if (line === undefined) throw new TypeError("Invalid Markdown lint cached line");
    const range = parseMarkdownLintRange(finding.range, line);
    if (range === undefined) throw new TypeError("Invalid Markdown lint cached range");
    return Object.freeze({
      lineNumber: finding.lineNumber,
      range,
      rule: finding.rule
    });
  });
  return Object.freeze({ findings: Object.freeze(findings) });
}

function isMarkdownLintRuleName(value: unknown): value is MarkdownLintRuleName {
  return typeof value === "string" && MARKDOWN_LINT_RULE_NAMES.some((rule) => rule === value);
}

function installedMarkdownlintVersion(): string | undefined {
  try {
    const packageJson: unknown = createRequire(import.meta.url)("markdownlint/package.json");
    const metadata = snapshotClosedRecord(packageJson);
    return typeof metadata?.version === "string" && metadata.version.length > 0
      ? metadata.version
      : undefined;
  } catch {
    return undefined;
  }
}

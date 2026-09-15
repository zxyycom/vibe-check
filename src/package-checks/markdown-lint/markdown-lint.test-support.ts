import type { CheckExecution, CheckResult } from "../../check/check.ts";
import {
  createTypeScriptSourceRoot,
  executeCheck,
  type ReportedCheckRecord
} from "../check-execution.test-support.ts";
import type { ResolvedMarkdownLintOptions } from "./options.ts";

export const MARKDOWN_LINT_FILES = Object.freeze({
  exclude: Object.freeze([]),
  include: Object.freeze(["**/*.md", "**/*.markdown"]),
  source: "filesystem" as const
});

export const MARKDOWN_LINT_OPTIONS: ResolvedMarkdownLintOptions = Object.freeze({
  files: MARKDOWN_LINT_FILES,
  findingPolicy: "blocking",
  rules: Object.freeze([
    "heading-increment",
    "no-reversed-links",
    "no-missing-space-atx",
    "fenced-code-language",
    "no-empty-links",
    "no-alt-text",
    "reference-links-images",
    "table-column-count"
  ] as const),
  limits: Object.freeze({ maxMarkdownBytes: 1_048_576, maxFindings: 10_000 })
});

export function createMarkdownLintTestRoot(prefix: string): string {
  return createTypeScriptSourceRoot(prefix);
}

export async function executeMarkdownLintCheck(
  callback: CheckExecution<ResolvedMarkdownLintOptions>,
  options: ResolvedMarkdownLintOptions,
  root: string,
  signal: AbortSignal = new AbortController().signal
): Promise<
  Readonly<{ readonly records: readonly ReportedCheckRecord[]; readonly result: CheckResult }>
> {
  return executeCheck(callback, options, root, signal);
}

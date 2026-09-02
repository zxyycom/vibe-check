import type { ResolvedMarkdownLinkValidationOptions } from "./options.ts";
import type { ProjectFileSelection } from "../project-files/configuration.ts";
import type { CheckExecution, CheckResult } from "../../check/check.ts";
import {
  createTypeScriptSourceRoot,
  executeCheck,
  type ReportedCheckRecord
} from "../check-execution.test-support.ts";

const FILES = Object.freeze({
  exclude: Object.freeze([]),
  include: Object.freeze(["**/*.ts"]),
  source: "filesystem" as const
});

export const MARKDOWN_FILES = Object.freeze({
  exclude: Object.freeze([]),
  include: Object.freeze(["**/*.md", "**/*.markdown"]),
  source: "filesystem" as const
});

export const MARKDOWN_LINK_OPTIONS: ResolvedMarkdownLinkValidationOptions = Object.freeze({
  cache: Object.freeze({ enabled: false }),
  files: MARKDOWN_FILES,
  findingPolicy: "blocking",
  requireExistingTargets: true,
  validateSameDocumentAnchors: true,
  validateCrossDocumentAnchors: true,
  rootExternalTargetMode: "report",
  requireNonEmptyDirectories: false,
  limits: Object.freeze({
    maxMarkdownBytes: 1_048_576,
    maxOccurrences: 10_000,
    maxTargetReads: 1_000
  })
});

export function createMarkdownTestRoot(prefix: string): string {
  return createTypeScriptSourceRoot(prefix);
}

export async function execute(
  callback: CheckExecution<ResolvedMarkdownLinkValidationOptions>,
  options: ResolvedMarkdownLinkValidationOptions,
  root: string,
  files: ProjectFileSelection = FILES,
  signal: AbortSignal = new AbortController().signal
): Promise<
  Readonly<{
    readonly records: readonly ReportedRecord[];
    readonly result: CheckResult;
  }>
> {
  const executionOptions: ResolvedMarkdownLinkValidationOptions = Object.freeze({
    ...options,
    files
  });
  return executeCheck(callback, executionOptions, root, signal);
}

export type ReportedRecord = ReportedCheckRecord;

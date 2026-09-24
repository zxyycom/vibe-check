import path from "node:path";
import { realpath } from "node:fs/promises";

import type { CheckExecutionContext, CheckResult } from "../../check/check.ts";
import { appendCheckMessages } from "../../package-tools/finding-presentation/finding-presentation.ts";
import { collectProjectFiles } from "../project-files/collection.ts";
import { partitionProjectFilesByEligibility } from "../project-files/input-eligibility.ts";
import {
  probeRootContainedPath,
  readRegularFile
} from "../markdown-link-validation/filesystem-probes.ts";
import { isRootRelativePath } from "../markdown-link-validation/local-resolution.ts";
import type { MarkdownLintBackendFinding } from "./adapter.ts";
import type { MarkdownLintFinalData } from "./final-data.ts";
import { lintMarkdownWithCache } from "./findings-cache.ts";
import { markdownLintFindingMessages } from "./finding-messages.ts";
import type { ResolvedMarkdownLintOptions } from "./options.ts";
import { validMarkdownLintOptions } from "./options-validation.ts";
import {
  buildMarkdownLintInputRejectedRecord,
  orderedMarkdownLintCandidates,
  type MarkdownLintRecordCandidate
} from "./records.ts";
import {
  markdownLintUnavailableMessage,
  type MarkdownLintUnavailableReason
} from "./unavailable-reasons.ts";

export type { MarkdownLintUnavailableReason } from "./unavailable-reasons.ts";

export const MARKDOWN_LINT_CHECK_DEFINITION = {
  checkId: "markdown-lint",
  displayName: "Markdown lint"
} as const;

type Traversal =
  | Readonly<{
      readonly kind: "complete";
      readonly candidates: readonly MarkdownLintRecordCandidate[];
      readonly sourceFileCount: number;
    }>
  | Readonly<{ readonly kind: "unavailable"; readonly reason: MarkdownLintUnavailableReason }>;

/** Executes one bounded, ordered lint pass over the exact selected Markdown source paths. */
export async function executeMarkdownLint(
  context: CheckExecutionContext<ResolvedMarkdownLintOptions>
): Promise<CheckResult<MarkdownLintFinalData>> {
  return validMarkdownLintOptions(context.options)
    ? executeResolvedMarkdownLint(context)
    : unavailable("invalid-options");
}

async function executeResolvedMarkdownLint(
  context: CheckExecutionContext<ResolvedMarkdownLintOptions>
): Promise<CheckResult<MarkdownLintFinalData>> {
  if (context.signal.aborted) return unavailable("cancelled");
  const discovered = discoverSources(context);
  if (discovered.kind === "unavailable") return unavailable(discovered.reason);
  if (discovered.selectedPathCount === 0) {
    return Object.freeze({ status: "not-applicable", reason: { code: "no-eligible-input" } });
  }
  for (const rejectedPath of discovered.rejectedPaths) {
    const record = buildMarkdownLintInputRejectedRecord(rejectedPath);
    context.records.report({ id: record.id }, record.data);
  }
  const root = await canonicalProjectRoot(context.project.root);
  if (root === undefined) return unavailable("project-root-unavailable");
  const traversal = await traverseSources(
    discovered.sourcePaths,
    root,
    context.options,
    context.signal
  );
  if (traversal.kind === "unavailable")
    return appendRejected(unavailable(traversal.reason), discovered.rejectedPaths.length);
  if (context.signal.aborted)
    return appendRejected(unavailable("cancelled"), discovered.rejectedPaths.length);
  return publishMarkdownLintTraversal(context, traversal, discovered.rejectedPaths);
}

function publishMarkdownLintTraversal(
  context: CheckExecutionContext<ResolvedMarkdownLintOptions>,
  traversal: Extract<Traversal, { readonly kind: "complete" }>,
  rejectedPaths: readonly string[]
): CheckResult<MarkdownLintFinalData> {
  for (const candidate of traversal.candidates)
    context.records.report({ id: candidate.id }, candidate.data);
  const findingCount = traversal.candidates.length + rejectedPaths.length;
  const result: CheckResult<MarkdownLintFinalData> = Object.freeze({
    status:
      traversal.candidates.length > 0 && context.options.findingPolicy === "blocking"
        ? "failed"
        : "passed",
    data: Object.freeze({
      sourceFileCount: traversal.sourceFileCount,
      findingCount,
      rejectedInputCount: rejectedPaths.length
    })
  });
  return appendCheckMessages(
    result,
    markdownLintFindingMessages(
      traversal.candidates,
      rejectedPaths,
      context.options.findingPolicy === "blocking"
    )
  );
}

function discoverSources(context: CheckExecutionContext<ResolvedMarkdownLintOptions>):
  | Readonly<{
      readonly kind: "complete";
      readonly sourcePaths: readonly string[];
      readonly rejectedPaths: readonly string[];
      readonly selectedPathCount: number;
    }>
  | Readonly<{ readonly kind: "unavailable"; readonly reason: "source-unavailable" }> {
  try {
    const selectedPaths = collectProjectFiles(context.project.root, context.options.files);
    const partition = partitionProjectFilesByEligibility(selectedPaths, isMarkdownPath);
    return Object.freeze({
      kind: "complete" as const,
      sourcePaths: partition.acceptedPaths,
      rejectedPaths: partition.rejectedPaths,
      selectedPathCount: selectedPaths.length
    });
  } catch {
    return Object.freeze({ kind: "unavailable" as const, reason: "source-unavailable" as const });
  }
}

async function canonicalProjectRoot(projectRoot: string): Promise<string | undefined> {
  try {
    return await realpath(projectRoot);
  } catch {
    return undefined;
  }
}

async function traverseSources(
  sourcePaths: readonly string[],
  rootPath: string,
  options: ResolvedMarkdownLintOptions,
  signal: AbortSignal
): Promise<Traversal> {
  const rawFindings: Array<
    Readonly<{ readonly path: string; readonly finding: MarkdownLintBackendFinding }>
  > = [];
  let sourceFileCount = 0;
  for (const sourcePath of sourcePaths) {
    if (signal.aborted) return unavailableTraversal("cancelled");
    const source = await readMarkdownSource(rootPath, sourcePath, options.limits.maxMarkdownBytes);
    if (!source.ok) return unavailableTraversal(source.reason);
    const text = source.text;
    if (signal.aborted) return unavailableTraversal("cancelled");
    const linted = await lintMarkdownWithCache({
      sourcePath,
      sourceText: text,
      rules: options.rules,
      cache: options.cache,
      signal
    });
    const findings = typeof linted === "string" ? linted : linted.findings;
    if (typeof findings === "string") return unavailableTraversal(findings);
    if (signal.aborted) return unavailableTraversal("cancelled");
    sourceFileCount += 1;
    for (const finding of findings) rawFindings.push(Object.freeze({ path: sourcePath, finding }));
    if (rawFindings.length > options.limits.maxFindings)
      return unavailableTraversal("finding-limit-exceeded");
  }
  return Object.freeze({
    kind: "complete" as const,
    candidates: orderedMarkdownLintCandidates(rawFindings, options.rules),
    sourceFileCount
  });
}

async function readMarkdownSource(
  rootPath: string,
  rootRelativePath: string,
  maxBytes: number
): Promise<
  | Readonly<{ readonly ok: true; readonly text: string }>
  | Readonly<{ readonly ok: false; readonly reason: "source-too-large" | "source-unavailable" }>
> {
  if (!isRootRelativePath(rootPath, rootRelativePath))
    return Object.freeze({ ok: false, reason: "source-unavailable" });
  const candidatePath = path.resolve(rootPath, rootRelativePath);
  const probe = await probeRootContainedPath(rootPath, candidatePath);
  if (probe.kind !== "contained") return Object.freeze({ ok: false, reason: "source-unavailable" });
  const source = await readRegularFile(probe.absolutePath, maxBytes);
  if (!source.ok)
    return Object.freeze({
      ok: false,
      reason: source.reason === "too-large" ? "source-too-large" : "source-unavailable"
    });
  try {
    return Object.freeze({
      ok: true as const,
      text: new TextDecoder("utf-8", { fatal: true }).decode(source.bytes)
    });
  } catch {
    return Object.freeze({ ok: false, reason: "source-unavailable" });
  }
}

function isMarkdownPath(filePath: string): boolean {
  const extension = path.extname(filePath).toLowerCase();
  return extension === ".md" || extension === ".markdown";
}

function unavailableTraversal(reason: MarkdownLintUnavailableReason): Traversal {
  return Object.freeze({ kind: "unavailable" as const, reason });
}

function unavailable(reason: MarkdownLintUnavailableReason): CheckResult<MarkdownLintFinalData> {
  return Object.freeze({
    status: "unavailable",
    reason: { code: reason },
    messages: Object.freeze([
      Object.freeze({
        code: reason,
        level: "error" as const,
        message: markdownLintUnavailableMessage(reason)
      })
    ])
  });
}

function appendRejected(
  result: CheckResult<MarkdownLintFinalData>,
  rejectedInputCount: number
): CheckResult<MarkdownLintFinalData> {
  if (rejectedInputCount === 0) return result;
  return Object.freeze({
    ...result,
    messages: Object.freeze([
      ...(result.messages ?? []),
      Object.freeze({
        code: "input-rejected",
        level: "warning" as const,
        message: `${rejectedInputCount} selected markdownLint input file(s) were rejected because only .md/.markdown paths are supported; inspect this Check's Records and narrow files.include/exclude.`
      })
    ])
  });
}

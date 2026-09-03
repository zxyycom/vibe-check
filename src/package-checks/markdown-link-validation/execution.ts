import path from "node:path";

import type { ResolvedMarkdownLinkValidationOptions } from "./options.ts";
import type { CheckExecutionContext, CheckResult } from "../../check/check.ts";
import { collectProjectFiles } from "../project-files/collection.ts";
import type { ProjectFileSelection } from "../project-files/configuration.ts";
import { partitionProjectFilesByEligibility } from "../project-files/input-eligibility.ts";
import { appendCheckMessages } from "../../check/finding-presentation.ts";
import { createMarkdownLocalResolver, type MarkdownLocalResolver } from "./local-resolver.ts";
import type { MarkdownLinkValidationFinalData } from "./final-data.ts";
import { markdownFindingMessages } from "./finding-messages.ts";
import {
  buildMarkdownInputRejectedRecord,
  buildMarkdownLinkRecordCandidate,
  type MarkdownLinkRecordCandidate
} from "./records.ts";
import { settledMarkdownTraversalResult } from "./traversal-result.ts";
import {
  markdownLinkUnavailableMessage,
  type MarkdownLinkValidationUnavailableReason
} from "./unavailable-reasons.ts";
import { validMarkdownLinkValidationOptions } from "./options-validation.ts";

export type { MarkdownLinkValidationUnavailableReason } from "./unavailable-reasons.ts";

export const MARKDOWN_LINK_VALIDATION_CHECK_DEFINITION = {
  checkId: "markdown-link-validation",
  displayName: "Markdown link validation"
} as const;

interface MarkdownLinkValidationRun {
  readonly options: ResolvedMarkdownLinkValidationOptions;
  readonly resolver: MarkdownLocalResolver;
  readonly signal: AbortSignal;
}

type MarkdownLinkValidationUnavailable = Readonly<{
  readonly kind: "unavailable";
  readonly reason: MarkdownLinkValidationUnavailableReason;
}>;

type MarkdownSourceDiscovery =
  | Readonly<{
      readonly kind: "complete";
      readonly rejectedPaths: readonly string[];
      readonly selectedPathCount: number;
      readonly sourcePaths: readonly string[];
    }>
  | MarkdownLinkValidationUnavailable;

type MarkdownSourceValidation =
  | Readonly<{
      readonly kind: "complete";
      readonly candidates: readonly MarkdownLinkRecordCandidate[];
      readonly occurrenceCount: number;
    }>
  | MarkdownLinkValidationUnavailable;

type MarkdownLinkTraversal =
  | Readonly<{
      readonly kind: "complete";
      readonly candidates: readonly MarkdownLinkRecordCandidate[];
      readonly occurrenceCount: number;
      readonly sourceFileCount: number;
    }>
  | MarkdownLinkValidationUnavailable;

/** 验证本 Check 选中的 Markdown source 的离线本地链接完整性。 */
export async function executeMarkdownLinkValidation(
  context: CheckExecutionContext<ResolvedMarkdownLinkValidationOptions>
): Promise<CheckResult<MarkdownLinkValidationFinalData>> {
  if (!validMarkdownLinkValidationOptions(context.options)) return unavailable("invalid-options");
  const prepared = await prepareMarkdownTraversal(context);
  if (prepared.kind === "result") return prepared.result;
  const { rejectedPaths, traversal, resolver } = prepared;

  for (const candidate of traversal.candidates) {
    context.records.report({ id: candidate.id }, candidate.data);
  }
  return appendCheckMessages(
    settledMarkdownTraversalResult({
      findingCount: traversal.candidates.length,
      findingPolicy: context.options.findingPolicy,
      occurrenceCount: traversal.occurrenceCount,
      rejectedInputCount: rejectedPaths.length,
      sourceFileCount: traversal.sourceFileCount,
      targetReadCount: resolver.targetReadCount
    }),
    markdownFindingMessages(
      traversal.candidates,
      rejectedPaths,
      context.options.findingPolicy === "blocking"
    )
  );
}

type PreparedMarkdownTraversal =
  | Readonly<{
      readonly kind: "result";
      readonly result: CheckResult<MarkdownLinkValidationFinalData>;
    }>
  | Readonly<{
      readonly kind: "traversal";
      readonly rejectedPaths: readonly string[];
      readonly resolver: MarkdownLocalResolver;
      readonly traversal: Extract<MarkdownLinkTraversal, { readonly kind: "complete" }>;
    }>;

async function prepareMarkdownTraversal(
  context: CheckExecutionContext<ResolvedMarkdownLinkValidationOptions>
): Promise<PreparedMarkdownTraversal> {
  if (context.signal.aborted) return result(unavailable("cancelled"));
  const created = await createMarkdownLocalResolver(
    context.project.root,
    context.options.limits.maxTargetReads,
    context.options.cache,
    context.signal
  );
  if (!created.ok) return result(unavailable(created.reason));
  let prepared: PreparedMarkdownTraversal;
  try {
    prepared = await prepareCreatedMarkdownTraversal(context, created.resolver);
  } finally {
    await created.resolver.finalize();
  }
  return context.signal.aborted ? result(unavailable("cancelled")) : prepared;
}

async function prepareCreatedMarkdownTraversal(
  context: CheckExecutionContext<ResolvedMarkdownLinkValidationOptions>,
  resolver: MarkdownLocalResolver
): Promise<PreparedMarkdownTraversal> {
  if (context.signal.aborted) return result(unavailable("cancelled"));
  const sourceDiscovery = discoverMarkdownSourcePaths(context.project, context.options.files);
  if (sourceDiscovery.kind === "unavailable") return result(unavailable(sourceDiscovery.reason));
  if (sourceDiscovery.selectedPathCount === 0) return result(noEligibleInput());
  if (context.signal.aborted) return result(unavailable("cancelled"));
  reportRejectedInputs(context, sourceDiscovery.rejectedPaths);
  const traversal = await traverseMarkdownSources(sourceDiscovery.sourcePaths, {
    resolver,
    options: context.options,
    signal: context.signal
  });
  if (traversal.kind === "unavailable") {
    return result(
      appendRejectedInputMessage(
        unavailable(traversal.reason),
        sourceDiscovery.rejectedPaths.length
      )
    );
  }
  if (context.signal.aborted) {
    return result(
      appendRejectedInputMessage(unavailable("cancelled"), sourceDiscovery.rejectedPaths.length)
    );
  }
  return Object.freeze({
    kind: "traversal",
    rejectedPaths: sourceDiscovery.rejectedPaths,
    resolver,
    traversal
  });
}

function result(
  checkResult: CheckResult<MarkdownLinkValidationFinalData>
): PreparedMarkdownTraversal {
  return Object.freeze({ kind: "result", result: checkResult });
}

function noEligibleInput(): CheckResult<MarkdownLinkValidationFinalData> {
  return Object.freeze({ status: "not-applicable", reason: { code: "no-eligible-input" } });
}

function discoverMarkdownSourcePaths(
  project: CheckExecutionContext<ResolvedMarkdownLinkValidationOptions>["project"],
  files: ProjectFileSelection
): MarkdownSourceDiscovery {
  try {
    const selectedPaths = collectProjectFiles(project.root, files);
    const partition = partitionProjectFilesByEligibility(selectedPaths, isMarkdownSourcePath);
    return Object.freeze({
      kind: "complete" as const,
      rejectedPaths: partition.rejectedPaths,
      selectedPathCount: selectedPaths.length,
      sourcePaths: partition.acceptedPaths
    });
  } catch {
    return unavailableValidation("source-unavailable");
  }
}

function reportRejectedInputs(
  context: CheckExecutionContext<ResolvedMarkdownLinkValidationOptions>,
  paths: readonly string[]
): void {
  for (const selectedPath of paths) {
    const record = buildMarkdownInputRejectedRecord(selectedPath);
    context.records.report({ id: record.id }, record.data);
  }
}

function appendRejectedInputMessage(
  checkResult: CheckResult<MarkdownLinkValidationFinalData>,
  rejectedInputCount: number
): CheckResult<MarkdownLinkValidationFinalData> {
  if (rejectedInputCount === 0) return checkResult;
  return Object.freeze({
    ...checkResult,
    messages: Object.freeze([
      ...(checkResult.messages ?? []),
      Object.freeze({
        code: "input-rejected",
        level: "warning" as const,
        message: `${rejectedInputCount} selected markdownLinkValidation input file(s) were rejected because only .md/.markdown paths are supported; inspect this Check's Records and narrow files.include/exclude.`
      })
    ])
  });
}

function unavailableValidation(
  reason: MarkdownLinkValidationUnavailableReason
): MarkdownLinkValidationUnavailable {
  return Object.freeze({ kind: "unavailable", reason });
}

async function traverseMarkdownSources(
  sourcePaths: readonly string[],
  run: MarkdownLinkValidationRun
): Promise<MarkdownLinkTraversal> {
  const candidates: MarkdownLinkRecordCandidate[] = [];
  let occurrenceCount = 0;
  let sourceFileCount = 0;

  // The Run's shared Scheduler owns cross-Check concurrency; this Check processes sources strictly in order.
  for (const sourcePath of sourcePaths) {
    const sourceValidation = await validateMarkdownSource(sourcePath, occurrenceCount, run);
    if (sourceValidation.kind === "unavailable") return sourceValidation;

    candidates.push(...sourceValidation.candidates);
    occurrenceCount = sourceValidation.occurrenceCount;
    sourceFileCount += 1;
  }

  return Object.freeze({
    kind: "complete" as const,
    candidates: Object.freeze(candidates),
    occurrenceCount,
    sourceFileCount
  });
}

async function validateMarkdownSource(
  sourcePath: string,
  occurrenceCountBeforeSource: number,
  run: MarkdownLinkValidationRun
): Promise<MarkdownSourceValidation> {
  if (run.signal.aborted) return unavailableValidation("cancelled");
  const sourceRead = await run.resolver.readSource(sourcePath, run.options.limits.maxMarkdownBytes);
  if (run.signal.aborted) return unavailableValidation("cancelled");
  if (!sourceRead.ok) return unavailableValidation(sourceRead.reason);

  const candidates: MarkdownLinkRecordCandidate[] = [];
  let occurrenceCount = occurrenceCountBeforeSource;
  for (const [occurrenceIndex, occurrence] of sourceRead.source.facts.occurrences.entries()) {
    if (run.signal.aborted) return unavailableValidation("cancelled");
    occurrenceCount += 1;
    if (occurrenceCount > run.options.limits.maxOccurrences) {
      return unavailableValidation("occurrence-limit-exceeded");
    }

    const resolution = await run.resolver.resolve({
      source: sourceRead.source,
      rawDestination: occurrence.rawDestination,
      rootExternalTargetMode: run.options.rootExternalTargetMode,
      requireExistingTargets: run.options.requireExistingTargets,
      requireNonEmptyDirectories: run.options.requireNonEmptyDirectories,
      validateSameDocumentAnchors: run.options.validateSameDocumentAnchors,
      validateCrossDocumentAnchors: run.options.validateCrossDocumentAnchors,
      maxMarkdownBytes: run.options.limits.maxMarkdownBytes
    });
    if (run.signal.aborted) return unavailableValidation("cancelled");
    if (resolution.kind === "unavailable") return unavailableValidation(resolution.reason);
    const candidate = buildMarkdownLinkRecordCandidate(
      sourceRead.source.path,
      occurrenceIndex,
      occurrence,
      resolution
    );
    if (candidate !== undefined) candidates.push(candidate);
  }

  return Object.freeze({
    kind: "complete" as const,
    candidates: Object.freeze(candidates),
    occurrenceCount
  });
}

function isMarkdownSourcePath(filePath: string): boolean {
  const extension = path.extname(filePath).toLowerCase();
  return extension === ".md" || extension === ".markdown";
}

function unavailable(
  reason: MarkdownLinkValidationUnavailableReason
): CheckResult<MarkdownLinkValidationFinalData> {
  return Object.freeze({
    status: "unavailable",
    reason: { code: reason },
    messages: Object.freeze([
      Object.freeze({
        code: reason,
        level: "error" as const,
        message: markdownLinkUnavailableMessage(reason)
      })
    ])
  });
}

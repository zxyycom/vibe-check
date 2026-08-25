import path from "node:path";

import type { MarkdownLinkValidationOptions } from "../../definition/default-checks.ts";
import type { CheckExecutionContext, CheckResult } from "../../definition/custom-check.ts";
import { collectScanFiles } from "../input/files.ts";
import {
  createMarkdownLocalResolver,
  type MarkdownLocalResolution,
  type MarkdownLocalResolver,
  type MarkdownSafeTargetDescriptor
} from "../markdown-link-validation/local-resolver.ts";
import type {
  MarkdownLinkOccurrence,
  MarkdownSourceRange
} from "../markdown-link-validation/markdown-parser.ts";

export const MARKDOWN_LINK_VALIDATION_CHECK_DEFINITION = {
  checkId: "markdown-link-validation",
  displayName: "Markdown link validation"
} as const;

type MarkdownLinkFindingReason =
  | "missing-target"
  | "target-outside-project-root"
  | "empty-directory"
  | "anchor-on-directory"
  | "anchor-target-not-markdown"
  | "missing-anchor"
  | "unsupported-target-type";

interface MarkdownLinkRecordCandidate {
  readonly data: Readonly<{
    readonly occurrenceKind: "link" | "image";
    readonly range: Readonly<{
      readonly end: Readonly<{ readonly column: number; readonly line: number }>;
      readonly start: Readonly<{ readonly column: number; readonly line: number }>;
    }>;
    readonly reason: MarkdownLinkFindingReason;
    readonly sourcePath: string;
    readonly target: MarkdownSafeTargetDescriptor;
  }>;
  readonly id: string;
}

interface MarkdownLinkValidationRun {
  readonly options: MarkdownLinkValidationOptions;
  readonly resolver: MarkdownLocalResolver;
  readonly signal: AbortSignal;
}

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

type MarkdownLinkValidationUnavailable = Readonly<{ readonly kind: "unavailable" }>;

const UNAVAILABLE_VALIDATION: MarkdownLinkValidationUnavailable = Object.freeze({
  kind: "unavailable" as const
});

/** 验证 global scope 内 Markdown source 的离线本地链接完整性。 */
export async function executeMarkdownLinkValidation(
  context: CheckExecutionContext<MarkdownLinkValidationOptions>
): Promise<CheckResult> {
  if (context.signal.aborted) return unavailable();
  const createdResolver = await createMarkdownLocalResolver(
    context.project.root,
    context.options.limits.maxTargetReads
  );
  if (!createdResolver.ok || context.signal.aborted) return unavailable();

  const sourcePaths = discoverMarkdownSourcePaths(context.project);
  if (sourcePaths === undefined) return unavailable();
  if (sourcePaths.length === 0) {
    return Object.freeze({ status: "not-applicable", reason: { code: "no-eligible-input" } });
  }
  if (context.signal.aborted) return unavailable();

  const traversal = await traverseMarkdownSources(sourcePaths, {
    resolver: createdResolver.resolver,
    options: context.options,
    signal: context.signal
  });
  if (traversal.kind === "unavailable" || context.signal.aborted) return unavailable();

  for (const candidate of traversal.candidates) {
    context.records.report({ id: candidate.id }, candidate.data);
  }
  return Object.freeze({
    status: traversal.candidates.length === 0 ? "passed" : "failed",
    data: Object.freeze({
      sourceFileCount: traversal.sourceFileCount,
      occurrenceCount: traversal.occurrenceCount,
      targetReadCount: createdResolver.resolver.targetReadCount,
      findingCount: traversal.candidates.length
    })
  });
}

function discoverMarkdownSourcePaths(
  project: CheckExecutionContext<MarkdownLinkValidationOptions>["project"]
): readonly string[] | undefined {
  try {
    return Object.freeze(
      collectScanFiles(project.root, project.files).filter(isMarkdownSourcePath)
    );
  } catch {
    return undefined;
  }
}

async function traverseMarkdownSources(
  sourcePaths: readonly string[],
  run: MarkdownLinkValidationRun
): Promise<MarkdownLinkTraversal> {
  const candidates: MarkdownLinkRecordCandidate[] = [];
  let occurrenceCount = 0;
  let sourceFileCount = 0;

  for (const sourcePath of sourcePaths) {
    const sourceValidation = await validateMarkdownSource(sourcePath, occurrenceCount, run);
    if (sourceValidation.kind === "unavailable") return UNAVAILABLE_VALIDATION;

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
  if (run.signal.aborted) return UNAVAILABLE_VALIDATION;
  const sourceRead = await run.resolver.readSource(sourcePath, run.options.limits.maxMarkdownBytes);
  if (!sourceRead.ok || run.signal.aborted) return UNAVAILABLE_VALIDATION;

  const candidates: MarkdownLinkRecordCandidate[] = [];
  let occurrenceCount = occurrenceCountBeforeSource;
  for (const [occurrenceIndex, occurrence] of sourceRead.source.facts.occurrences.entries()) {
    if (run.signal.aborted) return UNAVAILABLE_VALIDATION;
    occurrenceCount += 1;
    if (occurrenceCount > run.options.limits.maxOccurrences) return UNAVAILABLE_VALIDATION;

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
    if (run.signal.aborted || resolution.kind === "unavailable") {
      return UNAVAILABLE_VALIDATION;
    }
    if (resolution.kind === "finding" && !isNormalFindingReason(resolution.reason)) {
      return UNAVAILABLE_VALIDATION;
    }

    const candidate = recordCandidate(
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

function recordCandidate(
  sourcePath: string,
  occurrenceIndex: number,
  occurrence: MarkdownLinkOccurrence,
  resolution: MarkdownLocalResolution
): MarkdownLinkRecordCandidate | undefined {
  if (resolution.kind !== "finding") return undefined;
  if (!isNormalFindingReason(resolution.reason)) return undefined;
  return Object.freeze({
    id: `source:${encodeURIComponent(sourcePath)}:occurrence:${occurrenceIndex + 1}:reason:${resolution.reason}`,
    data: Object.freeze({
      reason: resolution.reason,
      occurrenceKind: occurrence.kind,
      sourcePath,
      range: publicRange(occurrence.range),
      target: resolution.target
    })
  });
}

function publicRange(range: MarkdownSourceRange): MarkdownLinkRecordCandidate["data"]["range"] {
  return Object.freeze({
    start: Object.freeze({ line: range.start.line, column: range.start.column }),
    end: Object.freeze({ line: range.end.line, column: range.end.column })
  });
}

function isMarkdownSourcePath(filePath: string): boolean {
  const extension = path.extname(filePath).toLowerCase();
  return extension === ".md" || extension === ".markdown";
}

function isNormalFindingReason(reason: string): reason is MarkdownLinkFindingReason {
  return (
    reason === "missing-target" ||
    reason === "target-outside-project-root" ||
    reason === "empty-directory" ||
    reason === "anchor-on-directory" ||
    reason === "anchor-target-not-markdown" ||
    reason === "missing-anchor" ||
    reason === "unsupported-target-type"
  );
}

function unavailable(): CheckResult {
  return Object.freeze({
    status: "unavailable",
    reason: { code: "markdown-link-validation-unavailable" }
  });
}

import path from "node:path";

import type { ResolvedMarkdownLinkValidationOptions } from "./options.ts";
import type { CheckExecutionContext, CheckResult } from "../../check/check.ts";
import { collectProjectFiles } from "../project-files/collection.ts";
import type { ProjectFileSelection } from "../project-files/configuration.ts";
import {
  createMarkdownLocalResolver,
  type MarkdownLinkFindingReason,
  type MarkdownLocalResolution,
  type MarkdownLocalResolutionReason,
  type MarkdownLocalResolver,
  type MarkdownSafeTargetDescriptor,
  type MarkdownSourceReadFailureReason
} from "./local-resolver.ts";
import type { MarkdownLinkOccurrence, MarkdownSourceRange } from "./markdown-parser.ts";
import type { MarkdownLinkValidationFinalData } from "./final-data.ts";
import { validMarkdownLinkValidationOptions } from "./options-validation.ts";

export const MARKDOWN_LINK_VALIDATION_CHECK_DEFINITION = {
  checkId: "markdown-link-validation",
  displayName: "Markdown link validation"
} as const;

/** 一条本地 Markdown link finding supplemental Record 的 data。 */
export type MarkdownLinkValidationRecordData = Readonly<{
  readonly occurrenceKind: "link" | "image";
  readonly range: Readonly<{
    readonly end: Readonly<{ readonly column: number; readonly line: number }>;
    readonly start: Readonly<{ readonly column: number; readonly line: number }>;
  }>;
  readonly reason: MarkdownLinkFindingReason;
  readonly sourcePath: string;
  readonly target: MarkdownSafeTargetDescriptor;
}>;

interface MarkdownLinkRecordCandidate {
  readonly data: MarkdownLinkValidationRecordData;
  readonly id: string;
}

interface MarkdownLinkValidationRun {
  readonly options: ResolvedMarkdownLinkValidationOptions;
  readonly resolver: MarkdownLocalResolver;
  readonly signal: AbortSignal;
}

/** `markdown-link-validation` whole-Check unavailable outcome 的稳定 reason code。 */
export type MarkdownLinkValidationUnavailableReason =
  | "invalid-options"
  | "cancelled"
  | "occurrence-limit-exceeded"
  | "project-root-unavailable"
  | MarkdownLocalResolutionReason
  | MarkdownSourceReadFailureReason;

type MarkdownLinkValidationUnavailable = Readonly<{
  readonly kind: "unavailable";
  readonly reason: MarkdownLinkValidationUnavailableReason;
}>;

type MarkdownSourceDiscovery =
  | Readonly<{
      readonly kind: "complete";
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

  if (context.signal.aborted) return unavailable("cancelled");
  const createdResolver = await createMarkdownLocalResolver(
    context.project.root,
    context.options.limits.maxTargetReads
  );
  if (!createdResolver.ok) return unavailable(createdResolver.reason);
  if (context.signal.aborted) return unavailable("cancelled");

  const sourceDiscovery = discoverMarkdownSourcePaths(context.project, context.options.files);
  if (sourceDiscovery.kind === "unavailable") return unavailable(sourceDiscovery.reason);
  const { sourcePaths } = sourceDiscovery;
  if (sourcePaths.length === 0) {
    return Object.freeze({ status: "not-applicable", reason: { code: "no-eligible-input" } });
  }
  if (context.signal.aborted) return unavailable("cancelled");

  const traversal = await traverseMarkdownSources(sourcePaths, {
    resolver: createdResolver.resolver,
    options: context.options,
    signal: context.signal
  });
  if (traversal.kind === "unavailable") return unavailable(traversal.reason);
  if (context.signal.aborted) return unavailable("cancelled");

  for (const candidate of traversal.candidates) {
    context.records.report({ id: candidate.id }, candidate.data);
  }
  const data = Object.freeze({
    sourceFileCount: traversal.sourceFileCount,
    occurrenceCount: traversal.occurrenceCount,
    targetReadCount: createdResolver.resolver.targetReadCount,
    findingCount: traversal.candidates.length
  });
  if (traversal.candidates.length === 0) {
    return Object.freeze({ data, status: "passed" });
  }
  return Object.freeze({
    data,
    messages: Object.freeze([
      Object.freeze({
        code: "invalid-local-links",
        level: "error" as const,
        message: `${traversal.candidates.length} local Markdown link finding(s) require attention; inspect this Check's Records for source ranges, targets, and reasons.`
      })
    ]),
    status: "failed"
  });
}

function discoverMarkdownSourcePaths(
  project: CheckExecutionContext<ResolvedMarkdownLinkValidationOptions>["project"],
  files: ProjectFileSelection
): MarkdownSourceDiscovery {
  try {
    return Object.freeze({
      kind: "complete" as const,
      sourcePaths: Object.freeze(
        collectProjectFiles(project.root, files).filter(isMarkdownSourcePath)
      )
    });
  } catch {
    return unavailableValidation("source-unavailable");
  }
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

function unavailable(
  reason: MarkdownLinkValidationUnavailableReason
): CheckResult<MarkdownLinkValidationFinalData> {
  return Object.freeze({
    status: "unavailable",
    reason: { code: reason },
    messages: Object.freeze([
      Object.freeze({ code: reason, level: "error" as const, message: unavailableMessage(reason) })
    ])
  });
}

function unavailableMessage(reason: MarkdownLinkValidationUnavailableReason): string {
  switch (reason) {
    case "invalid-options":
      return "markdownLinkValidation options are invalid; recreate the Check with markdownLinkValidation(options) or restore its complete resolved options.";
    case "project-root-unavailable":
      return "Markdown link validation could not resolve the project root; check that the path exists and is accessible.";
    case "source-unavailable":
      return "A selected Markdown source could not be collected, read, decoded, or contained safely; check the file source and permissions.";
    case "source-too-large":
      return "A selected Markdown source exceeds maxMarkdownBytes; narrow the file selection or raise the bounded limit.";
    case "markdown-parse-failed":
      return "A selected Markdown source could not be parsed completely; inspect that document's Markdown syntax and encoding.";
    case "invalid-local-destination":
      return "A local Markdown destination could not be parsed safely; inspect the affected link destination syntax.";
    case "target-unavailable":
      return "A local Markdown target could not be probed or read safely; check the target path, permissions, size, and encoding.";
    case "occurrence-limit-exceeded":
      return "Markdown link validation exceeded maxOccurrences; narrow the source selection or raise the bounded limit.";
    case "target-read-limit-exceeded":
      return "Markdown link validation exceeded maxTargetReads; narrow the source selection or raise the bounded limit.";
    case "cancelled":
      return "Markdown link validation was cancelled before it could form a complete result; inspect the caller's cancellation reason and retry if appropriate.";
  }
}

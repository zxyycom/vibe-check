import { setImmediate } from "node:timers/promises";

import type { MarkdownLinkOccurrence } from "./markdown-parser.ts";
import type {
  MarkdownLinkSource,
  MarkdownLocalResolution,
  MarkdownLocalResolutionRequest,
  MarkdownLocalResolver
} from "./local-resolution.ts";
import type { ResolvedMarkdownLinkValidationOptions } from "./options.ts";
import { buildMarkdownLinkRecordCandidate, type MarkdownLinkRecordCandidate } from "./records.ts";
import type { MarkdownLinkValidationUnavailableReason } from "./unavailable-reasons.ts";

interface MarkdownTraversalRun {
  readonly options: ResolvedMarkdownLinkValidationOptions;
  readonly resolver: MarkdownLocalResolver;
  readonly signal: AbortSignal;
}
export type MarkdownLinkValidationUnavailable = Readonly<{
  readonly kind: "unavailable";
  readonly reason: MarkdownLinkValidationUnavailableReason;
}>;
export type MarkdownLinkTraversal =
  | Readonly<{
      readonly kind: "complete";
      readonly candidates: readonly MarkdownLinkRecordCandidate[];
      readonly occurrenceCount: number;
      readonly sourceFileCount: number;
    }>
  | MarkdownLinkValidationUnavailable;
interface SourceReference {
  readonly sourcePath: string;
  readonly occurrenceIndex: number;
  readonly occurrence: MarkdownLinkOccurrence;
}
interface SourceReferences {
  readonly references: SourceReference[];
  readonly requests: MarkdownLocalResolutionRequest[];
  occurrenceCount: number;
}

/** Whole-source loading, target observation, then stable candidate settlement; publication stays in execution.ts. */
export async function traverseMarkdownSources(
  sourcePaths: readonly string[],
  run: MarkdownTraversalRun
): Promise<MarkdownLinkTraversal> {
  const collected = await collectSourceReferences(sourcePaths, run);
  if ("kind" in collected) {
    return collected;
  }
  const resolutions = await run.resolver.resolveAll(collected.requests);
  if (run.signal.aborted) {
    return unavailableTraversal("cancelled");
  }
  if ("kind" in resolutions) {
    return unavailableTraversal(resolutions.reason);
  }
  const candidates = await settleReferenceCandidates(collected.references, resolutions, run.signal);
  if ("kind" in candidates) {
    return candidates;
  }
  return Object.freeze({
    kind: "complete",
    candidates: Object.freeze(candidates),
    occurrenceCount: collected.occurrenceCount,
    sourceFileCount: sourcePaths.length
  });
}

async function collectSourceReferences(
  sourcePaths: readonly string[],
  run: MarkdownTraversalRun
): Promise<SourceReferences | MarkdownLinkValidationUnavailable> {
  const collected: SourceReferences = { references: [], requests: [], occurrenceCount: 0 };
  if (!(await checkpoint(run.signal))) {
    return unavailableTraversal("cancelled");
  }
  // Only selected sources enter this phase; target links cannot enlarge source discovery.
  for (const sourcePath of sourcePaths) {
    if (run.signal.aborted) {
      return unavailableTraversal("cancelled");
    }
    const read = await run.resolver.readSource(sourcePath, run.options.limits.maxMarkdownBytes);
    if (run.signal.aborted) {
      return unavailableTraversal("cancelled");
    }
    if (!read.ok) {
      return unavailableTraversal(read.reason);
    }
    const failure = await registerSourceOccurrences(read.source, collected, run);
    if (failure !== undefined) {
      return failure;
    }
    if (!(await checkpoint(run.signal))) {
      return unavailableTraversal("cancelled");
    }
  }
  if (!(await checkpoint(run.signal))) {
    return unavailableTraversal("cancelled");
  }
  return collected;
}

async function registerSourceOccurrences(
  source: MarkdownLinkSource,
  collected: SourceReferences,
  run: MarkdownTraversalRun
): Promise<MarkdownLinkValidationUnavailable | undefined> {
  for (const [occurrenceIndex, occurrence] of source.facts.occurrences.entries()) {
    collected.occurrenceCount += 1;
    if (exceedsOccurrenceBudget(collected.occurrenceCount, run.options.limits.maxOccurrences)) {
      return unavailableTraversal("occurrence-limit-exceeded");
    }
    collected.references.push({ sourcePath: source.path, occurrenceIndex, occurrence });
    collected.requests.push({
      source,
      rawDestination: occurrence.rawDestination,
      rootExternalTargetMode: run.options.rootExternalTargetMode,
      requireExistingTargets: run.options.requireExistingTargets,
      requireNonEmptyDirectories: run.options.requireNonEmptyDirectories,
      validateSameDocumentAnchors: run.options.validateSameDocumentAnchors,
      validateCrossDocumentAnchors: run.options.validateCrossDocumentAnchors,
      maxMarkdownBytes: run.options.limits.maxMarkdownBytes
    });
    if (collected.occurrenceCount % 256 === 0 && !(await checkpoint(run.signal))) {
      return unavailableTraversal("cancelled");
    }
  }
  return undefined;
}

function exceedsOccurrenceBudget(count: number, limit: number | false): boolean {
  return !Number.isSafeInteger(count) || (limit !== false && count > limit);
}

async function settleReferenceCandidates(
  references: readonly SourceReference[],
  resolutions: readonly MarkdownLocalResolution[],
  signal: AbortSignal
): Promise<MarkdownLinkRecordCandidate[] | MarkdownLinkValidationUnavailable> {
  const candidates: MarkdownLinkRecordCandidate[] = [];
  for (const [index, reference] of references.entries()) {
    const resolution = resolutions[index];
    if (resolution === undefined) {
      throw new Error("A reference graph must settle every registered edge");
    }
    const candidate = buildMarkdownLinkRecordCandidate(
      reference.sourcePath,
      reference.occurrenceIndex,
      reference.occurrence,
      resolution
    );
    if (candidate !== undefined) {
      candidates.push(candidate);
    }
    if ((index + 1) % 256 === 0 && !(await checkpoint(signal))) {
      return unavailableTraversal("cancelled");
    }
  }
  if (!(await checkpoint(signal))) {
    return unavailableTraversal("cancelled");
  }
  return candidates;
}

async function checkpoint(signal: AbortSignal): Promise<boolean> {
  if (signal.aborted) {
    return false;
  }
  await setImmediate();
  return !signal.aborted;
}

function unavailableTraversal(
  reason: MarkdownLinkValidationUnavailableReason
): MarkdownLinkValidationUnavailable {
  return Object.freeze({ kind: "unavailable", reason });
}

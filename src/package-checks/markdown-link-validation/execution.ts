import type { DeepReadonly, CheckExecutionContext, CheckResult } from "../../check/check.ts";
import path from "node:path";

import type { ResolvedMarkdownLinkValidationOptions } from "./options.ts";
import { collectProjectFiles } from "../project-files/collection.ts";
import type { ProjectFileSelection } from "../project-files/configuration.ts";
import { partitionProjectFilesByEligibility } from "../project-files/input-eligibility.ts";
import { appendCheckMessages } from "../../package-tools/finding-presentation/finding-presentation.ts";
import { createMarkdownLocalResolver, type MarkdownLocalResolver } from "./local-resolver.ts";
import type { MarkdownLinkValidationFinalData } from "./final-data.ts";
import { markdownFindingMessages } from "./finding-messages.ts";
import { buildMarkdownInputRejectedRecord } from "./records.ts";
import { settledMarkdownTraversalResult } from "./traversal-result.ts";
import {
  markdownLinkUnavailableMessage,
  type MarkdownLinkValidationUnavailableReason
} from "./unavailable-reasons.ts";
import { validMarkdownLinkValidationOptions } from "./options-validation.ts";

import {
  traverseMarkdownSources,
  type MarkdownLinkTraversal,
  type MarkdownLinkValidationUnavailable
} from "./source-traversal.ts";

export type { MarkdownLinkValidationUnavailableReason } from "./unavailable-reasons.ts";

export const MARKDOWN_LINK_VALIDATION_CHECK_DEFINITION = {
  checkId: "markdown-link-validation",
  displayName: "Markdown link validation"
} as const;

type MarkdownSourceDiscovery =
  | Readonly<{
      readonly kind: "complete";
      readonly rejectedPaths: readonly string[];
      readonly selectedPathCount: number;
      readonly sourcePaths: readonly string[];
    }>
  | MarkdownLinkValidationUnavailable;

/** 验证本 Check 选中的 Markdown source 的离线本地链接完整性。 */
export async function executeMarkdownLinkValidation(
  options: DeepReadonly<ResolvedMarkdownLinkValidationOptions>,
  context: Pick<CheckExecutionContext, "project" | "records" | "signal">
): Promise<CheckResult<MarkdownLinkValidationFinalData>> {
  if (!validMarkdownLinkValidationOptions(options)) return unavailable("invalid-options");
  const prepared = await prepareMarkdownTraversal(options, context);
  if (prepared.kind === "result") return prepared.result;
  const { rejectedPaths, traversal, resolver } = prepared;

  for (const candidate of traversal.candidates) {
    context.records.report({ id: candidate.id }, candidate.data);
  }
  return appendCheckMessages(
    settledMarkdownTraversalResult({
      findingCount: traversal.candidates.length,
      findingPolicy: options.findingPolicy,
      occurrenceCount: traversal.occurrenceCount,
      rejectedInputCount: rejectedPaths.length,
      sourceFileCount: traversal.sourceFileCount,
      targetReadCount: resolver.targetReadCount
    }),
    [
      ...markdownFindingMessages(
        traversal.candidates,
        rejectedPaths,
        options.findingPolicy === "blocking"
      ),
      ...resolver.cacheMessages
    ]
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
  options: DeepReadonly<ResolvedMarkdownLinkValidationOptions>,
  context: Pick<CheckExecutionContext, "project" | "records" | "signal">
): Promise<PreparedMarkdownTraversal> {
  if (context.signal.aborted) return result(unavailable("cancelled"));
  const created = await createMarkdownLocalResolver(
    context.project.root,
    options.limits.maxTargetReads,
    options.cache,
    context.signal
  );
  if (!created.ok) return result(unavailable(created.reason));
  let prepared: PreparedMarkdownTraversal;
  try {
    prepared = await prepareCreatedMarkdownTraversal(options, context, created.resolver);
  } finally {
    await created.resolver.finalize();
  }
  if (context.signal.aborted) prepared = result(unavailable("cancelled"));
  else if (
    created.resolver.finalizationFailed &&
    !(prepared.kind === "result" && prepared.result.status === "unavailable")
  ) {
    prepared = result(unavailable("target-unavailable"));
  }
  return prepared.kind === "result"
    ? result(appendCheckMessages(prepared.result, created.resolver.cacheMessages))
    : prepared;
}

async function prepareCreatedMarkdownTraversal(
  options: DeepReadonly<ResolvedMarkdownLinkValidationOptions>,
  context: Pick<CheckExecutionContext, "project" | "records" | "signal">,
  resolver: MarkdownLocalResolver
): Promise<PreparedMarkdownTraversal> {
  if (context.signal.aborted) return result(unavailable("cancelled"));
  const sourceDiscovery = discoverMarkdownSourcePaths(context.project, options.files);
  if (sourceDiscovery.kind === "unavailable") return result(unavailable(sourceDiscovery.reason));
  if (sourceDiscovery.selectedPathCount === 0) return result(noEligibleInput());
  if (context.signal.aborted) return result(unavailable("cancelled"));
  reportRejectedInputs(options, context, sourceDiscovery.rejectedPaths);
  const traversal = await traverseMarkdownSources(sourceDiscovery.sourcePaths, {
    resolver,
    options: options,
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
  project: CheckExecutionContext["project"],
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
  options: DeepReadonly<ResolvedMarkdownLinkValidationOptions>,
  context: Pick<CheckExecutionContext, "project" | "records" | "signal">,
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
        message: `${rejectedInputCount} selected markdownLinkValidation input file(s) were rejected because only .md/.markdown paths are supported; inspect this Check's Records and narrow files.patterns.`
      })
    ])
  });
}

function unavailableValidation(
  reason: MarkdownLinkValidationUnavailableReason
): MarkdownLinkValidationUnavailable {
  return Object.freeze({ kind: "unavailable", reason });
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

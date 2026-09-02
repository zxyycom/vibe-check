import { realpath } from "node:fs/promises";

import { LinkLocalResolver } from "./resolver-engine.ts";
import type { MarkdownLocalResolverCreation } from "./local-resolution.ts";
import type { ResolvedMarkdownLinkValidationOptions } from "./options.ts";

/** Link-private, per-invocation state for source reads and direct local targets. */
export async function createMarkdownLocalResolver(
  projectRoot: string,
  maxTargetReads: number,
  cache: ResolvedMarkdownLinkValidationOptions["cache"],
  signal: AbortSignal
): Promise<MarkdownLocalResolverCreation> {
  try {
    const canonicalProjectRoot = await realpath(projectRoot);
    return Object.freeze({
      ok: true as const,
      resolver: new LinkLocalResolver(canonicalProjectRoot, maxTargetReads, cache, signal)
    });
  } catch {
    return Object.freeze({ ok: false as const, reason: "project-root-unavailable" as const });
  }
}

export {
  anchorResolution,
  finding,
  isMarkdownPath,
  isNotFound,
  isRootRelativePath,
  isWithinRoot,
  parseLocalDestination,
  relativeSegments,
  sameRootRelativePath,
  sourceUnavailable,
  toSlashPath,
  unavailable,
  valid
} from "./local-resolution.ts";
export type {
  EndpointProbe,
  MarkdownLinkFindingReason,
  MarkdownLinkSource,
  MarkdownLocalResolution,
  MarkdownLocalResolutionReason,
  MarkdownLocalResolutionRequest,
  MarkdownLocalResolver,
  MarkdownLocalResolverCreation,
  MarkdownSafeTargetDescriptor,
  MarkdownSourceReadFailureReason,
  MarkdownSourceReadResult,
  RootExternalTargetMode,
  RootProbe
} from "./local-resolution.ts";

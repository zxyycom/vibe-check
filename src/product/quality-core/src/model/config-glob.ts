import { minimatch } from "minimatch";

import { toSlashPath } from "../../../foundation/src/index.ts";

/**
 * Product config glob 的唯一 matcher boundary。
 * Candidate 使用 slash form，minimatch 使用默认 options。
 */
export function matchesAnyConfigGlob(
  candidatePath: string,
  configGlobs: readonly string[]
): boolean {
  const normalizedCandidatePath = toSlashPath(candidatePath);
  return configGlobs.some((configGlob) =>
    minimatch(normalizedCandidatePath, configGlob)
  );
}

import { minimatch } from "minimatch";

import { toSlashPath } from "../host-environment/path.ts";

/**
 * Product config glob 的唯一 matcher boundary。
 * Candidate 使用 slash form；dot path 只由显式 glob 决定，不附加隐式忽略规则。
 */
export function matchesAnyConfigGlob(
  candidatePath: string,
  configGlobs: readonly string[]
): boolean {
  const normalizedCandidatePath = toSlashPath(candidatePath);
  return configGlobs.some((configGlob) =>
    minimatch(normalizedCandidatePath, configGlob, { dot: true })
  );
}

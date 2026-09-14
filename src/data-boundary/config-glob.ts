import { minimatch } from "minimatch";

import { toSlashPath } from "./project-path.ts";

/**
 * Product config glob's single matcher boundary. Candidates use slash form;
 * dot paths participate only when an explicit glob matches them.
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

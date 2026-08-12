/**
 * Shared normalization helpers for quality scanner metric records.
 */

import { isExcluded } from "../model/code-areas.ts";
import type { ResolvedQualityConfig } from "../model/schema.ts";

export function selectLizardTargetFiles(files: string[], config: ResolvedQualityConfig): string[] {
  return files.filter(
    (file) => isLizardTarget(file) && !isExcluded(file, config.excludeDirs, config.generatedFiles)
  );
}

function isLizardTarget(filePath: string): boolean {
  return filePath.endsWith(".rs") || filePath.endsWith(".ts");
}

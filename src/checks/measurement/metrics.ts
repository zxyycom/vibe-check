/**
 * Shared normalization helpers for quality scanner metric records.
 */

import { isExcluded } from "../configuration/code-areas.ts";
import type { ScanInputConfig } from "../input/files.ts";

export function selectLizardTargetFiles(
  files: string[],
  config: Pick<ScanInputConfig, "excludeDirs" | "generatedFiles">
): string[] {
  return files.filter(
    (file) => isLizardTarget(file) && !isExcluded(file, config.excludeDirs, config.generatedFiles)
  );
}

function isLizardTarget(filePath: string): boolean {
  return filePath.endsWith(".rs") || filePath.endsWith(".ts");
}

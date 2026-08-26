/** Lizard 支持的 exact input 选择。 */

import { isExcluded } from "../project-files/code-area-classification.ts";
import type { ProjectFileSelection } from "../project-files/configuration.ts";

export function selectLizardTargetFiles(
  files: string[],
  config: Pick<ProjectFileSelection, "excludeDirs" | "generatedFiles">
): string[] {
  return files.filter(
    (file) => isLizardTarget(file) && !isExcluded(file, config.excludeDirs, config.generatedFiles)
  );
}

function isLizardTarget(filePath: string): boolean {
  return filePath.endsWith(".rs") || filePath.endsWith(".ts");
}

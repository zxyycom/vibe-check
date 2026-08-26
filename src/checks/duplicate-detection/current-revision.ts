import { isExcluded } from "../../project-files/code-area-classification.ts";
import type { ProjectFileSelection } from "../../project-files/configuration.ts";
import type { CodeAreaFileMap } from "../../project-files/code-area-classification.ts";

export function selectJscpdTargetFileMap(
  fileMap: CodeAreaFileMap,
  config: Pick<ProjectFileSelection, "excludeDirs" | "generatedFiles">
): CodeAreaFileMap {
  return new Map(
    Array.from(
      fileMap,
      ([area, areaFiles]) =>
        [
          area,
          [
            ...new Set(
              areaFiles.filter(
                (file) => !isExcluded(file, config.excludeDirs, config.generatedFiles)
              )
            )
          ].sort()
        ] as const
    ).filter(([, files]) => files.length >= 2)
  );
}

import { isExcluded } from "../../configuration/code-areas.ts";
import type { ScanInputConfig } from "../../input/files.ts";
import type { CodeAreaFileMap } from "../../configuration/metric-contract.ts";

export function selectJscpdTargetFileMap(
  fileMap: CodeAreaFileMap,
  config: Pick<ScanInputConfig, "excludeDirs" | "generatedFiles">
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

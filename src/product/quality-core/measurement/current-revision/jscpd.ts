import { isExcluded } from "../../model/code-areas.ts";
import type {
  CodeAreaFileMap,
  ResolvedQualityConfig
} from "../../model/schema.ts";

export function selectJscpdTargetFileMap(
  fileMap: CodeAreaFileMap,
  config: Pick<ResolvedQualityConfig, "excludeDirs" | "generatedFiles">
): CodeAreaFileMap {
  return new Map(Array.from(fileMap, ([area, areaFiles]) => [
    area,
    [...new Set(areaFiles.filter(
      (file) => !isExcluded(file, config.excludeDirs, config.generatedFiles)
    ))].sort()
  ] as const).filter(([, files]) => files.length >= 2));
}

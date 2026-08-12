import { isExcluded } from "../../model/code-areas.ts";
import {
  planJscpdAreaScanTasks
} from "../scanners/jscpd/area-scans.ts";
import type {
  CodeAreaFileMap,
  ResolvedQualityConfig
} from "../../model/schema.ts";

export function selectJscpdTargetFileMap(
  fileMap: CodeAreaFileMap,
  config: ResolvedQualityConfig
): CodeAreaFileMap {
  const tasks = planJscpdAreaScanTasks(
    Array.from(fileMap, ([area, areaFiles]) => ({
      area,
      files: areaFiles.filter(
        (file) => !isExcluded(file, config.excludeDirs, config.generatedFiles)
      ),
      minimumTokens: config.checks.duplication.minimumTokensByCodeArea[area] ??
        config.checks.duplication.defaultMinimumTokens
    }))
  );
  return new Map(tasks.map((task) => [task.area, task.files]));
}

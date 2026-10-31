import {
  collectProjectFiles,
  createProjectFileRegionIndex,
  defaultProjectFileSelection
} from "@zxyycom/vibe-check";
import fastGlob from "fast-glob";

import type { ProjectGateSelection } from "../runtime/controls.ts";
import {
  isProjectGateFileScope,
  PROJECT_GATE_SCOPE_FILES,
  projectGateMetricScopes,
  type ProjectGateMetric
} from "../runtime/scope-files.ts";
import type { RepositoryQualityCheckOptions } from "./repository-quality.ts";

const metricInputScopes = {
  duplicateDetection: "duplicate-input",
  fileMetrics: "file-metrics-input",
  functionMetrics: "function-input"
} as const;

/** Narrows actual scanner inputs, retaining the original policy/comparison area IDs. */
export function scopedRepositoryQualityOptions(
  options: RepositoryQualityCheckOptions,
  selection: ProjectGateSelection | undefined,
  projectRoot: string
): RepositoryQualityCheckOptions {
  if (selection?.kind !== "scoped") return options;
  return {
    ...options,
    duplicateDetection: scopeMetric(
      options.duplicateDetection,
      "duplicateDetection",
      selection,
      projectRoot
    ),
    fileMetrics: scopeMetric(options.fileMetrics, "fileMetrics", selection, projectRoot),
    functionMetrics: scopeMetric(options.functionMetrics, "functionMetrics", selection, projectRoot)
  };
}

interface MetricArea {
  readonly files: { readonly patterns?: readonly string[]; readonly useDefaultExcludes?: boolean };
}

function scopeMetric<T extends { readonly codeAreas?: Readonly<Record<string, MetricArea>> }>(
  options: T,
  metric: ProjectGateMetric,
  selection: Extract<ProjectGateSelection, { kind: "scoped" }>,
  projectRoot: string
): T {
  if (selection.scopes.includes(metricInputScopes[metric])) return options;
  const applicable = projectGateMetricScopes(metric);
  const scopes = selection.scopes
    .filter(isProjectGateFileScope)
    .filter((scope) => applicable.includes(scope));
  if (scopes.length === 0) return options;
  const codeAreas = Object.fromEntries(
    Object.entries(options.codeAreas ?? {}).map(([id, area]) => {
      const files = collectProjectFiles({
        projectRoot,
        selection: {
          ...area.files,
          patterns: area.files.patterns ?? defaultProjectFileSelection.patterns
        }
      });
      const index = createProjectFileRegionIndex({
        fileSources: [files],
        regionSources: [
          scopes.map((scope) => ({
            id: scope,
            kind: "patterns" as const,
            patterns: PROJECT_GATE_SCOPE_FILES[scope].patterns
          }))
        ]
      });
      const selected = index.filePaths.filter(
        (path) => (index.regionsForFile(path)?.length ?? 0) > 0
      );
      return [
        id,
        {
          ...area,
          files: { ...area.files, patterns: selected.map((path) => fastGlob.escapePath(path)) }
        }
      ];
    })
  );
  return { ...options, codeAreas };
}

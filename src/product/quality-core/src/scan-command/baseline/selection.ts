import {
  gitCommitDate as readGitCommitDate,
  gitCommitTitle as readGitCommitTitle
} from "../../../../foundation/src/index.ts";
import type { QualityScanOptions } from "../command-model.ts";
import type { ResolvedQualityConfig, QualityMetrics, ToolInfo } from "../../model/schema.ts";

type ChangeScope = {
  changed: boolean;
  changedFiles: string[];
};

export function configureBaseline({
  metrics,
  config,
  opts,
  tools,
  root
}: {
  config: ResolvedQualityConfig;
  metrics: QualityMetrics;
  opts: QualityScanOptions;
  root: string;
  tools: ToolInfo[];
}): void {
  if (opts.baselineCommitSha) {
    metrics.baseline = createExplicitBaseline({
      configVersion: config.version,
      commitSha: opts.baselineCommitSha,
      tools,
      root
    });
    return;
  }

  console.log("Skipping baseline scan (default; use --baseline <revision> to compare).");
  metrics.baseline = {
    status: "baseline-skipped",
    commitSha: null,
    commitDate: null,
    metadata: null
  };
}

export function setComparisonStatus(metrics: QualityMetrics, scope: ChangeScope): void {
  if (metrics.baseline.status === "generated" && metrics.baseline.commitSha) {
    if (!scope.changed) {
      metrics.comparisonStatus = "input-unchanged";
      console.log("  Comparison: input-unchanged (text-only or non-scan-input change)");
    } else {
      metrics.comparisonStatus = "compared";
      console.log(`  Comparison: ${scope.changedFiles.length} files changed in scan scope`);
    }
  } else {
    metrics.comparisonStatus = "baseline-unavailable";
    console.log("  Comparison: baseline-unavailable");
  }
}

type ExplicitBaselineOptions = {
  commitSha: string;
  configVersion: string;
  root: string;
  tools: ToolInfo[];
};

function createExplicitBaseline(
  options: ExplicitBaselineOptions
): QualityMetrics["baseline"] {
  const { commitSha, tools, root } = options;
  const commitDate = readGitCommitDate(commitSha, root);
  const commitTitle = readGitCommitTitle(commitSha, root);
  return {
    status: "generated",
    commitSha,
    commitDate,
    metadata: {
      commitSha,
      commitDate: commitDate || "unknown",
      commitTitle,
      selectionReason: "explicit",
      configVersion: options.configVersion,
      toolMetadata: tools
    }
  };
}

/**
 * Current revision quality scan runner.
 */

import { buildAggregates } from "../aggregate.ts";
import { checkJscpd } from "../scanners/tool-availability/jscpd.ts";
import { checkLizard } from "../scanners/tool-availability/lizard.ts";
import { checkScc } from "../scanners/tool-availability/scc.ts";
import { selectLizardTargetFiles } from "../metrics.ts";
import {
  runJscpdScan,
  selectJscpdTargetFileMap
} from "./jscpd.ts";
import { runLizardScan } from "./lizard.ts";
import { runSccScan } from "./scc.ts";
import type { ScanContext } from "./scan-context.ts";
import type { CapabilityResult } from "../../model/scan-completeness.ts";
import type {
  CodeAreaFileMap,
  QualityConfig,
  ToolAvailability
} from "../../model/schema.ts";
import type { QualityScanProfile } from "../../scan-command/command-model.ts";

export async function runCurrentRevisionScan({
  context,
  scanFiles,
  fileMap,
  scanProfile
}: {
  context: ScanContext;
  fileMap: CodeAreaFileMap;
  scanProfile: QualityScanProfile;
  scanFiles: string[];
}): Promise<CapabilityResult[]> {
  const lizardTargetFiles = selectLizardTargetFiles(scanFiles, context.config);
  const jscpdTargetFileMap: CodeAreaFileMap = scanProfile === "full"
    ? selectJscpdTargetFileMap(fileMap, context.config)
    : new Map<string, string[]>();
  context.toolResults.push(...await resolveEligibleTools({
    config: context.config,
    jscpdTargetFileMap,
    lizardTargetFiles,
    root: context.root,
    scanFiles
  }));

  const capabilityResults: CapabilityResult[] = [
    runSccScan(context, scanFiles),
    runLizardScan(context, lizardTargetFiles)
  ];
  if (scanProfile === "full") {
    capabilityResults.push(await runJscpdScan(context, jscpdTargetFileMap));
  } else {
    console.log("Skipping jscpd duplicate detection for quick quality check");
    capabilityResults.push({
      capabilityId: "duplicate-detection",
      status: "skipped"
    });
  }

  context.metrics.aggregates = buildAggregates({
    fileMetrics: context.metrics.fileMetrics,
    functionMetrics: context.metrics.functionMetrics,
    duplicateCode: context.metrics.duplicateCode,
    byLanguage: context.metrics.aggregates.byLanguage,
    config: context.config
  });

  return capabilityResults;
}

export async function resolveEligibleTools({
  config,
  jscpdTargetFileMap,
  lizardTargetFiles,
  root,
  scanFiles
}: {
  config: QualityConfig;
  jscpdTargetFileMap: CodeAreaFileMap;
  lizardTargetFiles: string[];
  root: string;
  scanFiles: string[];
}): Promise<ToolAvailability[]> {
  const checks: Array<Promise<ToolAvailability>> = [];
  if (lizardTargetFiles.length > 0) {
    checks.push(checkLizard(root, config.tools.lizard));
  }
  if (scanFiles.length > 0) {
    checks.push(checkScc(root, config.tools.scc));
  }
  if (jscpdTargetFileMap.size > 0) {
    checks.push(checkJscpd(root, config.tools.jscpd));
  }

  console.log("Checking tool availability...");
  const toolResults = await Promise.all(checks);
  const availableTools = toolResults.filter((tool) => tool.available);
  console.log(`  Available: ${availableTools.map((tool) => tool.name).join(", ") || "none"}`);
  for (const tool of toolResults) {
    if (!tool.available) {
      console.log(`  ❌ ${tool.name} validation failed: ${tool.error || "not found"}`);
    }
  }
  return toolResults;
}

import type {
  BaselineMetadata,
  GateResult,
  QualityMetrics,
  ScanMetadata,
  ToolInfo,
  WarningRecord
} from "../../model/schema.ts";
import type { CapabilityResult } from "../../model/scan-completeness.ts";
import {
  MACHINE_METRICS_V1_IDENTITY,
  MACHINE_WARNING_V1_IDENTITY,
  type MachineMetricsV1,
  type MachineWarningV1
} from "./schema.ts";
import { mapAggregates } from "./mapper-aggregates.ts";
import {
  mapDuplicateCodeFragment,
  mapFileMetric,
  mapFingerprints,
  mapFunctionMetric,
  mapTrendDelta
} from "./mapper-measurements.ts";

type MachineBaselineMetadata = Exclude<
  MachineMetricsV1["baseline"]["metadata"],
  null
>;
type MachineCapabilityResult =
  MachineMetricsV1["scanCompleteness"]["capabilities"][number];
type MachineGateResult = MachineMetricsV1["gate"];
type MachineScanMetadata = MachineMetricsV1["metadata"];
type MachineToolInfo = MachineScanMetadata["tools"][number];

export function projectMachineMetricsV1(
  metrics: QualityMetrics
): MachineMetricsV1 {
  const projected: MachineMetricsV1 = {
    aggregates: mapAggregates(metrics.aggregates),
    baseline: {
      commitDate: metrics.baseline.commitDate,
      commitSha: metrics.baseline.commitSha,
      metadata: metrics.baseline.metadata === null
        ? null
        : mapBaselineMetadata(metrics.baseline.metadata),
      status: metrics.baseline.status as MachineMetricsV1["baseline"]["status"]
    },
    comparisonStatus:
      metrics.comparisonStatus as MachineMetricsV1["comparisonStatus"],
    currentFingerprints: mapFingerprints(metrics.currentFingerprints),
    duplicateCode: metrics.duplicateCode.map(mapDuplicateCodeFragment),
    fileMetrics: metrics.fileMetrics.map(mapFileMetric),
    functionMetrics: metrics.functionMetrics.map(mapFunctionMetric),
    gate: mapGateResult(metrics.gate),
    metadata: mapScanMetadata(metrics.metadata),
    scanCompleteness: {
      capabilities: metrics.scanCompleteness.capabilities.map(
        mapCapabilityResult
      ),
      overall: metrics.scanCompleteness.overall
    },
    trends: metrics.trends.map(mapTrendDelta),
    warnings: {
      all: metrics.warnings.all.map(projectMachineWarningV1),
      changed: metrics.warnings.changed.map(projectMachineWarningV1),
      regressions: metrics.warnings.regressions.map(projectMachineWarningV1)
    }
  };

  if (metrics.baselineFingerprints !== undefined) {
    projected.baselineFingerprints = mapFingerprints(
      metrics.baselineFingerprints
    );
  }
  return projected;
}

export function projectMachineWarningV1(
  warning: WarningRecord
): MachineWarningV1 {
  const projected: MachineWarningV1 = {
    baselineValue: warning.baselineValue,
    codeArea: warning.codeArea,
    comparisonBasis: warning.comparisonBasis,
    deltaValue: warning.deltaValue,
    isChanged: warning.isChanged,
    level: warning.level as MachineWarningV1["level"],
    line: warning.line,
    message: warning.message,
    metric: warning.metric,
    path: warning.path,
    ruleId: warning.ruleId,
    schemaVersion: MACHINE_WARNING_V1_IDENTITY,
    sourceTool: warning.sourceTool,
    value: warning.value
  };

  if (warning.acceptedReason !== undefined) {
    projected.acceptedReason = warning.acceptedReason;
  }
  if (warning.suggestion !== undefined) {
    projected.suggestion = warning.suggestion;
  }
  return projected;
}

function mapBaselineMetadata(
  metadata: BaselineMetadata
): MachineBaselineMetadata {
  return {
    commitDate: metadata.commitDate,
    commitSha: metadata.commitSha,
    commitTitle: metadata.commitTitle,
    configVersion: metadata.configVersion,
    selectionReason: metadata.selectionReason,
    toolMetadata: metadata.toolMetadata.map(mapToolInfo)
  };
}

function mapCapabilityResult(
  result: CapabilityResult
): MachineCapabilityResult {
  if (result.status !== "failed") {
    return {
      capabilityId: result.capabilityId,
      status: result.status
    } as MachineCapabilityResult;
  }
  return {
    capabilityId: result.capabilityId,
    diagnostic: {
      action: result.diagnostic.action,
      kind: result.diagnostic.kind,
      message: result.diagnostic.message
    },
    status: "failed"
  };
}

function mapGateResult(gate: GateResult): MachineGateResult {
  if (gate.status === "disabled") {
    return {
      policy: null,
      status: "disabled"
    };
  }
  if (gate.status === "not-evaluated") {
    return {
      policy: gate.policy,
      reasonCode: gate.reasonCode,
      status: "not-evaluated"
    };
  }
  return {
    blockingWarningCount: gate.blockingWarningCount,
    blockingWarnings: gate.blockingWarnings.map(projectMachineWarningV1),
    evaluatedChannel: gate.evaluatedChannel,
    evaluatedWarningCount: gate.evaluatedWarningCount,
    policy: gate.policy,
    status: gate.status
  } as MachineGateResult;
}

function mapScanMetadata(metadata: ScanMetadata): MachineScanMetadata {
  const projected: MachineScanMetadata = {
    commitSha: metadata.commitSha,
    commitTitle: metadata.commitTitle,
    configVersion: metadata.configVersion,
    repository: metadata.repository,
    schemaVersion: MACHINE_METRICS_V1_IDENTITY,
    scope: {
      excludeDirs: [...metadata.scope.excludeDirs],
      generatedFiles: [...metadata.scope.generatedFiles],
      include: [...metadata.scope.include]
    },
    timestamp: metadata.timestamp,
    tools: metadata.tools.map(mapToolInfo)
  };
  if (metadata.commitDate !== undefined) {
    projected.commitDate = metadata.commitDate;
  }
  return projected;
}

function mapToolInfo(tool: ToolInfo): MachineToolInfo {
  return {
    name: tool.name,
    source: tool.source,
    version: tool.version
  };
}

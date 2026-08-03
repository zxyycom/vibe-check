import type {
  AggregateMetrics,
  BaselineMetadata,
  CodeAreaAggregate,
  CodeAreaFingerprint,
  DuplicateCodeFragment,
  DuplicateCodeLocation,
  FileMetric,
  FunctionMetric,
  GateResult,
  LanguageAggregate,
  MetricValue,
  QualityMetrics,
  ScanMetadata,
  ToolInfo,
  TrendDelta,
  WarningRecord
} from "../../model/schema.ts";
import type { CapabilityResult } from "../../model/scan-completeness.ts";
import {
  MACHINE_METRICS_V1_IDENTITY,
  MACHINE_WARNING_V1_IDENTITY,
  type MachineMetricsV1,
  type MachineWarningV1
} from "./schema.ts";

type MachineAggregateMetrics = MachineMetricsV1["aggregates"];
type MachineBaselineMetadata = Exclude<
  MachineMetricsV1["baseline"]["metadata"],
  null
>;
type MachineCapabilityResult =
  MachineMetricsV1["scanCompleteness"]["capabilities"][number];
type MachineCodeAreaAggregate =
  MachineMetricsV1["aggregates"]["byCodeArea"][number];
type MachineCodeAreaFingerprint =
  MachineMetricsV1["currentFingerprints"][string];
type MachineDuplicateCodeFragment = MachineMetricsV1["duplicateCode"][number];
type MachineDuplicateCodeLocation =
  MachineDuplicateCodeFragment["locations"][number];
type MachineFileMetric = MachineMetricsV1["fileMetrics"][number];
type MachineFunctionMetric = MachineMetricsV1["functionMetrics"][number];
type MachineGateResult = MachineMetricsV1["gate"];
type MachineLanguageAggregate =
  MachineMetricsV1["aggregates"]["byLanguage"][number];
type MachineMetricValue = MachineFileMetric["decisionTokens"];
type MachineScanMetadata = MachineMetricsV1["metadata"];
type MachineToolInfo = MachineScanMetadata["tools"][number];
type MachineTrendDelta = MachineMetricsV1["trends"][number];

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

function mapAggregates(aggregates: AggregateMetrics): MachineAggregateMetrics {
  const overall: MachineAggregateMetrics["overall"] = {
    totalCodeLines: aggregates.overall.totalCodeLines,
    totalFiles: aggregates.overall.totalFiles,
    totalFunctions: aggregates.overall.totalFunctions,
    totalLines: aggregates.overall.totalLines
  };
  if (aggregates.overall.totalDuplicateFragments !== undefined) {
    overall.totalDuplicateFragments =
      aggregates.overall.totalDuplicateFragments;
  }
  if (aggregates.overall.totalFileDecisionTokens !== undefined) {
    overall.totalFileDecisionTokens =
      aggregates.overall.totalFileDecisionTokens;
  }
  if (aggregates.overall.totalFunctionCyclomaticComplexity !== undefined) {
    overall.totalFunctionCyclomaticComplexity =
      aggregates.overall.totalFunctionCyclomaticComplexity;
  }
  if (aggregates.overall.totalFunctionLines !== undefined) {
    overall.totalFunctionLines = aggregates.overall.totalFunctionLines;
  }
  if (aggregates.overall.totalFunctionParameters !== undefined) {
    overall.totalFunctionParameters =
      aggregates.overall.totalFunctionParameters;
  }

  return {
    byCodeArea: aggregates.byCodeArea.map(mapCodeAreaAggregate),
    byLanguage: aggregates.byLanguage.map(mapLanguageAggregate),
    overall
  };
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

function mapCodeAreaAggregate(
  aggregate: CodeAreaAggregate
): MachineCodeAreaAggregate {
  const projected: MachineCodeAreaAggregate = {
    codeArea: aggregate.codeArea,
    files: aggregate.files,
    functions: aggregate.functions,
    lines: aggregate.lines,
    warningPolicy:
      aggregate.warningPolicy as MachineCodeAreaAggregate["warningPolicy"]
  };
  if (aggregate.codeLines !== undefined) {
    projected.codeLines = aggregate.codeLines;
  }
  if (aggregate.cyclomaticComplexity !== undefined) {
    projected.cyclomaticComplexity = aggregate.cyclomaticComplexity;
  }
  if (aggregate.duplicateFragments !== undefined) {
    projected.duplicateFragments = aggregate.duplicateFragments;
  }
  if (aggregate.fileDecisionTokens !== undefined) {
    projected.fileDecisionTokens = aggregate.fileDecisionTokens;
  }
  if (aggregate.functionLines !== undefined) {
    projected.functionLines = aggregate.functionLines;
  }
  if (aggregate.parameterCount !== undefined) {
    projected.parameterCount = aggregate.parameterCount;
  }
  return projected;
}

function mapFingerprints(
  fingerprints: Readonly<Record<string, CodeAreaFingerprint>>
): Record<string, MachineCodeAreaFingerprint> {
  const projected: Record<string, MachineCodeAreaFingerprint> = {};
  for (const [codeArea, fingerprint] of Object.entries(fingerprints)) {
    projected[codeArea] = mapFingerprint(fingerprint);
  }
  return projected;
}

function mapFingerprint(
  fingerprint: CodeAreaFingerprint
): MachineCodeAreaFingerprint {
  return {
    fileCount: fingerprint.fileCount,
    fileList: [...fingerprint.fileList],
    fingerprint: fingerprint.fingerprint
  };
}

function mapDuplicateCodeFragment(
  fragment: DuplicateCodeFragment
): MachineDuplicateCodeFragment {
  return {
    codeAreas: [...fragment.codeAreas],
    hitsChangedScope: fragment.hitsChangedScope,
    id: fragment.id,
    lineCount: fragment.lineCount,
    locations: fragment.locations.map(mapDuplicateCodeLocation),
    tokenCount: fragment.tokenCount
  };
}

function mapDuplicateCodeLocation(
  location: DuplicateCodeLocation
): MachineDuplicateCodeLocation {
  return {
    codeArea: location.codeArea,
    endLine: location.endLine,
    path: location.path,
    startLine: location.startLine
  };
}

function mapFileMetric(metric: FileMetric): MachineFileMetric {
  const projected: MachineFileMetric = {
    codeArea: metric.codeArea,
    decisionTokens: mapMetricValue(metric.decisionTokens),
    isChanged: metric.isChanged,
    language: metric.language,
    lines: metric.lines,
    path: metric.path
  };
  if (metric.blankLines !== undefined) {
    projected.blankLines = metric.blankLines;
  }
  if (metric.codeLines !== undefined) {
    projected.codeLines = metric.codeLines;
  }
  if (metric.commentLines !== undefined) {
    projected.commentLines = metric.commentLines;
  }
  return projected;
}

function mapFunctionMetric(metric: FunctionMetric): MachineFunctionMetric {
  return {
    codeArea: metric.codeArea,
    cyclomaticComplexity: mapMetricValue(metric.cyclomaticComplexity),
    endLine: metric.endLine,
    file: metric.file,
    isChanged: metric.isChanged,
    lines: metric.lines,
    name: metric.name,
    parameterCount: metric.parameterCount,
    startLine: metric.startLine
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

function mapLanguageAggregate(
  aggregate: LanguageAggregate
): MachineLanguageAggregate {
  const projected: MachineLanguageAggregate = {
    blankLines: aggregate.blankLines,
    codeLines: aggregate.codeLines,
    commentLines: aggregate.commentLines,
    files: aggregate.files,
    language: aggregate.language,
    lines: aggregate.lines
  };
  if (aggregate.comments !== undefined) {
    projected.comments = aggregate.comments;
  }
  return projected;
}

function mapMetricValue(metric: MetricValue): MachineMetricValue {
  return {
    source: metric.source,
    value: metric.value
  };
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

function mapTrendDelta(trend: TrendDelta): MachineTrendDelta {
  return {
    baseline: trend.baseline,
    current: trend.current,
    delta: trend.delta,
    metric: trend.metric,
    percentChange: trend.percentChange,
    unit: trend.unit
  };
}

import type {
  CodeAreaFingerprint,
  DuplicateCodeFragment,
  DuplicateCodeLocation,
  FileMetric,
  FunctionMetric,
  MetricValue,
  TrendDelta
} from "../../model/schema.ts";
import type { MachineMetricsV1 } from "./schema.ts";

type MachineCodeAreaFingerprint =
  MachineMetricsV1["currentFingerprints"][string];
type MachineDuplicateCodeFragment = MachineMetricsV1["duplicateCode"][number];
type MachineDuplicateCodeLocation =
  MachineDuplicateCodeFragment["locations"][number];
type MachineFileMetric = MachineMetricsV1["fileMetrics"][number];
type MachineFunctionMetric = MachineMetricsV1["functionMetrics"][number];
type MachineMetricValue = MachineFileMetric["decisionTokens"];
type MachineTrendDelta = MachineMetricsV1["trends"][number];

export function mapFingerprints(
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

export function mapDuplicateCodeFragment(
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

export function mapFileMetric(metric: FileMetric): MachineFileMetric {
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

export function mapFunctionMetric(metric: FunctionMetric): MachineFunctionMetric {
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

function mapMetricValue(metric: MetricValue): MachineMetricValue {
  return {
    source: metric.source,
    value: metric.value
  };
}

export function mapTrendDelta(trend: TrendDelta): MachineTrendDelta {
  return {
    baseline: trend.baseline,
    current: trend.current,
    delta: trend.delta,
    metric: trend.metric,
    percentChange: trend.percentChange,
    unit: trend.unit
  };
}

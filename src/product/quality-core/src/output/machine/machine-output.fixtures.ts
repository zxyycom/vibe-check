import type { MachineWarningV1 } from "../../../../machine-output.ts";
import type { WarningRecord } from "../../model/schema.ts";
import {
  RICH_CORE_METRICS_TEMPLATE,
  type RichCoreMetrics
} from "./machine-output-core-metrics.fixtures.ts";

interface CoreWarningOptions {
  acceptedReason?: string;
  baselineValue?: number | null;
  deltaValue?: number | null;
  isChanged?: boolean;
  line?: number | null;
  privateSourceState?: string;
  ruleId: string;
  suggestion?: string;
  value?: number;
}

interface MachineWarningOptions {
  acceptedReason?: string;
  baselineValue?: number | null;
  deltaValue?: number | null;
  isChanged?: boolean;
  line?: number | null;
  ruleId: string;
  suggestion?: string;
  value?: number;
}

export function coreWarning(
  options: CoreWarningOptions
): WarningRecord & { privateSourceState?: string } {
  const {
    acceptedReason,
    baselineValue = null,
    deltaValue = null,
    isChanged = false,
    line = null,
    privateSourceState,
    ruleId,
    suggestion,
    value = 7
  } = options;
  return {
    ...(acceptedReason === undefined ? {} : { acceptedReason }),
    baselineValue,
    codeArea: "src",
    comparisonBasis: "absolute",
    deltaValue,
    isChanged,
    level: "warning",
    line,
    message: "Example warning.",
    metric: "cyclomatic-complexity",
    path: "src/example.ts",
    ...(privateSourceState === undefined ? {} : { privateSourceState }),
    ruleId,
    sourceTool: "lizard",
    ...(suggestion === undefined ? {} : { suggestion }),
    value
  };
}

export function machineWarning(options: MachineWarningOptions): MachineWarningV1 {
  const {
    acceptedReason,
    baselineValue = null,
    deltaValue = null,
    isChanged = false,
    line = null,
    ruleId,
    suggestion,
    value = 7
  } = options;
  return {
    ...(acceptedReason === undefined ? {} : { acceptedReason }),
    baselineValue,
    codeArea: "src",
    comparisonBasis: "absolute",
    deltaValue,
    isChanged,
    level: "warning",
    line,
    message: "Example warning.",
    metric: "cyclomatic-complexity",
    path: "src/example.ts",
    ruleId,
    schemaVersion: "vibe-check.warning.v1",
    sourceTool: "lizard",
    ...(suggestion === undefined ? {} : { suggestion }),
    value
  };
}

export function richCoreMetrics(
  primaryWarning: WarningRecord,
  acceptedWarning: WarningRecord
): RichCoreMetrics {
  const metrics = structuredClone(RICH_CORE_METRICS_TEMPLATE);
  metrics.gate = {
    blockingWarningCount: 1,
    blockingWarnings: [primaryWarning],
    evaluatedChannel: "all",
    evaluatedWarningCount: 2,
    policy: "all",
    status: "failed"
  };
  metrics.warnings = {
    all: [primaryWarning, acceptedWarning],
    changed: [acceptedWarning, primaryWarning],
    regressions: [acceptedWarning]
  };
  return metrics;
}

export function collectSchemaRefs(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.flatMap((item) => collectSchemaRefs(item));
  }
  if (!isRecord(value)) return [];
  return [
    ...(typeof value.$ref === "string" ? [value.$ref] : []),
    ...Object.values(value).flatMap((item) => collectSchemaRefs(item))
  ];
}

export function collectTypedSchemaNodes(
  value: unknown,
  type: "array" | "object"
): Array<Record<string, unknown>> {
  if (Array.isArray(value)) {
    return value.flatMap((item) => collectTypedSchemaNodes(item, type));
  }
  if (!isRecord(value)) return [];
  return [
    ...(value.type === type ? [value] : []),
    ...Object.values(value).flatMap((item) =>
      collectTypedSchemaNodes(item, type)
    )
  ];
}

export function collectPropertySchemas(value: unknown): Array<Record<string, unknown>> {
  if (Array.isArray(value)) {
    return value.flatMap((item) => collectPropertySchemas(item));
  }
  if (!isRecord(value)) return [];
  const direct = isRecord(value.properties)
    ? Object.values(value.properties).filter(isRecord)
    : [];
  return [
    ...direct,
    ...Object.values(value).flatMap((item) => collectPropertySchemas(item))
  ];
}

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function schemaRecord(value: unknown): Record<string, unknown> {
  if (!isRecord(value)) {
    throw new TypeError("Expected a JSON Schema object.");
  }
  return value;
}

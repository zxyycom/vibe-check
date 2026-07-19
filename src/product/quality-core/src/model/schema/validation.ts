import { isRecord, isUnknownArray } from "../../../../foundation/src/index.ts";
import {
  SCAN_CAPABILITY_IDS,
  reduceScanCompleteness,
  type CapabilityFailureDiagnostic,
  type CapabilityFailureKind,
  type CapabilityResult,
  type ScanCapabilityId,
  type ScanCompleteness
} from "../scan-completeness.ts";
import {
  BASELINE_STATUSES,
  COMPARISON_STATUSES,
  METRICS_SCHEMA_VERSION
} from "./types.ts";
import type { MetricsValidationResult } from "./types.ts";
import { validateWarningChannels } from "./warning-validation.ts";

const CAPABILITY_RESULT_STATUSES = ["skipped", "no-input", "succeeded", "failed"] as const;
const CAPABILITY_FAILURE_KINDS = ["unavailable", "execution", "invalid-result"] as const;
const SCAN_COMPLETENESS_STATUSES = ["complete", "empty", "failed"] as const;

/**
 * 验证 metrics 对象是否符合 QualityMetrics schema。
 * 仅做结构检查，不深度验证数值语义。
 */
export function validateMetrics(metrics: unknown): MetricsValidationResult {
  const errors: string[] = [];

  if (!isRecord(metrics)) {
    return { valid: false, errors: ["metrics must be a non-null object"] };
  }

  validateMetadata(metrics.metadata, errors);
  validateBaseline(metrics.baseline, errors);
  validateScanCompleteness(metrics.scanCompleteness, errors);
  validateStatusField(
    metrics.comparisonStatus,
    COMPARISON_STATUSES,
    "comparisonStatus",
    errors
  );
  validateRequiredObjects(metrics, errors);
  validateMetricArrays(metrics, errors);
  validateWarningChannels(metrics.warnings, errors);

  return { valid: errors.length === 0, errors };
}

function validateScanCompleteness(value: unknown, errors: string[]): void {
  if (!isRecord(value)) {
    errors.push("scanCompleteness is required");
    return;
  }

  validateStatusField(
    value.overall,
    SCAN_COMPLETENESS_STATUSES,
    "scanCompleteness.overall",
    errors
  );
  if (!Array.isArray(value.capabilities)) {
    errors.push("scanCompleteness.capabilities must be an array");
    return;
  }

  const seenIds = new Set<ScanCapabilityId>();
  const validResults: CapabilityResult[] = [];
  for (const [index, result] of value.capabilities.entries()) {
    const fieldName = `scanCompleteness.capabilities[${index}]`;
    if (!isRecord(result)) {
      errors.push(`${fieldName} must be an object`);
      continue;
    }

    const capabilityId = result.capabilityId;
    if (!isScanCapabilityId(capabilityId)) {
      errors.push(`${fieldName}.capabilityId: unknown capability ID "${capabilityId}"`);
      continue;
    }
    if (seenIds.has(capabilityId)) {
      errors.push(`${fieldName}.capabilityId: duplicate capability ID "${capabilityId}"`);
    }
    seenIds.add(capabilityId);

    const status = result.status;
    if (!isCapabilityResultStatus(status)) {
      validateStatusField(status, CAPABILITY_RESULT_STATUSES, `${fieldName}.status`, errors);
      continue;
    }
    if (status === "failed") {
      const diagnostic = validateFailureDiagnostic(result.diagnostic, fieldName, errors);
      if (diagnostic) {
        validResults.push({ capabilityId, diagnostic, status });
      }
      continue;
    }
    validResults.push({ capabilityId, status });
  }

  for (const capabilityId of SCAN_CAPABILITY_IDS) {
    if (!seenIds.has(capabilityId)) {
      errors.push(`scanCompleteness.capabilities: missing capability ID "${capabilityId}"`);
    }
  }

  if (
    isScanCompleteness(value.overall) &&
    seenIds.size === SCAN_CAPABILITY_IDS.length &&
    validResults.length === SCAN_CAPABILITY_IDS.length
  ) {
    const expected = reduceScanCompleteness(validResults);
    if (value.overall !== expected) {
      errors.push(
        `scanCompleteness.overall: expected "${expected}" from capability results, got "${value.overall}"`
      );
    }
  }
}

function validateFailureDiagnostic(
  value: unknown,
  resultFieldName: string,
  errors: string[]
): CapabilityFailureDiagnostic | null {
  const fieldName = `${resultFieldName}.diagnostic`;
  if (!isRecord(value)) {
    errors.push(`${fieldName} is required for failed capability results`);
    return null;
  }

  let valid = true;
  if (!isCapabilityFailureKind(value.kind)) {
    validateStatusField(value.kind, CAPABILITY_FAILURE_KINDS, `${fieldName}.kind`, errors);
    valid = false;
  }
  if (!isNonEmptyString(value.message)) {
    errors.push(`${fieldName}.message must be a non-empty string`);
    valid = false;
  }
  if (!isNonEmptyString(value.action)) {
    errors.push(`${fieldName}.action must be a non-empty string`);
    valid = false;
  }

  if (!valid) return null;
  return {
    action: value.action as string,
    kind: value.kind as CapabilityFailureKind,
    message: value.message as string
  };
}

function isCapabilityResultStatus(
  value: unknown
): value is CapabilityResult["status"] {
  return typeof value === "string" && CAPABILITY_RESULT_STATUSES.includes(
    value as CapabilityResult["status"]
  );
}

function isCapabilityFailureKind(value: unknown): value is CapabilityFailureKind {
  return typeof value === "string" && CAPABILITY_FAILURE_KINDS.includes(
    value as CapabilityFailureKind
  );
}

function isScanCapabilityId(value: unknown): value is ScanCapabilityId {
  return typeof value === "string" && SCAN_CAPABILITY_IDS.includes(
    value as ScanCapabilityId
  );
}

function isScanCompleteness(value: unknown): value is ScanCompleteness {
  return typeof value === "string" && SCAN_COMPLETENESS_STATUSES.includes(
    value as ScanCompleteness
  );
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function validateMetadata(metadata: unknown, errors: string[]): void {
  if (!isRecord(metadata)) {
    errors.push("metrics.metadata is required");
    return;
  }

  validateExactValue(
    metadata.schemaVersion,
    METRICS_SCHEMA_VERSION,
    "metadata.schemaVersion",
    errors
  );
  requireTruthyField(metadata.timestamp, "metadata.timestamp", errors);
  requireTruthyField(metadata.repository, "metadata.repository", errors);
  requireTruthyField(metadata.commitSha, "metadata.commitSha", errors);
  requireArrayField(metadata.tools, "metadata.tools", errors);
  requireRecordField(metadata.scope, "metadata.scope", errors);
  requireTruthyField(metadata.configVersion, "metadata.configVersion", errors);
}

function validateBaseline(baseline: unknown, errors: string[]): void {
  if (!isRecord(baseline)) {
    errors.push("metrics.baseline is required");
    return;
  }

  validateStatusField(baseline.status, BASELINE_STATUSES, "baseline.status", errors);
}

function validateRequiredObjects(metrics: Record<string, unknown>, errors: string[]): void {
  requireRecordField(metrics.currentFingerprints, "currentFingerprints", errors);
  requireRecordField(metrics.aggregates, "aggregates", errors);
}

function validateMetricArrays(metrics: Record<string, unknown>, errors: string[]): void {
  requireUnknownArrayField(metrics.fileMetrics, "fileMetrics", errors);
  requireUnknownArrayField(metrics.functionMetrics, "functionMetrics", errors);
  requireUnknownArrayField(metrics.duplicateCode, "duplicateCode", errors);
  requireUnknownArrayField(metrics.trends, "trends", errors);
}

function validateStatusField(
  value: unknown,
  allowedValues: readonly string[],
  fieldName: string,
  errors: string[]
): void {
  if (typeof value === "string" && allowedValues.includes(value)) return;
  errors.push(`${fieldName}: must be one of ${allowedValues.join(", ")}, got "${value}"`);
}

function validateExactValue(
  value: unknown,
  expected: string,
  fieldName: string,
  errors: string[]
): void {
  if (value === expected) return;
  errors.push(`${fieldName}: expected "${expected}", got "${value}"`);
}

function requireTruthyField(value: unknown, fieldName: string, errors: string[]): void {
  if (!value) errors.push(`${fieldName} is required`);
}

function requireArrayField(value: unknown, fieldName: string, errors: string[]): void {
  if (!Array.isArray(value)) errors.push(`${fieldName} must be an array`);
}

function requireRecordField(value: unknown, fieldName: string, errors: string[]): void {
  if (!isRecord(value)) errors.push(`${fieldName} is required`);
}

function requireUnknownArrayField(value: unknown, fieldName: string, errors: string[]): void {
  if (!isUnknownArray(value)) errors.push(`${fieldName} must be an array`);
}

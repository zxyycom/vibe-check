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
  GATE_POLICY_DESCRIPTORS,
  GATE_POLICY_VALUES,
  type GatePolicyDescriptor
} from "../gate-policy.ts";
import {
  BASELINE_STATUSES,
  COMPARISON_STATUSES,
  GATE_NOT_EVALUATED_REASON_CODES,
  GATE_RESULT_STATUSES,
  METRICS_SCHEMA_VERSION
} from "./types.ts";
import type { MetricsValidationResult } from "./types.ts";
import {
  validateWarningChannels,
  validateWarningRecords
} from "./warning-validation.ts";

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
  validateGate(metrics.gate, metrics.warnings, errors);
  validateRequiredObjects(metrics, errors);
  validateMetricArrays(metrics, errors);
  validateWarningChannels(metrics.warnings, errors);

  return { valid: errors.length === 0, errors };
}

function validateGate(
  value: unknown,
  warnings: unknown,
  errors: string[]
): void {
  if (!isRecord(value)) {
    errors.push("gate must be an object");
    return;
  }

  const status = value.status;
  if (!isGateResultStatus(status)) {
    validateStatusField(status, GATE_RESULT_STATUSES, "gate.status", errors);
    return;
  }

  if (status === "disabled") {
    validateExactFields(value, ["policy", "status"], "gate", status, errors);
    if (value.policy !== null) {
      errors.push('gate.policy: must be null when status is "disabled"');
    }
    return;
  }

  if (status === "not-evaluated") {
    validateExactFields(
      value,
      ["policy", "reasonCode", "status"],
      "gate",
      status,
      errors
    );
    validateGatePolicy(value.policy, errors);
    validateStatusField(
      value.reasonCode,
      GATE_NOT_EVALUATED_REASON_CODES,
      "gate.reasonCode",
      errors
    );
    return;
  }

  validateExactFields(
    value,
    [
      "blockingWarningCount",
      "blockingWarnings",
      "evaluatedChannel",
      "evaluatedWarningCount",
      "policy",
      "status"
    ],
    "gate",
    status,
    errors
  );

  const descriptor = validateGatePolicy(value.policy, errors);
  const channelIsKnown = GATE_POLICY_DESCRIPTORS.some(
    ({ evaluatedChannel }) => evaluatedChannel === value.evaluatedChannel
  );
  if (!channelIsKnown) {
    errors.push(
      `gate.evaluatedChannel: must be one of ${GATE_POLICY_DESCRIPTORS
        .map(({ evaluatedChannel }) => evaluatedChannel)
        .join(", ")}, got "${value.evaluatedChannel}"`
    );
  } else if (
    descriptor &&
    descriptor.evaluatedChannel !== value.evaluatedChannel
  ) {
    errors.push(
      `gate.evaluatedChannel: expected "${descriptor.evaluatedChannel}" for policy "${descriptor.value}", got "${value.evaluatedChannel}"`
    );
  }

  const evaluatedCountIsValid = validateNonNegativeInteger(
    value.evaluatedWarningCount,
    "gate.evaluatedWarningCount",
    errors
  );
  const blockingCountIsValid = validateNonNegativeInteger(
    value.blockingWarningCount,
    "gate.blockingWarningCount",
    errors
  );
  const blockingWarnings = isUnknownArray(value.blockingWarnings)
    ? value.blockingWarnings
    : null;
  if (!blockingWarnings) {
    errors.push("gate.blockingWarnings must be an array");
  } else {
    validateWarningRecords(blockingWarnings, "gate.blockingWarnings", errors);
  }

  const selectedWarnings =
    channelIsKnown && isRecord(warnings)
      ? warnings[value.evaluatedChannel as string]
      : undefined;
  if (
    evaluatedCountIsValid &&
    isUnknownArray(selectedWarnings) &&
    value.evaluatedWarningCount !== selectedWarnings.length
  ) {
    errors.push(
      `gate.evaluatedWarningCount: expected ${selectedWarnings.length} from warnings.${value.evaluatedChannel}, got ${value.evaluatedWarningCount}`
    );
  }

  if (
    blockingCountIsValid &&
    blockingWarnings &&
    value.blockingWarningCount !== blockingWarnings.length
  ) {
    errors.push(
      `gate.blockingWarningCount: expected ${blockingWarnings.length} from gate.blockingWarnings, got ${value.blockingWarningCount}`
    );
  }

  if (blockingCountIsValid) {
    if (status === "passed" && value.blockingWarningCount !== 0) {
      errors.push('gate.blockingWarningCount: must be 0 when status is "passed"');
    }
    if (status === "failed" && value.blockingWarningCount === 0) {
      errors.push(
        'gate.blockingWarningCount: must be greater than 0 when status is "failed"'
      );
    }
  }
}

function validateGatePolicy(
  value: unknown,
  errors: string[]
): GatePolicyDescriptor | undefined {
  const descriptor = GATE_POLICY_DESCRIPTORS.find(
    ({ value: policy }) => policy === value
  );
  if (!descriptor) {
    errors.push(
      `gate.policy: must be one of ${GATE_POLICY_VALUES.join(", ")}, got "${value}"`
    );
  }
  return descriptor;
}

function validateExactFields(
  value: Record<string, unknown>,
  allowedFields: readonly string[],
  prefix: string,
  status: string,
  errors: string[]
): void {
  for (const field of allowedFields) {
    if (!Object.hasOwn(value, field)) {
      errors.push(`${prefix}.${field} is required for status "${status}"`);
    }
  }
  for (const field of Object.keys(value)) {
    if (!allowedFields.includes(field)) {
      errors.push(`${prefix}.${field} is not allowed for status "${status}"`);
    }
  }
}

function validateNonNegativeInteger(
  value: unknown,
  fieldName: string,
  errors: string[]
): boolean {
  if (typeof value === "number" && Number.isInteger(value) && value >= 0) {
    return true;
  }
  errors.push(`${fieldName}: must be a non-negative integer, got "${value}"`);
  return false;
}

function isGateResultStatus(
  value: unknown
): value is typeof GATE_RESULT_STATUSES[number] {
  return (
    typeof value === "string" &&
    GATE_RESULT_STATUSES.includes(
      value as typeof GATE_RESULT_STATUSES[number]
    )
  );
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

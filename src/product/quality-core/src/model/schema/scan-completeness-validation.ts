import { isRecord } from "../../../../foundation/src/index.ts";
import {
  SCAN_CAPABILITY_IDS,
  reduceScanCompleteness,
  type CapabilityFailureDiagnostic,
  type CapabilityFailureKind,
  type CapabilityResult,
  type ScanCapabilityId,
  type ScanCompleteness,
} from "../scan-completeness.ts";

const CAPABILITY_RESULT_STATUSES = [
  "skipped",
  "no-input",
  "succeeded",
  "failed",
] as const;
const CAPABILITY_FAILURE_KINDS = [
  "unavailable",
  "execution",
  "invalid-result",
] as const;
const SCAN_COMPLETENESS_STATUSES = ["complete", "empty", "failed"] as const;

export function validateScanCompleteness(
  value: unknown,
  errors: string[],
): void {
  if (!isRecord(value)) {
    errors.push("scanCompleteness is required");
    return;
  }

  validateStatusField(
    value.overall,
    SCAN_COMPLETENESS_STATUSES,
    "scanCompleteness.overall",
    errors,
  );
  if (!Array.isArray(value.capabilities)) {
    errors.push("scanCompleteness.capabilities must be an array");
    return;
  }

  const seenIds = new Set<ScanCapabilityId>();
  const validResults: CapabilityResult[] = [];
  for (const [index, result] of value.capabilities.entries()) {
    validateCapabilityResult({
      errors,
      fieldName: `scanCompleteness.capabilities[${index}]`,
      result,
      seenIds,
      validResults,
    });
  }

  for (const capabilityId of SCAN_CAPABILITY_IDS) {
    if (!seenIds.has(capabilityId)) {
      errors.push(
        `scanCompleteness.capabilities: missing capability ID "${capabilityId}"`,
      );
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
        `scanCompleteness.overall: expected "${expected}" from capability results, got "${value.overall}"`,
      );
    }
  }
}

function validateCapabilityResult(options: {
  errors: string[];
  fieldName: string;
  result: unknown;
  seenIds: Set<ScanCapabilityId>;
  validResults: CapabilityResult[];
}): void {
  const { errors, fieldName, result, seenIds, validResults } = options;
  if (!isRecord(result)) {
    errors.push(`${fieldName} must be an object`);
    return;
  }

  const capabilityId = result.capabilityId;
  if (!isScanCapabilityId(capabilityId)) {
    errors.push(
      `${fieldName}.capabilityId: unknown capability ID "${capabilityId}"`,
    );
    return;
  }
  if (seenIds.has(capabilityId)) {
    errors.push(
      `${fieldName}.capabilityId: duplicate capability ID "${capabilityId}"`,
    );
  }
  seenIds.add(capabilityId);

  const status = result.status;
  if (!isCapabilityResultStatus(status)) {
    validateStatusField(
      status,
      CAPABILITY_RESULT_STATUSES,
      `${fieldName}.status`,
      errors,
    );
    return;
  }
  if (status !== "failed") {
    validResults.push({ capabilityId, status });
    return;
  }

  const diagnostic = validateFailureDiagnostic(
    result.diagnostic,
    fieldName,
    errors,
  );
  if (diagnostic) {
    validResults.push({ capabilityId, diagnostic, status });
  }
}

function validateFailureDiagnostic(
  value: unknown,
  resultFieldName: string,
  errors: string[],
): CapabilityFailureDiagnostic | null {
  const fieldName = `${resultFieldName}.diagnostic`;
  if (!isRecord(value)) {
    errors.push(`${fieldName} is required for failed capability results`);
    return null;
  }

  let valid = true;
  if (!isCapabilityFailureKind(value.kind)) {
    validateStatusField(
      value.kind,
      CAPABILITY_FAILURE_KINDS,
      `${fieldName}.kind`,
      errors,
    );
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
    message: value.message as string,
  };
}

function isCapabilityResultStatus(
  value: unknown,
): value is CapabilityResult["status"] {
  return (
    typeof value === "string" &&
    CAPABILITY_RESULT_STATUSES.includes(value as CapabilityResult["status"])
  );
}

function isCapabilityFailureKind(
  value: unknown,
): value is CapabilityFailureKind {
  return (
    typeof value === "string" &&
    CAPABILITY_FAILURE_KINDS.includes(value as CapabilityFailureKind)
  );
}

function isScanCapabilityId(value: unknown): value is ScanCapabilityId {
  return (
    typeof value === "string" &&
    SCAN_CAPABILITY_IDS.includes(value as ScanCapabilityId)
  );
}

function isScanCompleteness(value: unknown): value is ScanCompleteness {
  return (
    typeof value === "string" &&
    SCAN_COMPLETENESS_STATUSES.includes(value as ScanCompleteness)
  );
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function validateStatusField(
  value: unknown,
  allowedValues: readonly string[],
  fieldName: string,
  errors: string[],
): void {
  if (typeof value === "string" && allowedValues.includes(value)) return;
  errors.push(
    `${fieldName}: must be one of ${allowedValues.join(", ")}, got "${value}"`,
  );
}

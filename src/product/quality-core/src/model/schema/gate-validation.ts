import { isRecord, isUnknownArray } from "../../../../foundation/src/index.ts";
import {
  GATE_POLICY_DESCRIPTORS,
  GATE_POLICY_VALUES,
  type GatePolicyDescriptor,
} from "../gate-policy.ts";
import {
  GATE_NOT_EVALUATED_REASON_CODES,
  GATE_RESULT_STATUSES,
} from "./types.ts";
import { validateWarningRecords } from "./warning-validation.ts";

export function validateGate(
  value: unknown,
  warnings: unknown,
  errors: string[],
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

  switch (status) {
    case "disabled":
      validateDisabledGate(value, errors);
      return;
    case "not-evaluated":
      validateNotEvaluatedGate(value, errors);
      return;
    default:
      validateEvaluatedGate(value, warnings, status, errors);
  }
}

function validateDisabledGate(
  value: Record<string, unknown>,
  errors: string[],
): void {
  validateExactFields(value, ["policy", "status"], "gate", "disabled", errors);
  if (value.policy !== null) {
    errors.push('gate.policy: must be null when status is "disabled"');
  }
}

function validateNotEvaluatedGate(
  value: Record<string, unknown>,
  errors: string[],
): void {
  validateExactFields(
    value,
    ["policy", "reasonCode", "status"],
    "gate",
    "not-evaluated",
    errors,
  );
  validateGatePolicy(value.policy, errors);
  validateStatusField(
    value.reasonCode,
    GATE_NOT_EVALUATED_REASON_CODES,
    "gate.reasonCode",
    errors,
  );
}

function validateEvaluatedGate(
  value: Record<string, unknown>,
  warnings: unknown,
  status: "passed" | "failed",
  errors: string[],
): void {
  validateExactFields(
    value,
    [
      "blockingWarningCount",
      "blockingWarnings",
      "evaluatedChannel",
      "evaluatedWarningCount",
      "policy",
      "status",
    ],
    "gate",
    status,
    errors,
  );

  const descriptor = validateGatePolicy(value.policy, errors);
  const selectedWarnings = validateSelectedWarnings(
    value.evaluatedChannel,
    warnings,
    descriptor,
    errors,
  );

  const countValidation = validateGateWarningCounts(
    value,
    selectedWarnings,
    errors,
  );

  validateBlockingCountForStatus(
    status,
    value.blockingWarningCount,
    countValidation.blockingCountIsValid,
    errors,
  );
}

type GateWarningCountValidation = {
  blockingCountIsValid: boolean;
};

function validateGateWarningCounts(
  value: Record<string, unknown>,
  selectedWarnings: unknown,
  errors: string[],
): GateWarningCountValidation {
  const evaluatedCountIsValid = validateNonNegativeInteger(
    value.evaluatedWarningCount,
    "gate.evaluatedWarningCount",
    errors,
  );
  const blockingCountIsValid = validateNonNegativeInteger(
    value.blockingWarningCount,
    "gate.blockingWarningCount",
    errors,
  );
  const blockingWarnings = validateBlockingWarnings(
    value.blockingWarnings,
    errors,
  );
  validateEvaluatedWarningCount(
    value,
    selectedWarnings,
    evaluatedCountIsValid,
    errors,
  );
  validateBlockingWarningCount(
    value,
    blockingWarnings,
    blockingCountIsValid,
    errors,
  );
  return { blockingCountIsValid };
}

function validateBlockingWarnings(
  value: unknown,
  errors: string[],
): unknown[] | null {
  if (!isUnknownArray(value)) {
    errors.push("gate.blockingWarnings must be an array");
    return null;
  }
  validateWarningRecords(value, "gate.blockingWarnings", errors);
  return value;
}

function validateEvaluatedWarningCount(
  gate: Record<string, unknown>,
  selectedWarnings: unknown,
  evaluatedCountIsValid: boolean,
  errors: string[],
): void {
  if (
    evaluatedCountIsValid &&
    isUnknownArray(selectedWarnings) &&
    gate.evaluatedWarningCount !== selectedWarnings.length
  ) {
    errors.push(
      `gate.evaluatedWarningCount: expected ${selectedWarnings.length} from warnings.${gate.evaluatedChannel}, got ${gate.evaluatedWarningCount}`,
    );
  }
}

function validateBlockingWarningCount(
  gate: Record<string, unknown>,
  blockingWarnings: unknown[] | null,
  blockingCountIsValid: boolean,
  errors: string[],
): void {
  if (
    blockingCountIsValid &&
    blockingWarnings &&
    gate.blockingWarningCount !== blockingWarnings.length
  ) {
    errors.push(
      `gate.blockingWarningCount: expected ${blockingWarnings.length} from gate.blockingWarnings, got ${gate.blockingWarningCount}`,
    );
  }
}

function validateSelectedWarnings(
  value: unknown,
  warnings: unknown,
  policyDescriptor: GatePolicyDescriptor | undefined,
  errors: string[],
): unknown {
  const channelDescriptor = GATE_POLICY_DESCRIPTORS.find(
    ({ evaluatedChannel }) => evaluatedChannel === value,
  );
  if (!channelDescriptor) {
    errors.push(
      `gate.evaluatedChannel: must be one of ${GATE_POLICY_DESCRIPTORS.map(
        ({ evaluatedChannel }) => evaluatedChannel,
      ).join(", ")}, got "${value}"`,
    );
    return undefined;
  }
  if (policyDescriptor && policyDescriptor.evaluatedChannel !== value) {
    errors.push(
      `gate.evaluatedChannel: expected "${policyDescriptor.evaluatedChannel}" for policy "${policyDescriptor.value}", got "${value}"`,
    );
  }
  return isRecord(warnings)
    ? warnings[channelDescriptor.evaluatedChannel]
    : undefined;
}

function validateBlockingCountForStatus(
  status: "passed" | "failed",
  blockingWarningCount: unknown,
  blockingCountIsValid: boolean,
  errors: string[],
): void {
  if (!blockingCountIsValid) {
    return;
  }
  if (status === "passed" && blockingWarningCount !== 0) {
    errors.push('gate.blockingWarningCount: must be 0 when status is "passed"');
  }
  if (status === "failed" && blockingWarningCount === 0) {
    errors.push(
      'gate.blockingWarningCount: must be greater than 0 when status is "failed"',
    );
  }
}

function validateGatePolicy(
  value: unknown,
  errors: string[],
): GatePolicyDescriptor | undefined {
  const descriptor = GATE_POLICY_DESCRIPTORS.find(
    ({ value: policy }) => policy === value,
  );
  if (!descriptor) {
    errors.push(
      `gate.policy: must be one of ${GATE_POLICY_VALUES.join(", ")}, got "${value}"`,
    );
  }
  return descriptor;
}

function validateExactFields(
  value: Record<string, unknown>,
  allowedFields: readonly string[],
  prefix: string,
  status: string,
  errors: string[],
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
  errors: string[],
): boolean {
  if (typeof value === "number" && Number.isInteger(value) && value >= 0) {
    return true;
  }
  errors.push(`${fieldName}: must be a non-negative integer, got "${value}"`);
  return false;
}

function isGateResultStatus(
  value: unknown,
): value is (typeof GATE_RESULT_STATUSES)[number] {
  return (
    typeof value === "string" &&
    GATE_RESULT_STATUSES.includes(
      value as (typeof GATE_RESULT_STATUSES)[number],
    )
  );
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

import type { TLocalizedValidationError } from "typebox/error";

import { isJsonObject } from "./validation-support.ts";

const CAPABILITY_SCHEMA_PATH =
  "#/properties/scanCompleteness/properties/capabilities/items/anyOf/";
const CAPABILITY_INSTANCE_PATH =
  /^\/scanCompleteness\/capabilities\/(\d+)(?:\/|$)/;
const GATE_SCHEMA_PATH = "#/properties/gate/anyOf/";

const CAPABILITY_SCHEMA_BRANCH_BY_STATUS: Readonly<Record<string, number>> = {
  failed: 3,
  "no-input": 1,
  skipped: 0,
  succeeded: 2
};
const GATE_SCHEMA_BRANCH_BY_STATUS: Readonly<Record<string, number>> = {
  disabled: 0,
  failed: 2,
  "not-evaluated": 3,
  passed: 1
};

export function selectMachineMetricsSchemaError(
  errors: readonly TLocalizedValidationError[],
  value: Record<string, unknown>
): TLocalizedValidationError | undefined {
  const first = errors[0];
  if (!first) return undefined;

  // TypeBox flattens every anyOf branch in schema order. These two unions are
  // status-discriminated, so a known instance status identifies the actionable
  // branch; an unknown status points to the discriminator itself.
  const gateError = selectGateSchemaError(errors, value.gate, first);
  if (gateError) return gateError;

  const capabilityError = selectCapabilitySchemaError(errors, value, first);
  return capabilityError ?? first;
}

function selectGateSchemaError(
  errors: readonly TLocalizedValidationError[],
  gate: unknown,
  first: TLocalizedValidationError
): TLocalizedValidationError | null {
  if (
    !first.schemaPath.startsWith(GATE_SCHEMA_PATH) ||
    !isJsonObject(gate) ||
    typeof gate.status !== "string"
  ) {
    return null;
  }

  const branch = GATE_SCHEMA_BRANCH_BY_STATUS[gate.status];
  if (branch === undefined) {
    return findInstanceError(errors, "/gate/status") ?? first;
  }
  return findSchemaBranchError(errors, `${GATE_SCHEMA_PATH}${branch}`) ?? first;
}

function selectCapabilitySchemaError(
  errors: readonly TLocalizedValidationError[],
  value: Record<string, unknown>,
  first: TLocalizedValidationError
): TLocalizedValidationError | null {
  const location = capabilityErrorLocation(value, first);
  if (!location) return null;

  const { capability, index } = location;
  if (!isJsonObject(capability) || typeof capability.status !== "string") {
    return first;
  }

  const branch = CAPABILITY_SCHEMA_BRANCH_BY_STATUS[capability.status];
  if (branch === undefined) {
    return findInstanceError(
      errors,
      `/scanCompleteness/capabilities/${index}/status`
    ) ?? first;
  }
  return findSchemaBranchError(
    errors,
    `${CAPABILITY_SCHEMA_PATH}${branch}`
  ) ?? first;
}

function capabilityErrorLocation(
  value: Record<string, unknown>,
  first: TLocalizedValidationError
): { capability: unknown; index: string } | null {
  if (!first.schemaPath.startsWith(CAPABILITY_SCHEMA_PATH)) return null;

  const match = CAPABILITY_INSTANCE_PATH.exec(first.instancePath);
  const scanCompleteness = value.scanCompleteness;
  if (
    !match ||
    !isJsonObject(scanCompleteness) ||
    !Array.isArray(scanCompleteness.capabilities)
  ) {
    return null;
  }
  return {
    capability: scanCompleteness.capabilities[Number(match[1])],
    index: match[1]
  };
}

function findSchemaBranchError(
  errors: readonly TLocalizedValidationError[],
  prefix: string
): TLocalizedValidationError | undefined {
  return errors.find((error) => (
    error.schemaPath === prefix || error.schemaPath.startsWith(`${prefix}/`)
  ));
}

function findInstanceError(
  errors: readonly TLocalizedValidationError[],
  instancePath: string
): TLocalizedValidationError | undefined {
  return errors.find((error) => error.instancePath === instancePath);
}

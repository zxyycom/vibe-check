import Value from "typebox/value";

import { validateArtifactSetInvariants } from "./artifact-set-invariants.ts";
import {
  MACHINE_METRICS_V1_SCHEMA,
  MACHINE_WARNING_V1_SCHEMA,
  MACHINE_WARNING_V1_SCHEMA_ID,
  type MachineMetricsV1
} from "./schema.ts";
import { selectMachineMetricsSchemaError } from "./validation-schema-errors.ts";
import {
  decodeUtf8,
  failure,
  hasLeadingUtf8Bom,
  isJsonObject,
  schemaErrorPointer,
  schemaMessage,
  success
} from "./validation-support.ts";
import type {
  MachineArtifactBytesV1,
  MachineValidationResult,
  ValidatedMachineArtifactSetV1
} from "./validation-types.ts";
import { validateMachineWarningStreamV1 } from "./warning-stream-validation.ts";

const METRICS_ARTIFACT = "metrics.json";
const WARNINGS_ARTIFACT = "warnings.ndjson";
const WARNINGS_ALL_ARTIFACT = "warnings-all.ndjson";

const MACHINE_SCHEMA_CONTEXT = {
  [MACHINE_WARNING_V1_SCHEMA_ID]: MACHINE_WARNING_V1_SCHEMA
};

export function validateMachineArtifactSetV1(
  artifacts: MachineArtifactBytesV1
): MachineValidationResult<ValidatedMachineArtifactSetV1> {
  const metricsResult = validateMachineMetricsV1(artifacts.metricsJson);
  if (!metricsResult.ok) return metricsResult;

  const warningsResult = validateMachineWarningStreamV1(
    artifacts.warningsNdjson,
    WARNINGS_ARTIFACT
  );
  if (!warningsResult.ok) return warningsResult;

  const warningsAllResult = validateMachineWarningStreamV1(
    artifacts.warningsAllNdjson,
    WARNINGS_ALL_ARTIFACT
  );
  if (!warningsAllResult.ok) return warningsAllResult;

  const invariantFailure = validateArtifactSetInvariants(
    metricsResult.value,
    warningsResult.value,
    warningsAllResult.value
  );
  if (invariantFailure) return invariantFailure;

  return success({
    metrics: metricsResult.value,
    warnings: warningsResult.value,
    warningsAll: warningsAllResult.value
  });
}

function validateMachineMetricsV1(
  bytes: Uint8Array
): MachineValidationResult<MachineMetricsV1> {
  if (hasLeadingUtf8Bom(bytes)) {
    return failure({
      category: "decoding",
      logicalArtifact: METRICS_ARTIFACT,
      message: "Leading UTF-8 BOM is not allowed."
    });
  }

  const decoded = decodeUtf8(bytes, METRICS_ARTIFACT);
  if (!decoded.ok) return decoded;

  const parsed = parseMetricsJson(decoded.value);
  if (!parsed.ok) return parsed;
  if (!isJsonObject(parsed.value)) {
    return failure({
      category: "schema",
      logicalArtifact: METRICS_ARTIFACT,
      message: "Metrics artifact must be a non-null JSON object.",
      pointer: ""
    });
  }

  if (!Value.Check(
    MACHINE_SCHEMA_CONTEXT,
    MACHINE_METRICS_V1_SCHEMA,
    parsed.value
  )) {
    const errors = Value.Errors(
      MACHINE_SCHEMA_CONTEXT,
      MACHINE_METRICS_V1_SCHEMA,
      parsed.value
    );
    const pointer = schemaErrorPointer(
      selectMachineMetricsSchemaError(errors, parsed.value)
    );
    return failure({
      category: "schema",
      logicalArtifact: METRICS_ARTIFACT,
      message: schemaMessage("metrics", pointer),
      pointer
    });
  }
  return success(parsed.value as MachineMetricsV1);
}

function parseMetricsJson(
  decoded: string
): MachineValidationResult<unknown> {
  try {
    return success(JSON.parse(decoded) as unknown);
  } catch {
    return failure({
      category: "syntax",
      logicalArtifact: METRICS_ARTIFACT,
      message: "Metrics artifact must contain exactly one JSON value."
    });
  }
}

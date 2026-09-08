import { snapshotClosedRecord } from "../../data-boundary/closed-values.ts";
import { isOutputDirectory } from "../../project-definition/output-validation.ts";
import { parseProgressRenderingFields } from "../../project-definition/progress-rendering-output.ts";
import type { ProgressRenderingOutput } from "../../project-definition/progress-rendering-output.ts";
import type { RunControls } from "./contract.ts";
import type { RunControlDiagnostic, RunControlValidationResult } from "./validation-result.ts";

type DirectoryOutputOverride = Readonly<{
  readonly directory?: string;
  readonly enabled?: boolean;
}>;

/** Parses invocation-local outputs without changing Definition defaults. */
export function parseOutputsOverride(
  value: unknown
): RunControlValidationResult<RunControls["outputs"]> {
  if (value === undefined) return { ok: true, value: undefined };
  const data = snapshotClosedRecord(value);
  const path = "controls.outputs";
  if (data === undefined) return invalidOutput(path, "invalid-value", "plain-data-object");
  const unknownKey = Object.keys(data).find(
    (key) =>
      key !== "machinePublication" && key !== "progressRendering" && key !== "diagnosticLogging"
  );
  if (unknownKey !== undefined) return invalidOutput(`${path}.${unknownKey}`, "unknown-key");
  const machinePublication = optionalOutput(
    data,
    "machinePublication",
    parseDirectoryOutputOverride
  );
  if (!machinePublication.ok) return machinePublication;
  const progressRendering = optionalOutput(data, "progressRendering", parseProgressOverride);
  if (!progressRendering.ok) return progressRendering;
  const diagnosticLogging = optionalOutput(data, "diagnosticLogging", parseDirectoryOutputOverride);
  if (!diagnosticLogging.ok) return diagnosticLogging;
  return {
    ok: true,
    value: Object.freeze({
      ...(machinePublication.value === undefined
        ? {}
        : { machinePublication: machinePublication.value }),
      ...(progressRendering.value === undefined
        ? {}
        : { progressRendering: progressRendering.value }),
      ...(diagnosticLogging.value === undefined
        ? {}
        : { diagnosticLogging: diagnosticLogging.value })
    })
  };
}
function optionalOutput<T>(
  value: Readonly<Record<string, unknown>>,
  key: string,
  parse: (candidate: unknown, path: string) => RunControlValidationResult<T>
): RunControlValidationResult<T | undefined> {
  if (value[key] === undefined) return { ok: true, value: undefined };
  return parse(value[key], `controls.outputs.${key}`);
}
function parseProgressOverride(
  value: unknown,
  path: string
): RunControlValidationResult<Partial<ProgressRenderingOutput>> {
  const fields = parseProgressRenderingFields(value);
  if (fields.ok) return fields;
  return invalidOutput(
    fields.key === null ? path : `${path}.${fields.key}`,
    fields.reason,
    fields.expected
  );
}
function parseDirectoryOutputOverride(
  value: unknown,
  path: string
): RunControlValidationResult<DirectoryOutputOverride> {
  const data = snapshotClosedRecord(value);
  if (data === undefined) return invalidOutput(path, "invalid-value", "plain-data-object");
  const unknownKey = Object.keys(data).find((key) => key !== "directory" && key !== "enabled");
  if (unknownKey !== undefined) return invalidOutput(`${path}.${unknownKey}`, "unknown-key");
  if (
    data.directory !== undefined &&
    (typeof data.directory !== "string" || !isOutputDirectory(data.directory))
  )
    return invalidOutput(`${path}.directory`, "invalid-value", "non-empty-string-without-nul");
  if (data.enabled !== undefined && typeof data.enabled !== "boolean") {
    return invalidOutput(`${path}.enabled`, "invalid-value", "boolean");
  }
  return {
    ok: true,
    value: Object.freeze({
      ...(data.directory === undefined ? {} : { directory: data.directory }),
      ...(data.enabled === undefined ? {} : { enabled: data.enabled })
    })
  };
}

function invalidOutput(
  path: string,
  reason: RunControlDiagnostic["reason"],
  expected?: RunControlDiagnostic["expected"]
): RunControlValidationResult<never> {
  return Object.freeze({
    ok: false,
    error: Object.freeze({
      kind: "invalid-run-controls",
      path,
      ...(reason === "invalid-value" && expected !== undefined ? { reason, expected } : { reason })
    })
  });
}

import { snapshotClosedRecord } from "../../data-boundary/closed-values.ts";
import { isContainedRelativeDirectory } from "../../project-definition/output-validation.ts";
import type { ProjectOutputs } from "../../project-definition/project-definition.ts";
import type { RunControls } from "./contract.ts";
/** Parses invocation-local outputs without changing Definition defaults. */
export function parseOutputsOverride(value: unknown): RunControls["outputs"] | undefined {
  const data = snapshotClosedRecord(value);
  if (
    data === undefined ||
    Object.keys(data).some(
      (key) =>
        key !== "machinePublication" && key !== "progressRendering" && key !== "diagnosticLogging"
    )
  )
    return undefined;
  const machinePublication = optionalOutput(
    data,
    "machinePublication",
    parseDirectoryOutputOverride
  );
  const progressRendering = optionalOutput(data, "progressRendering", parseProgressOutputOverride);
  const diagnosticLogging = optionalOutput(
    data,
    "diagnosticLogging",
    parseDiagnosticLoggingOverride
  );
  if (!machinePublication.ok || !progressRendering.ok || !diagnosticLogging.ok) return undefined;
  return Object.freeze({
    ...(machinePublication.value === undefined
      ? {}
      : { machinePublication: machinePublication.value }),
    ...(progressRendering.value === undefined
      ? {}
      : { progressRendering: progressRendering.value }),
    ...(diagnosticLogging.value === undefined ? {} : { diagnosticLogging: diagnosticLogging.value })
  });
}
function optionalOutput<T>(
  value: Readonly<Record<string, unknown>>,
  key: string,
  parse: (candidate: unknown) => T | undefined
): Readonly<{ readonly ok: boolean; readonly value?: T }> {
  if (value[key] === undefined) return Object.freeze({ ok: true });
  const parsed = parse(value[key]);
  return parsed === undefined
    ? Object.freeze({ ok: false })
    : Object.freeze({ ok: true, value: parsed });
}
function parseDirectoryOutputOverride(
  value: unknown
): Partial<ProjectOutputs["machinePublication"]> | undefined {
  const data = snapshotClosedRecord(value);
  if (
    data === undefined ||
    Object.keys(data).some((key) => key !== "directory" && key !== "enabled")
  )
    return undefined;
  if (data.directory !== undefined && typeof data.directory !== "string") return undefined;
  if (data.enabled !== undefined && typeof data.enabled !== "boolean") return undefined;
  return Object.freeze({
    ...(data.directory === undefined ? {} : { directory: data.directory }),
    ...(data.enabled === undefined ? {} : { enabled: data.enabled })
  });
}
function parseProgressOutputOverride(
  value: unknown
): Partial<ProjectOutputs["progressRendering"]> | undefined {
  const data = snapshotClosedRecord(value);
  if (data === undefined || Object.keys(data).some((key) => key !== "enabled")) return undefined;
  if (data.enabled !== undefined && typeof data.enabled !== "boolean") return undefined;
  return Object.freeze(data.enabled === undefined ? {} : { enabled: data.enabled });
}

function parseDiagnosticLoggingOverride(
  value: unknown
): Partial<ProjectOutputs["diagnosticLogging"]> | undefined {
  const parsed = parseDirectoryOutputOverride(value);
  return parsed === undefined ||
    (parsed.directory !== undefined && !isContainedRelativeDirectory(parsed.directory))
    ? undefined
    : parsed;
}

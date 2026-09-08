import type { ProjectOutputs } from "./project-definition.ts";
import type { ResolvedProgressRenderingOutput } from "./progress-rendering-output.ts";
import { parseProgressRenderingFields } from "./progress-rendering-output.ts";
import { snapshotClosedRecord } from "../data-boundary/closed-values.ts";
import { resolveProgressRenderingOutput } from "./output-defaults.ts";

const OUTPUT_NAMES = ["machinePublication", "progressRendering", "diagnosticLogging"] as const;

export function parseOutputs(value: unknown): ProjectOutputs | undefined {
  const data = exactKeys(value, OUTPUT_NAMES);
  if (data === undefined) return undefined;
  const machinePublication = parseDirectoryOutput(data.machinePublication);
  const progressRendering = parseProgressRenderingOutput(data.progressRendering);
  const diagnosticLogging = parseDirectoryOutput(data.diagnosticLogging);
  return machinePublication === undefined ||
    progressRendering === undefined ||
    diagnosticLogging === undefined
    ? undefined
    : Object.freeze({ machinePublication, progressRendering, diagnosticLogging });
}

/** Accepts trusted output targets without claiming filesystem containment. */
export function isOutputDirectory(directory: string): boolean {
  return directory.length > 0 && !directory.includes("\0");
}

function parseDirectoryOutput(
  value: unknown
): Readonly<{ readonly directory: string; readonly enabled: boolean }> | undefined {
  const data = exactKeys(value, ["directory", "enabled"]);
  return typeof data?.directory === "string" &&
    isOutputDirectory(data.directory) &&
    typeof data.enabled === "boolean"
    ? Object.freeze({ directory: data.directory, enabled: data.enabled })
    : undefined;
}

function parseProgressRenderingOutput(value: unknown): ResolvedProgressRenderingOutput | undefined {
  const fields = parseProgressRenderingFields(value);
  if (fields?.enabled === undefined) return undefined;
  return resolveProgressRenderingOutput(fields);
}

function exactKeys(
  value: unknown,
  keys: readonly string[]
): Readonly<Record<string, unknown>> | undefined {
  const data = snapshotClosedRecord(value);
  return data !== undefined &&
    Object.keys(data).length === keys.length &&
    keys.every((key) => Object.hasOwn(data, key))
    ? data
    : undefined;
}

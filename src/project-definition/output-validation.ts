import type { ProjectOutputs } from "./project-definition.ts";
import { snapshotClosedRecord } from "../data-boundary/closed-values.ts";
const OUTPUT_NAMES = ["machinePublication", "progressRendering"] as const;
export function parseOutputs(value: unknown): ProjectOutputs | undefined {
  const data = exactKeys(value, OUTPUT_NAMES);
  if (data === undefined) return undefined;
  const machinePublication = parseDirectoryOutput(data.machinePublication);
  const progressRendering = parseSwitchOutput(data.progressRendering);
  return machinePublication === undefined || progressRendering === undefined
    ? undefined
    : Object.freeze({ machinePublication, progressRendering });
}
function parseDirectoryOutput(
  value: unknown
): Readonly<{ readonly directory: string; readonly enabled: boolean }> | undefined {
  const data = exactKeys(value, ["directory", "enabled"]);
  return typeof data?.directory === "string" && typeof data.enabled === "boolean"
    ? Object.freeze({ directory: data.directory, enabled: data.enabled })
    : undefined;
}
function parseSwitchOutput(value: unknown): Readonly<{ readonly enabled: boolean }> | undefined {
  const data = exactKeys(value, ["enabled"]);
  return typeof data?.enabled === "boolean" ? Object.freeze({ enabled: data.enabled }) : undefined;
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

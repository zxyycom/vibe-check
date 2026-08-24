import type { ProjectEffects, RunControls } from "./project-definition.ts";
import { snapshotClosedRecord } from "../foundation/closed-values.ts";

const EFFECT_NAMES = ["cache", "output", "progress"] as const;

export function parseEffects(value: unknown): ProjectEffects | undefined {
  const data = exactKeys(value, EFFECT_NAMES);
  if (data === undefined) return undefined;
  const cache = parseDirectoryEffect(data.cache);
  const output = parseDirectoryEffect(data.output);
  const progress = parseSwitchEffect(data.progress);
  return cache === undefined || output === undefined || progress === undefined
    ? undefined
    : Object.freeze({ cache, output, progress });
}

export function parseEffectsOverride(value: unknown): RunControls["effects"] | undefined {
  const data = snapshotClosedRecord(value);
  if (data === undefined || Object.keys(data).some((key) => !isEffectName(key))) {
    return undefined;
  }
  const cache = optionalEffect(data, "cache", parseDirectoryEffectOverride);
  const output = optionalEffect(data, "output", parseDirectoryEffectOverride);
  const progress = optionalEffect(data, "progress", parseProgressEffectOverride);
  if (!cache.ok || !output.ok || !progress.ok) return undefined;
  return Object.freeze({
    ...(cache.value === undefined ? {} : { cache: cache.value }),
    ...(output.value === undefined ? {} : { output: output.value }),
    ...(progress.value === undefined ? {} : { progress: progress.value })
  });
}

function isEffectName(value: string): boolean {
  return EFFECT_NAMES.some((effectName) => effectName === value);
}

function optionalEffect<T>(
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

function parseDirectoryEffect(
  value: unknown
): Readonly<{ readonly directory: string; readonly enabled: boolean }> | undefined {
  const data = exactKeys(value, ["directory", "enabled"]);
  return typeof data?.directory === "string" && typeof data.enabled === "boolean"
    ? Object.freeze({ directory: data.directory, enabled: data.enabled })
    : undefined;
}

function parseSwitchEffect(value: unknown): Readonly<{ readonly enabled: boolean }> | undefined {
  const data = exactKeys(value, ["enabled"]);
  return typeof data?.enabled === "boolean" ? Object.freeze({ enabled: data.enabled }) : undefined;
}

function parseDirectoryEffectOverride(
  value: unknown
): Partial<ProjectEffects["cache"]> | undefined {
  const data = snapshotClosedRecord(value);
  if (
    data === undefined ||
    Object.keys(data).some((key) => key !== "directory" && key !== "enabled")
  ) {
    return undefined;
  }
  if (data.directory !== undefined && typeof data.directory !== "string") return undefined;
  if (data.enabled !== undefined && typeof data.enabled !== "boolean") return undefined;
  return Object.freeze({
    ...(data.directory === undefined ? {} : { directory: data.directory }),
    ...(data.enabled === undefined ? {} : { enabled: data.enabled })
  });
}

function parseProgressEffectOverride(
  value: unknown
): Partial<ProjectEffects["progress"]> | undefined {
  const data = snapshotClosedRecord(value);
  if (data === undefined || Object.keys(data).some((key) => key !== "enabled")) {
    return undefined;
  }
  if (data.enabled !== undefined && typeof data.enabled !== "boolean") return undefined;
  return Object.freeze(data.enabled === undefined ? {} : { enabled: data.enabled });
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

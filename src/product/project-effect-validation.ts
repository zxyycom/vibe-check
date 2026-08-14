import { isNonArrayRecord } from "./foundation/src/type-guards.ts";
import type { ProjectEffects, RunControls } from "./project-definition.ts";

const EFFECT_NAMES = ["cache", "logs", "output", "progress"] as const;

export function parseEffects(value: unknown): ProjectEffects | undefined {
  const data = exactKeys(value, EFFECT_NAMES);
  if (data === undefined) return undefined;
  const cache = parseDirectoryEffect(data.cache);
  const logs = parseSwitchEffect(data.logs);
  const output = parseDirectoryEffect(data.output);
  const progress = parseSwitchEffect(data.progress);
  return cache === undefined || logs === undefined || output === undefined || progress === undefined
    ? undefined
    : Object.freeze({ cache, logs, output, progress });
}

export function parseEffectsOverride(value: unknown): RunControls["effects"] | undefined {
  if (!isNonArrayRecord(value)
    || Object.keys(value).some((key) => !isEffectName(key))) {
    return undefined;
  }
  const cache = optionalEffect(value, "cache", parseDirectoryEffectOverride);
  const logs = optionalEffect(value, "logs", parseSwitchEffectOverride);
  const output = optionalEffect(value, "output", parseDirectoryEffectOverride);
  const progress = optionalEffect(value, "progress", parseSwitchEffectOverride);
  if (!cache.ok || !logs.ok || !output.ok || !progress.ok) return undefined;
  return Object.freeze({
    ...(cache.value === undefined ? {} : { cache: cache.value }),
    ...(logs.value === undefined ? {} : { logs: logs.value }),
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
  if (!isNonArrayRecord(value)
    || Object.keys(value).some((key) => key !== "directory" && key !== "enabled")) {
    return undefined;
  }
  if (value.directory !== undefined && typeof value.directory !== "string") return undefined;
  if (value.enabled !== undefined && typeof value.enabled !== "boolean") return undefined;
  return Object.freeze({
    ...(value.directory === undefined ? {} : { directory: value.directory }),
    ...(value.enabled === undefined ? {} : { enabled: value.enabled })
  });
}

function parseSwitchEffectOverride(
  value: unknown
): Partial<ProjectEffects["logs"]> | undefined {
  if (!isNonArrayRecord(value) || Object.keys(value).some((key) => key !== "enabled")) {
    return undefined;
  }
  if (value.enabled !== undefined && typeof value.enabled !== "boolean") return undefined;
  return Object.freeze(value.enabled === undefined ? {} : { enabled: value.enabled });
}

function exactKeys(
  value: unknown,
  keys: readonly string[]
): Readonly<Record<string, unknown>> | undefined {
  return isNonArrayRecord(value) && Object.keys(value).length === keys.length
    && keys.every((key) => Object.hasOwn(value, key))
    ? value
    : undefined;
}

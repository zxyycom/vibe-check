import { lstatSync, readFileSync } from "node:fs";
import { join } from "node:path";

import { isNonArrayRecord } from "../../../value-guards.ts";
import type { ProjectGateSelection } from "./controls.ts";

export const LOCAL_PERFORMANCE_BASELINE_PATH =
  ".cache/vibe-check/project-gate/performance-baseline.json";

/** A manually maintained, machine-local hard limit for one Gate profile and runtime. */
export interface ProjectGatePerformanceBaseline {
  /** Optional legacy metadata: validated when present, never used to select the hard limit. */
  readonly declarativeFingerprint?: string;
  readonly maxElapsedMs: number;
  readonly profile: "all" | "required";
  readonly runtime: ProjectGatePerformanceRuntime;
}

export interface ProjectGatePerformanceRuntime {
  readonly architecture: string;
  readonly bunVersion: string;
  readonly platform: string;
}

export function currentProjectGatePerformanceRuntime(): ProjectGatePerformanceRuntime {
  return Object.freeze({
    architecture: process.arch,
    bunVersion: process.versions.bun ?? "unavailable",
    platform: process.platform
  });
}

export type LocalPerformanceBaselines =
  | Readonly<{
      readonly kind: "loaded";
      readonly baselines: readonly ProjectGatePerformanceBaseline[];
    }>
  | Readonly<{ readonly kind: "missing" | "invalid" }>;

/** Reads local policy only; Gate never creates, learns, or rewrites the hard limit. */
export function loadLocalPerformanceBaselines(repositoryRoot: string): LocalPerformanceBaselines {
  const path = join(repositoryRoot, LOCAL_PERFORMANCE_BASELINE_PATH);
  let source: string;
  try {
    if (!lstatSync(path).isFile()) return Object.freeze({ kind: "invalid" });
    source = readFileSync(path, "utf8");
  } catch (error: unknown) {
    if (isMissingFile(error)) return Object.freeze({ kind: "missing" });
    return Object.freeze({ kind: "invalid" });
  }

  let value: unknown;
  try {
    value = JSON.parse(source) as unknown;
  } catch {
    return Object.freeze({ kind: "invalid" });
  }
  return parseLocalPerformanceBaselines(value);
}

function parseLocalPerformanceBaselines(value: unknown): LocalPerformanceBaselines {
  if (!isNonArrayRecord(value) || !hasExactKeys(value, ["schemaVersion", "baselines"])) {
    return Object.freeze({ kind: "invalid" });
  }
  if (value.schemaVersion !== 1 || !Array.isArray(value.baselines)) {
    return Object.freeze({ kind: "invalid" });
  }
  const parsed: ProjectGatePerformanceBaseline[] = [];
  for (const item of value.baselines) {
    const baseline = parsePerformanceBaseline(item);
    if (baseline === undefined) return Object.freeze({ kind: "invalid" });
    parsed.push(baseline);
  }
  const identities = parsed.map(
    ({ profile, runtime }) =>
      `${profile}\0${runtime.platform}\0${runtime.architecture}\0${runtime.bunVersion}`
  );
  if (new Set(identities).size !== identities.length) {
    return Object.freeze({ kind: "invalid" });
  }
  return Object.freeze({ kind: "loaded", baselines: Object.freeze(parsed) });
}

/** Fails before candidate preparation when a standard workload has no local limit. */
export function preflightPerformanceBaselines(
  selection: ProjectGateSelection,
  load: () => LocalPerformanceBaselines
): readonly ProjectGatePerformanceBaseline[] | undefined {
  const profile = selection.kind;
  if (profile === "focused") return Object.freeze([]);
  let local: LocalPerformanceBaselines;
  try {
    local = load();
  } catch {
    console.error(
      `project gate performance baseline could not be read: ${LOCAL_PERFORMANCE_BASELINE_PATH}`
    );
    return undefined;
  }
  if (local.kind !== "loaded") {
    console.error(
      `project gate performance baseline ${local.kind}: manually create or repair ${LOCAL_PERFORMANCE_BASELINE_PATH}`
    );
    return undefined;
  }
  const runtime = currentProjectGatePerformanceRuntime();
  if (
    !local.baselines.some(
      (baseline) =>
        baseline.profile === profile &&
        baseline.runtime.platform === runtime.platform &&
        baseline.runtime.architecture === runtime.architecture &&
        baseline.runtime.bunVersion === runtime.bunVersion
    )
  ) {
    console.error(
      `project gate performance baseline missing for ${profile} on ${runtime.platform}/${runtime.architecture} Bun ${runtime.bunVersion}: manually update ${LOCAL_PERFORMANCE_BASELINE_PATH}`
    );
    return undefined;
  }
  return local.baselines;
}

function parsePerformanceBaseline(value: unknown): ProjectGatePerformanceBaseline | undefined {
  if (
    !isNonArrayRecord(value) ||
    !hasValidBaselineFields(value) ||
    (value.profile !== "required" && value.profile !== "all") ||
    !Number.isSafeInteger(value.maxElapsedMs) ||
    Number(value.maxElapsedMs) <= 0 ||
    !isPerformanceRuntime(value.runtime)
  ) {
    return undefined;
  }
  return Object.freeze({
    ...(typeof value.declarativeFingerprint === "string"
      ? { declarativeFingerprint: value.declarativeFingerprint }
      : {}),
    maxElapsedMs: Number(value.maxElapsedMs),
    profile: value.profile,
    runtime: Object.freeze({ ...value.runtime })
  });
}

function hasValidBaselineFields(value: Readonly<Record<string, unknown>>): boolean {
  const keys = ["profile", "runtime", "maxElapsedMs"];
  if (Object.hasOwn(value, "declarativeFingerprint")) {
    keys.push("declarativeFingerprint");
    if (
      typeof value.declarativeFingerprint !== "string" ||
      !/^[a-f0-9]{64}$/u.test(value.declarativeFingerprint)
    ) {
      return false;
    }
  }
  return hasExactKeys(value, keys);
}

function isPerformanceRuntime(value: unknown): value is ProjectGatePerformanceRuntime {
  return (
    isNonArrayRecord(value) &&
    hasExactKeys(value, ["platform", "architecture", "bunVersion"]) &&
    typeof value.platform === "string" &&
    value.platform.length > 0 &&
    typeof value.architecture === "string" &&
    value.architecture.length > 0 &&
    typeof value.bunVersion === "string" &&
    value.bunVersion.length > 0
  );
}

function hasExactKeys(value: Readonly<Record<string, unknown>>, keys: readonly string[]): boolean {
  const actual = Object.keys(value).sort();
  const expected = [...keys].sort();
  return actual.length === expected.length && actual.every((key, index) => key === expected[index]);
}

function isMissingFile(error: unknown): boolean {
  return isNonArrayRecord(error) && error.code === "ENOENT";
}

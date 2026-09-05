import { createHash } from "node:crypto";

import type { AdmissionPolicy, DeclarativeSchedulerPolicy } from "./scheduler-policy.ts";
import type {
  DeclarativeProjectSnapshot,
  NormalizedCheck,
  ProjectDefinition
} from "./project-definition.ts";
import { isNonArrayRecord } from "../data-boundary/value-shapes.ts";

/**
 * Produces the immutable, callback-free Definition identity consumed by fingerprinting.
 */
export function createDeclarativeProjectSnapshot(
  definition: ProjectDefinition,
  checks: readonly NormalizedCheck[]
): DeclarativeProjectSnapshot {
  const declarations = checks
    .map(({ execution: _execution, preflight: _preflight, ...declaration }) => declaration)
    .sort((left, right) => compareText(left.definition.checkId, right.definition.checkId));
  return deepFreeze({
    apiVersion: definition.apiVersion,
    checks: declarations,
    outputs: definition.outputs,
    scheduler: Object.freeze({
      admissionPolicy: declarativeAdmissionPolicy(definition.scheduler.admissionPolicy),
      maxParallel: definition.scheduler.maxParallel
    })
  });
}

/** Generates the stable SHA-256 fingerprint for one declarative Definition snapshot. */
export function createDeclarativeFingerprint(snapshot: DeclarativeProjectSnapshot): string {
  return createHash("sha256").update(stableJson(snapshot)).digest("hex");
}

function declarativeAdmissionPolicy(
  policy: AdmissionPolicy
): DeclarativeSchedulerPolicy["admissionPolicy"] {
  if (policy.kind === "learned-critical-path") {
    return Object.freeze({
      kind: "learned-critical-path" as const,
      stateDirectory: policy.stateDirectory
    });
  }
  if (policy.kind === "custom") {
    return Object.freeze({
      kind: "custom" as const,
      strategy: Object.freeze({ kind: policy.strategy.kind })
    });
  }
  return Object.freeze({ kind: "static" as const });
}

function compareText(left: string, right: string): number {
  if (left < right) return -1;
  if (left > right) return 1;
  return 0;
}

function deepFreeze<T>(value: T): T {
  if (typeof value !== "object" || value === null || Object.isFrozen(value)) return value;
  for (const item of Object.values(value)) deepFreeze(item);
  return Object.freeze(value);
}

function stableJson(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(stableJson).join(",")}]`;
  if (isNonArrayRecord(value))
    return `{${Object.keys(value)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${stableJson(value[key])}`)
      .join(",")}}`;
  return JSON.stringify(value);
}

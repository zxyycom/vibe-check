import { createHash } from "node:crypto";
import { lstatSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import type { Scenario } from "./scenario.ts";

export const EVIDENCE_SCHEMA_VERSION = 1 as const;
export const TRACE_VOCABULARY_ID = "admission-workbench-trace-v1" as const;
export const POLICY_CONTEXT_ID = "public-admission-policy-context-v1" as const;
export const SEED_DERIVATION_ID = "fnv1a32-nul-tuple+mulberry32-v1" as const;

export interface CandidateIdentity {
  readonly entrySha256: string;
  readonly packageName: "@zxyycom/vibe-check";
  readonly packageVersion: string;
}

export interface ScenarioEvidenceIdentity {
  readonly assumptionIds: readonly string[];
  readonly mappingIdentity: string | null;
  readonly profileSetSha256: string;
  readonly scenarioId: string;
  readonly scenarioVersion: 1;
}

export function installedCandidateIdentity(): CandidateIdentity {
  const entryPath = fileURLToPath(import.meta.resolve("@zxyycom/vibe-check"));
  requireRegularFile(entryPath, "entry");
  const manifestPath = join(dirname(entryPath), "package.json");
  requireRegularFile(manifestPath, "manifest");
  return Object.freeze({
    entrySha256: sha256Bytes(readFileSync(entryPath)),
    packageName: "@zxyycom/vibe-check" as const,
    packageVersion: candidateManifestVersion(JSON.parse(readFileSync(manifestPath, "utf8")))
  });
}

function requireRegularFile(path: string, label: string): void {
  const info = lstatSync(path);
  if (!info.isFile() || info.isSymbolicLink()) {
    throw new TypeError(`installed candidate ${label} must be a regular file`);
  }
}

function candidateManifestVersion(value: unknown): string {
  if (!isCandidateManifest(value)) {
    throw new TypeError("installed candidate manifest identity is invalid");
  }
  return value.version;
}

function isCandidateManifest(
  value: unknown
): value is Readonly<{ readonly name: string; readonly version: string }> {
  if (!isPlainRecord(value)) return false;
  return (
    value.name === "@zxyycom/vibe-check" &&
    typeof value.version === "string" &&
    value.version.length > 0
  );
}

export function scenarioEvidenceIdentity(scenario: Scenario): ScenarioEvidenceIdentity {
  return Object.freeze({
    assumptionIds: Object.freeze([...scenario.assumptionIds]),
    mappingIdentity: scenario.mappingIdentity ?? null,
    profileSetSha256: sha256Json({
      profiles: scenario.profiles,
      taskProfiles: scenario.taskProfiles
    }),
    scenarioId: scenario.scenarioId,
    scenarioVersion: scenario.scenarioVersion
  });
}

export function canonicalJsonText(value: unknown, indentation?: number): string {
  return JSON.stringify(canonicalJsonValue(value), null, indentation);
}

export function sha256Json(value: unknown): string {
  return sha256Bytes(Buffer.from(canonicalJsonText(value), "utf8"));
}

function sha256Bytes(value: NodeJS.ArrayBufferView): string {
  return `sha256:${createHash("sha256").update(value).digest("hex")}`;
}

function canonicalJsonValue(value: unknown): unknown {
  if (value === null || typeof value === "string" || typeof value === "boolean") return value;
  if (typeof value === "number") {
    if (!Number.isFinite(value)) throw new TypeError("evidence contains a non-finite number");
    return value;
  }
  if (Array.isArray(value)) return value.map(canonicalJsonValue);
  if (!isPlainRecord(value)) {
    throw new TypeError("evidence contains a non-plain object");
  }
  const output: Record<string, unknown> = {};
  for (const key of Object.keys(value).sort()) {
    const item = value[key];
    if (item === undefined) throw new TypeError("evidence contains undefined");
    output[key] = canonicalJsonValue(item);
  }
  return output;
}

function isPlainRecord(value: unknown): value is Readonly<Record<string, unknown>> {
  if (value === null || typeof value !== "object" || Array.isArray(value)) return false;
  const prototype = Reflect.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

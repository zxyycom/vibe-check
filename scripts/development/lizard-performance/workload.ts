import { createHash } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";
import { relative, resolve } from "node:path";

import { benchmarkRoot, manifestPath } from "./benchmark-context.ts";
import { LIZARD_PYTHON_VERSION, type WorkloadManifest } from "./contract.ts";
import { parseJson, record } from "./evidence-shapes.ts";

export interface WorkloadFile {
  readonly path: string;
  readonly source: string;
}

export function readManifest(): WorkloadManifest {
  const manifest = parseWorkloadManifest(
    parseJson(readFileSync(manifestPath, "utf8"), "benchmark manifest")
  );
  const sources = readSources(manifest.analyzerSourcePaths);
  if (manifest.sourceSha256 !== sourceDigest(sources)) {
    throw new Error("benchmark manifest sourceSha256 does not match its exact source snapshot");
  }
  return manifest;
}

export function parseWorkloadManifest(value: unknown): WorkloadManifest {
  const input = record(value);
  if (input === undefined) throw invalidManifest("root", "an object");
  if (input.fixedLizardVersion !== LIZARD_PYTHON_VERSION) {
    throw invalidManifest("fixedLizardVersion", LIZARD_PYTHON_VERSION);
  }
  const analyzerBatchReplications = manifestPositiveSafeInteger(input, "analyzerBatchReplications");
  const analyzerSourcePaths = manifestStringArray(input, "analyzerSourcePaths");
  const productSourcePaths = manifestStringArray(input, "productSourcePaths");
  return Object.freeze({
    analyzerBatchReplications,
    analyzerSourcePaths,
    fixedLizardVersion: LIZARD_PYTHON_VERSION,
    id: manifestString(input, "id"),
    productSourcePaths,
    sourceSha256: manifestString(input, "sourceSha256")
  });
}

export function readSources(paths: readonly string[]): readonly WorkloadFile[] {
  return Object.freeze(
    paths.map((path) =>
      Object.freeze({ path, source: readFileSync(resolve(benchmarkRoot, path), "utf8") })
    )
  );
}

export function repeatAnalyzerSources(
  sources: readonly WorkloadFile[],
  replications: number
): readonly WorkloadFile[] {
  const result: WorkloadFile[] = [];
  for (let repetition = 0; repetition < replications; repetition += 1) {
    for (const source of sources) {
      result.push(
        Object.freeze({
          path: `benchmark-representative/${String(repetition + 1)}/${source.path}`,
          source: source.source
        })
      );
    }
  }
  return Object.freeze(result);
}

export function writeRequest(directory: string, name: string, value: object): string {
  const path = resolve(directory, name);
  writeFileSync(path, `${JSON.stringify(value)}\n`);
  return path;
}

export function byteCount(files: readonly Pick<WorkloadFile, "source">[]): number {
  return files.reduce((total, { source }) => total + Buffer.byteLength(source), 0);
}

export function sourceDigest(files: readonly WorkloadFile[]): string {
  return createHash("sha256")
    .update(files.map(({ path, source }) => `${path}\0${source}`).join("\0"))
    .digest("hex");
}

export function fileSnapshotDigest(paths: readonly string[]): string {
  return createHash("sha256")
    .update(
      paths
        .map((path) => `${relative(benchmarkRoot, path)}\0${readFileSync(path, "utf8")}`)
        .join("\0")
    )
    .digest("hex");
}

function manifestString(
  manifest: Readonly<Record<string, unknown>>,
  field: "id" | "sourceSha256"
): string {
  const value = manifest[field];
  if (typeof value !== "string") throw invalidManifest(field, "a string");
  return value;
}

function manifestStringArray(
  manifest: Readonly<Record<string, unknown>>,
  field: "analyzerSourcePaths" | "productSourcePaths"
): readonly string[] {
  const value = manifest[field];
  if (
    !Array.isArray(value) ||
    value.length === 0 ||
    !value.every((item) => typeof item === "string")
  ) {
    throw invalidManifest(field, "a non-empty string array");
  }
  return Object.freeze([...value]);
}

function manifestPositiveSafeInteger(
  manifest: Readonly<Record<string, unknown>>,
  field: "analyzerBatchReplications"
): number {
  const value = manifest[field];
  if (typeof value !== "number" || !Number.isSafeInteger(value) || value < 1) {
    throw invalidManifest(field, "a positive safe integer");
  }
  return value;
}

function invalidManifest(field: string, requirement: string): Error {
  return new Error(`fixed Lizard benchmark manifest ${field} must be ${requirement}`);
}

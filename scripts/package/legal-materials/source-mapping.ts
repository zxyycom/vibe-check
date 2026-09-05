import { createHash } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { errorMessage } from "../../error-message.ts";
import { reportProcessOutput, runProcessInvocationSync } from "../../process-execution/command.ts";
import { parseTranslatedAnalyzerProvenanceInventory } from "./provenance-inventory.ts";

const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), "../../..");
const provenancePath = resolve(repositoryRoot, "licenses/lizard-1.24.0-provenance.json");
const packageContractPath = resolve(repositoryRoot, "scripts/package/package-contract.ts");
const identityManifestPath = resolve(
  repositoryRoot,
  "src/package-checks/function-metrics/analyzer/fixtures/lizard-1.24.0/evidence/lizard-1.24-source-identity.json"
);
const sourceIdentityTestPath = resolve(
  repositoryRoot,
  "src/package-checks/function-metrics/analyzer/source-identity.test.ts"
);
const PACKAGE_PROVENANCE_PIN_PATTERN =
  /export const PACKAGE_TRANSLATED_ANALYZER_PROVENANCE_SHA256 =\n {2}"([a-f0-9]{64})";/gu;

type SourceMappingAction = "check" | "sync";

export interface SourceMappingPaths {
  readonly identityManifestPath: string;
  readonly packageContractPath: string;
  readonly provenancePath: string;
}

export interface SourceMappingDependencies {
  readonly auditSourceIdentity: (paths: SourceMappingPaths) => void;
  readonly writeFile: (path: string, source: string) => void;
}

export interface SourceMappingResult {
  readonly changedPaths: readonly string[];
}

const DEFAULT_PATHS: SourceMappingPaths = Object.freeze({
  identityManifestPath,
  packageContractPath,
  provenancePath
});

const DEFAULT_DEPENDENCIES: SourceMappingDependencies = Object.freeze({
  auditSourceIdentity: auditDefaultSourceIdentity,
  writeFile: (path: string, source: string) => writeFileSync(path, source, "utf8")
});

/** Checks curated source mapping and its derived package pin without rewriting either. */
export function checkTranslatedSourceMapping(
  paths: SourceMappingPaths = DEFAULT_PATHS,
  dependencies: SourceMappingDependencies = DEFAULT_DEPENDENCIES
): SourceMappingResult {
  const candidates = prepareSynchronization(paths);
  const stalePaths = candidates
    .filter((candidate) => candidate.source !== candidate.synchronizedSource)
    .map((candidate) => candidate.path);
  if (stalePaths.length > 0) {
    throw new Error(
      `translated source mapping is out of sync: ${stalePaths.join(", ")}; run source mapping sync after reviewing the ledger`
    );
  }
  dependencies.auditSourceIdentity(paths);
  return Object.freeze({ changedPaths: Object.freeze([]) });
}

/** Explicitly synchronizes only the ledger's package pin and legacy derived identity fields. */
export function syncTranslatedSourceMapping(
  paths: SourceMappingPaths = DEFAULT_PATHS,
  dependencies: SourceMappingDependencies = DEFAULT_DEPENDENCIES
): SourceMappingResult {
  const candidates = prepareSynchronization(paths);
  dependencies.auditSourceIdentity(paths);
  commitCandidates(candidates, dependencies.writeFile);
  return Object.freeze({
    changedPaths: Object.freeze(
      candidates
        .filter((candidate) => candidate.source !== candidate.synchronizedSource)
        .map((candidate) => candidate.path)
    )
  });
}

function prepareSynchronization(paths: SourceMappingPaths): readonly SynchronizationCandidate[] {
  const provenanceSource = readFileSync(paths.provenancePath);
  parseTranslatedAnalyzerProvenanceInventory(provenanceSource);
  const identitySource = readFileSync(paths.identityManifestPath, "utf8");
  const packageContractSource = readFileSync(paths.packageContractPath, "utf8");
  const identityCandidate = synchronizeIdentityManifest(identitySource);
  const packageContractCandidate = synchronizePackageProvenancePin(
    packageContractSource,
    sha256(provenanceSource)
  );
  return Object.freeze([
    Object.freeze({
      path: paths.identityManifestPath,
      source: identitySource,
      synchronizedSource: identityCandidate
    }),
    Object.freeze({
      path: paths.packageContractPath,
      source: packageContractSource,
      synchronizedSource: packageContractCandidate
    })
  ]);
}

function synchronizeIdentityManifest(source: string): string {
  const manifest = readJsonObject(source, "source identity manifest");
  const counts = manifest.counts;
  if (!isJsonObject(counts))
    throw new TypeError("source identity manifest counts must be an object");
  if (!Object.hasOwn(counts, "entries") && !Object.hasOwn(counts, "targets")) return source;
  delete counts.entries;
  delete counts.targets;
  return `${JSON.stringify(manifest, null, 2)}\n`;
}

function synchronizePackageProvenancePin(source: string, provenanceHash: string): string {
  const pins = [...source.matchAll(PACKAGE_PROVENANCE_PIN_PATTERN)];
  if (pins.length !== 1) {
    throw new Error("package contract must contain exactly one translated-analyzer provenance pin");
  }
  return source.replace(
    PACKAGE_PROVENANCE_PIN_PATTERN,
    `export const PACKAGE_TRANSLATED_ANALYZER_PROVENANCE_SHA256 =\n  "${provenanceHash}";`
  );
}

function commitCandidates(
  candidates: readonly SynchronizationCandidate[],
  writeFile: SourceMappingDependencies["writeFile"]
): void {
  const changedCandidates = candidates.filter(
    (candidate) => candidate.source !== candidate.synchronizedSource
  );
  const attemptedCandidates: SynchronizationCandidate[] = [];
  try {
    for (const candidate of changedCandidates) {
      attemptedCandidates.push(candidate);
      writeFile(candidate.path, candidate.synchronizedSource);
    }
  } catch (error: unknown) {
    const rollbackErrors: string[] = [];
    for (const candidate of attemptedCandidates.toReversed()) {
      try {
        writeFile(candidate.path, candidate.source);
      } catch (rollbackError: unknown) {
        rollbackErrors.push(`${candidate.path}: ${errorMessage(rollbackError)}`);
      }
    }
    if (rollbackErrors.length > 0) {
      throw new Error(
        `source mapping sync write failed: ${errorMessage(error)}; rollback failed: ${rollbackErrors.join(", ")}`,
        { cause: error }
      );
    }
    throw new Error(
      `source mapping sync write failed: ${errorMessage(error)}; restored: ${attemptedCandidates
        .map((candidate) => candidate.path)
        .join(", ")}`,
      { cause: error }
    );
  }
}

function auditDefaultSourceIdentity(paths: SourceMappingPaths): void {
  if (
    paths.identityManifestPath !== identityManifestPath ||
    paths.packageContractPath !== packageContractPath ||
    paths.provenancePath !== provenancePath
  ) {
    throw new Error("the default source identity audit only accepts repository mapping paths");
  }
  runProcessInvocationSync(
    {
      args: ["test", sourceIdentityTestPath],
      command: process.execPath,
      cwd: repositoryRoot
    },
    { report: reportProcessOutput }
  );
}

function readJsonObject(source: string, description: string): Record<string, unknown> {
  let value: unknown;
  try {
    value = JSON.parse(source);
  } catch (error: unknown) {
    throw new Error(`${description} is invalid JSON: ${errorMessage(error)}`, { cause: error });
  }
  if (!isJsonObject(value)) throw new TypeError(`${description} must be an object`);
  return value;
}

function sha256(source: Buffer): string {
  return createHash("sha256").update(source).digest("hex");
}

function isJsonObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function parseAction(argv: readonly string[]): SourceMappingAction {
  if (argv.length === 0 || (argv.length === 1 && argv[0] === "check")) return "check";
  if (argv.length === 1 && argv[0] === "sync") return "sync";
  throw new Error("usage: bun run source-mapping -- [check|sync]");
}

interface SynchronizationCandidate {
  readonly path: string;
  readonly source: string;
  readonly synchronizedSource: string;
}

if (import.meta.main) {
  try {
    const action = parseAction(process.argv.slice(2));
    const result =
      action === "sync" ? syncTranslatedSourceMapping() : checkTranslatedSourceMapping();
    const updatedPaths = result.changedPaths.join(", ");
    console.log(
      updatedPaths.length === 0
        ? `source mapping ${action} passed: no files updated`
        : `source mapping ${action} passed: updated ${updatedPaths}`
    );
  } catch (error: unknown) {
    console.error(`source mapping ${process.argv[2] ?? "check"} failed: ${errorMessage(error)}`);
    process.exitCode = 1;
  }
}

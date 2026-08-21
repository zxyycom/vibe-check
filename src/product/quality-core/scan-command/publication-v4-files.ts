import { randomUUID } from "node:crypto";
import fs from "node:fs";
import { join } from "node:path";

import { planPublicationCleanupV4 } from "../output/publication-v4/index.ts";

interface PublicationCandidatePath {
  readonly canonical: string;
  readonly contents: string;
  readonly temp: string;
}

interface PublicationCandidates {
  readonly recordsNdjson: string;
  readonly runJson: string;
}

/** Writes an already validated two-file candidate set through owned temporary paths. */
export function publishPublicationCandidatesV4(
  artifactDir: string,
  candidates: PublicationCandidates
): void {
  fs.mkdirSync(artifactDir, { recursive: true });
  const files = publicationCandidatePaths(artifactDir, randomUUID(), candidates);
  let hasReplacedCanonicalPath = false;
  try {
    fs.mkdirSync(join(artifactDir, "raw"), { recursive: true });
    cleanupOwnedTemps(artifactDir);
    for (const file of files) {
      fs.writeFileSync(file.temp, file.contents, { encoding: "utf8", flag: "wx" });
    }
    for (const file of files) {
      fs.renameSync(file.temp, file.canonical);
      hasReplacedCanonicalPath = true;
    }
    cleanupRetiredArtifacts(artifactDir);
  } catch (error: unknown) {
    if (hasReplacedCanonicalPath) cleanupPublicationV4BestEffort(artifactDir);
    else cleanupOwnedTempsBestEffort(artifactDir);
    throw error;
  }
}

export function cleanupPublicationV4(artifactDir: string): void {
  const plan = planPublicationCleanupV4(artifactDir);
  removePaths([...plan.canonicalPaths, ...plan.retiredPaths, ...plan.ownedTempPaths]);
}

export function cleanupPublicationV4BestEffort(artifactDir: string): void {
  try {
    cleanupPublicationV4(artifactDir);
  } catch {
    // Failure cleanup cannot conceal the original publication failure.
  }
}

function publicationCandidatePaths(
  artifactDir: string,
  token: string,
  candidates: PublicationCandidates
): readonly PublicationCandidatePath[] {
  return [
    {
      canonical: join(artifactDir, "run.json"),
      contents: candidates.runJson,
      temp: join(artifactDir, `.vibe-check-publication-${token}-run.json.tmp`)
    },
    {
      canonical: join(artifactDir, "records.ndjson"),
      contents: candidates.recordsNdjson,
      temp: join(artifactDir, `.vibe-check-publication-${token}-records.ndjson.tmp`)
    }
  ];
}

function cleanupOwnedTemps(artifactDir: string): void {
  removePaths(planPublicationCleanupV4(artifactDir).ownedTempPaths);
}

function cleanupOwnedTempsBestEffort(artifactDir: string): void {
  try {
    cleanupOwnedTemps(artifactDir);
  } catch {
    // Failure cleanup cannot conceal the original publication failure.
  }
}

function cleanupRetiredArtifacts(artifactDir: string): void {
  removePaths(planPublicationCleanupV4(artifactDir).retiredPaths);
}

function removePaths(paths: readonly string[]): void {
  let firstFailure: unknown;
  for (const path of paths) {
    try {
      fs.rmSync(path, { force: true, recursive: true });
    } catch (error: unknown) {
      firstFailure ??= error;
    }
  }
  if (firstFailure !== undefined) throw firstFailure;
}

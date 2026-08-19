import { randomUUID } from "node:crypto";
import fs from "node:fs";
import { join } from "node:path";

import { planPublicationCleanupV3 } from "../output/publication-v3/index.ts";

interface PublicationCandidatePath {
  readonly canonical: string;
  readonly contents: string;
  readonly kind: "machine" | "report";
  readonly temp: string;
}

interface PublicationCandidates {
  readonly recordsNdjson: string;
  readonly report: string;
  readonly runJson: string;
}

/** Writes an already validated candidate set through owned temporary paths. */
export function publishPublicationCandidatesV3(
  artifactDir: string,
  candidates: PublicationCandidates
): void {
  fs.mkdirSync(artifactDir, { recursive: true });
  const token = randomUUID();
  const files = publicationCandidatePaths(artifactDir, token, candidates);
  let hasReplacedCanonicalPath = false;
  try {
    fs.mkdirSync(join(artifactDir, "raw"), { recursive: true });
    cleanupOwnedTemps(artifactDir);
    for (const file of files) {
      fs.writeFileSync(file.temp, file.contents, { encoding: "utf8", flag: "wx" });
    }
    for (const file of files) {
      if (file.kind !== "machine") continue;
      fs.renameSync(file.temp, file.canonical);
      hasReplacedCanonicalPath = true;
    }
    const report = files.find((file) => file.kind === "report");
    if (report === undefined) throw new Error("Publication report candidate is missing");
    fs.renameSync(report.temp, report.canonical);
    cleanupRetiredArtifacts(artifactDir);
  } catch (error: unknown) {
    if (hasReplacedCanonicalPath) cleanupPublicationV3BestEffort(artifactDir);
    else cleanupOwnedTempsBestEffort(artifactDir);
    throw error;
  }
}

export function cleanupPublicationV3(artifactDir: string): void {
  const plan = planPublicationCleanupV3(artifactDir);
  removePaths([...plan.canonicalPaths, ...plan.retiredPaths, ...plan.ownedTempPaths]);
}

export function cleanupPublicationV3BestEffort(artifactDir: string): void {
  try {
    cleanupPublicationV3(artifactDir);
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
      kind: "machine",
      temp: join(artifactDir, `.vibe-check-publication-${token}-run.json.tmp`)
    },
    {
      canonical: join(artifactDir, "records.ndjson"),
      contents: candidates.recordsNdjson,
      kind: "machine",
      temp: join(artifactDir, `.vibe-check-publication-${token}-records.ndjson.tmp`)
    },
    {
      canonical: join(artifactDir, "report.md"),
      contents: candidates.report,
      kind: "report",
      temp: join(artifactDir, `.vibe-check-publication-${token}-report.md.tmp`)
    }
  ];
}

function cleanupOwnedTemps(artifactDir: string): void {
  removePaths(planPublicationCleanupV3(artifactDir).ownedTempPaths);
}

function cleanupOwnedTempsBestEffort(artifactDir: string): void {
  try {
    cleanupOwnedTemps(artifactDir);
  } catch {
    // Failure cleanup cannot conceal the original publication failure.
  }
}

function cleanupRetiredArtifacts(artifactDir: string): void {
  removePaths(planPublicationCleanupV3(artifactDir).retiredPaths);
}

function removePaths(paths: readonly string[]): void {
  let hasFailure = false;
  let firstFailure: unknown;
  for (const path of paths) {
    try {
      fs.rmSync(path, { force: true, recursive: true });
    } catch (error: unknown) {
      if (!hasFailure) firstFailure = error;
      hasFailure = true;
    }
  }
  if (hasFailure) throw firstFailure;
}

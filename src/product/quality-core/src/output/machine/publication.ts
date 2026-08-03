import { randomUUID } from "node:crypto";
import { readdirSync, renameSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";

import type { serializeMachineArtifactCandidatesV1 } from "./serializers.ts";
import {
  validateMachineArtifactSetV1,
  type MachineValidationDiagnostic
} from "./validation.ts";

const MACHINE_ARTIFACTS = [
  { candidate: "metricsJson", fileName: "metrics.json" },
  {
    candidate: "warningsNdjson",
    fileName: "warnings.ndjson"
  },
  {
    candidate: "warningsAllNdjson",
    fileName: "warnings-all.ndjson"
  }
] as const;
const OWNED_TEMP_PREFIX = ".vibe-check-machine-";
const OWNED_TEMP_SUFFIX = ".tmp";
const TEXT_ENCODER = new TextEncoder();

type MachineArtifactCandidatesV1 = ReturnType<
  typeof serializeMachineArtifactCandidatesV1
>;

export interface MachineArtifactPublicationPathsV1 {
  readonly metricsPath: string;
  readonly warningsAllPath: string;
  readonly warningsPath: string;
}

/** Narrow seam for deterministic publication failure tests. */
export interface MachinePublicationFileOps {
  readonly list: (directory: string) => readonly string[];
  readonly remove: (path: string) => void;
  readonly rename: (from: string, to: string) => void;
  readonly write: (path: string, bytes: Uint8Array) => void;
}

const NODE_FILE_OPS: MachinePublicationFileOps = {
  list: (directory) => readdirSync(directory),
  remove: (path) => rmSync(path, { force: true }),
  rename: (from, to) => renameSync(from, to),
  write: (path, bytes) => writeFileSync(path, bytes, { flag: "wx" })
};

export function publishMachineArtifactCandidatesV1(
  artifactDir: string,
  candidates: MachineArtifactCandidatesV1,
  fileOps: MachinePublicationFileOps = NODE_FILE_OPS
): MachineArtifactPublicationPathsV1 {
  const bytes = {
    metricsJson: TEXT_ENCODER.encode(candidates.metricsJson),
    warningsAllNdjson: TEXT_ENCODER.encode(candidates.warningsAllNdjson),
    warningsNdjson: TEXT_ENCODER.encode(candidates.warningsNdjson)
  };
  const validation = validateMachineArtifactSetV1(bytes);
  if (!validation.ok) {
    cleanupMachineArtifactPublicationV1(artifactDir, fileOps);
    throw new Error(formatCandidateValidationFailure(validation.diagnostic));
  }

  try {
    const cleanupErrors = cleanupMachineArtifactPublicationV1(
      artifactDir,
      fileOps
    );
    if (cleanupErrors.length > 0) throw cleanupErrors[0];

    const token = randomUUID();
    const tempPaths = MACHINE_ARTIFACTS.map(({ candidate, fileName }) => ({
      bytes: bytes[candidate],
      canonicalPath: join(artifactDir, fileName),
      tempPath: join(
        artifactDir,
        `${OWNED_TEMP_PREFIX}${token}-${fileName}${OWNED_TEMP_SUFFIX}`
      )
    }));
    for (const artifact of tempPaths) {
      fileOps.write(artifact.tempPath, artifact.bytes);
    }
    for (const artifact of tempPaths) {
      fileOps.rename(artifact.tempPath, artifact.canonicalPath);
    }
  } catch (error: unknown) {
    cleanupMachineArtifactPublicationV1(artifactDir, fileOps);
    throw error;
  }

  return {
    metricsPath: join(artifactDir, "metrics.json"),
    warningsAllPath: join(artifactDir, "warnings-all.ndjson"),
    warningsPath: join(artifactDir, "warnings.ndjson")
  };
}

export function cleanupMachineArtifactPublicationV1(
  artifactDir: string,
  fileOps: MachinePublicationFileOps = NODE_FILE_OPS
): readonly unknown[] {
  const errors: unknown[] = [];
  let entries: readonly string[] = [];
  try {
    entries = fileOps.list(artifactDir);
  } catch (error: unknown) {
    errors.push(error);
  }

  const paths = [
    ...MACHINE_ARTIFACTS.map(({ fileName }) => join(artifactDir, fileName)),
    ...entries
      .filter(isOwnedMachineTemp)
      .map((fileName) => join(artifactDir, fileName))
  ];
  for (const path of paths) {
    try {
      fileOps.remove(path);
    } catch (error: unknown) {
      errors.push(error);
    }
  }
  return errors;
}

function isOwnedMachineTemp(fileName: string): boolean {
  return fileName.startsWith(OWNED_TEMP_PREFIX) &&
    fileName.endsWith(OWNED_TEMP_SUFFIX);
}

function formatCandidateValidationFailure(
  diagnostic: MachineValidationDiagnostic
): string {
  let location = "";
  if (diagnostic.pointer !== undefined) {
    location = ` at ${diagnostic.pointer || "/"}`;
  } else if (diagnostic.line !== undefined) {
    location = ` at line ${diagnostic.line}`;
  } else if (diagnostic.index !== undefined) {
    location = ` at index ${diagnostic.index}`;
  }
  return (
    `Machine artifact candidate validation failed for ${diagnostic.logicalArtifact}` +
    `${location}: ${diagnostic.message}`
  );
}

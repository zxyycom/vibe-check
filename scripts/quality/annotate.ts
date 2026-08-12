#!/usr/bin/env bun

/** Renders a validated machine-v2 publication as non-blocking GitHub annotations. */

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { pathToFileURL } from "node:url";

import {
  validateMachinePublicationSetV2,
  type MachinePublicationValidationDiagnostic
} from "../../src/product/machine-output.ts";
import { errorMessage } from "../tools/foundation/src/errors.ts";
import { renderGithubAnnotations } from "./annotate/github.ts";

const DEFAULT_ARTIFACT_DIRECTORY = "artifacts/vibe-check-quality";
const DEFAULT_ANNOTATION_LIMIT = "5";
const POSITIVE_DECIMAL_PATTERN = /^[1-9][0-9]*$/;

function main(args: readonly string[]): number {
  try {
    const { artifactDirectory, limit } = parseArguments(args);
    const validation = validateMachinePublicationSetV2({
      runJson: readArtifact(artifactDirectory, "run.json"),
      recordsNdjson: readArtifact(artifactDirectory, "records.ndjson")
    });
    if (!validation.ok) {
      throw new Error(formatValidationDiagnostic(validation.diagnostic));
    }

    const annotatableRecords = validation.value.records.filter((record) => record.level !== "info");
    for (const annotation of renderGithubAnnotations(annotatableRecords.slice(0, limit))) {
      console.log(annotation);
    }
    if (annotatableRecords.length > limit) {
      console.log(
        `Quality record annotation limit: showing ${limit} of ${annotatableRecords.length}; see ${artifactDirectory}`
      );
    }
    return 0;
  } catch (error: unknown) {
    console.error(`Quality annotation failed: ${errorMessage(error)}`);
    return 2;
  }
}

function parseArguments(args: readonly string[]): {
  artifactDirectory: string;
  limit: number;
} {
  if (args.length > 2) {
    throw new Error(`argument failure: expected [artifact-directory] [limit], received ${args.length} arguments`);
  }
  return {
    artifactDirectory: args[0] ?? DEFAULT_ARTIFACT_DIRECTORY,
    limit: parseAnnotationLimit(args[1] ?? DEFAULT_ANNOTATION_LIMIT)
  };
}

function readArtifact(artifactDirectory: string, filename: "records.ndjson" | "run.json"): Uint8Array {
  const artifactPath = join(artifactDirectory, filename);
  try {
    return readFileSync(artifactPath);
  } catch (error: unknown) {
    throw new Error(`failed to read ${filename} from ${artifactDirectory}: ${errorMessage(error)}`, {
      cause: error
    });
  }
}

function parseAnnotationLimit(value: string): number {
  if (!POSITIVE_DECIMAL_PATTERN.test(value)) {
    throw new Error(`quality annotation limit must be a canonical positive decimal integer: ${value}`);
  }
  const limit = Number(value);
  if (!Number.isSafeInteger(limit)) {
    throw new Error(`quality annotation limit must not exceed Number.MAX_SAFE_INTEGER: ${value}`);
  }
  return limit;
}

function formatValidationDiagnostic(diagnostic: MachinePublicationValidationDiagnostic): string {
  const location = [
    diagnostic.line === undefined ? null : `line ${diagnostic.line}`,
    diagnostic.index === undefined ? null : `record index ${diagnostic.index}`,
    diagnostic.pointer === undefined ? null : `pointer ${diagnostic.pointer || "/"}`,
    diagnostic.relationship === undefined ? null : `relationship ${diagnostic.relationship}`
  ].filter((value): value is string => value !== null);
  const locationText = location.length === 0 ? "" : ` (${location.join(", ")})`;
  return `${diagnostic.logicalArtifact}: ${diagnostic.category}${locationText}: ${diagnostic.message}`;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  process.exitCode = main(process.argv.slice(2));
}

#!/usr/bin/env bun

/** Renders a validated current warning stream as non-blocking GitHub Actions annotations. */

import { readFileSync } from "node:fs";
import { pathToFileURL } from "node:url";

import {
  validateMachineWarningStreamV1,
  type MachineValidationDiagnostic
} from "../../src/product/machine-output.ts";
import { errorMessage } from "../tools/foundation/src/errors.ts";
import { renderGithubAnnotations } from "./annotate/github.ts";

const DEFAULT_WARNINGS_PATH = "artifacts/vibe-check-quality/warnings-all.ndjson";
const DEFAULT_ANNOTATION_LIMIT = "5";
const POSITIVE_DECIMAL_PATTERN = /^[1-9][0-9]*$/;

function main(args: readonly string[]): number {
  try {
    const { limit, warningsPath } = parseArguments(args);
    let bytes: Uint8Array;
    try {
      bytes = readFileSync(warningsPath);
    } catch (error: unknown) {
      throw new Error(`failed to read ${warningsPath}: ${errorMessage(error)}`, {
        cause: error
      });
    }

    const validation = validateMachineWarningStreamV1(bytes, warningsPath);
    if (!validation.ok) {
      throw new Error(formatValidationDiagnostic(validation.diagnostic));
    }

    const annotatableWarnings = validation.value.filter(
      (warning) => warning.level !== "info"
    );
    for (const annotation of renderGithubAnnotations(
      annotatableWarnings.slice(0, limit)
    )) {
      console.log(annotation);
    }
    if (annotatableWarnings.length > limit) {
      console.log(
        `Quality warning annotation limit: showing ${limit} of ${annotatableWarnings.length}; see ${warningsPath}`
      );
    }
    return 0;
  } catch (error: unknown) {
    console.error(`Quality annotation failed: ${errorMessage(error)}`);
    return 2;
  }
}

function parseArguments(args: readonly string[]): {
  limit: number;
  warningsPath: string;
} {
  if (args.length > 2) {
    throw new Error(`argument failure: expected [warnings-path] [limit], received ${args.length} arguments`);
  }
  return {
    limit: parseAnnotationLimit(args[1] ?? DEFAULT_ANNOTATION_LIMIT),
    warningsPath: args[0] ?? DEFAULT_WARNINGS_PATH
  };
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

function formatValidationDiagnostic(diagnostic: MachineValidationDiagnostic): string {
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

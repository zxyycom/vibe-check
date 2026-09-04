import fs from "node:fs";

import { expectedDocsValidationFailure } from "../diagnostics.ts";
import { toDocumentationAbsolutePath } from "../repository-paths.ts";
import { artifactPath } from "./diagnostics.ts";
import { validateArtifactSetInvariants } from "./invariants.ts";
import { createCurrentSchemaValidators, validateRecordStream, validateRun } from "./parsing.ts";
import {
  CURRENT_MACHINE_EXAMPLE,
  CURRENT_MACHINE_EXAMPLE_FILES,
  CURRENT_MACHINE_EXAMPLES_ROOT,
  RECORDS_ARTIFACT,
  RUN_ARTIFACT,
  type DocsMachineArtifactBytes,
  type DocsMachineValidationResult
} from "./artifact-shapes.ts";

export type {
  DocsMachineArtifactBytes,
  DocsMachineSetRelationship,
  DocsMachineValidationCategory,
  DocsMachineValidationDiagnostic,
  DocsMachineValidationResult
} from "./artifact-shapes.ts";

export function validatePublishedMachineArtifactExamples(): number {
  assertExactExampleInventory();
  const schemas = createCurrentSchemaValidators();
  const artifactRoot = `${CURRENT_MACHINE_EXAMPLES_ROOT}/${CURRENT_MACHINE_EXAMPLE}`;
  const result = validateDocsMachineArtifactSetWithSchemas(
    {
      runJson: readArtifactBytes(artifactRoot, RUN_ARTIFACT),
      recordsNdjson: readArtifactBytes(artifactRoot, RECORDS_ARTIFACT)
    },
    artifactRoot,
    schemas
  );
  if (!result.ok) {
    throw expectedDocsValidationFailure([
      Object.freeze({
        data: Object.freeze({
          category: result.diagnostic.category,
          kind: "machine-artifact-example-invalid",
          logicalArtifact: result.diagnostic.logicalArtifact,
          path: result.diagnostic.path
        }),
        id: `machine-artifact:${result.diagnostic.category}:${encodeURIComponent(result.diagnostic.path)}`,
        presentation: `${result.diagnostic.path}: current machine artifact example is invalid (${result.diagnostic.category}).`
      })
    ]);
  }
  return 1;
}

export function validateDocsMachineArtifactSet(
  artifacts: DocsMachineArtifactBytes,
  artifactRoot: string
): DocsMachineValidationResult {
  return validateDocsMachineArtifactSetWithSchemas(
    artifacts,
    artifactRoot,
    createCurrentSchemaValidators()
  );
}

function validateDocsMachineArtifactSetWithSchemas(
  artifacts: DocsMachineArtifactBytes,
  artifactRoot: string,
  schemas: ReturnType<typeof createCurrentSchemaValidators>
): DocsMachineValidationResult {
  const runResult = validateRun(artifacts.runJson, artifactRoot, schemas);
  if (!runResult.ok) return runResult;
  const recordsResult = validateRecordStream(artifacts.recordsNdjson, artifactRoot, schemas);
  if (!recordsResult.ok) return recordsResult;
  const invariantFailure = validateArtifactSetInvariants(
    runResult.value,
    recordsResult.value,
    artifactRoot
  );
  if (invariantFailure) return invariantFailure;
  return {
    ok: true,
    value: { run: runResult.value, records: recordsResult.value }
  };
}

function assertExactExampleInventory(): void {
  const entries = readCurrentExampleRootDirectory();
  assertCurrentExampleDirectoryInventory(entries);
  const exampleRoot = `${CURRENT_MACHINE_EXAMPLES_ROOT}/${CURRENT_MACHINE_EXAMPLE}`;
  assertCurrentExampleFileInventory(readExampleDirectory(exampleRoot), exampleRoot);
}

function readCurrentExampleRootDirectory(): fs.Dirent[] {
  try {
    return fs.readdirSync(toDocumentationAbsolutePath(CURRENT_MACHINE_EXAMPLES_ROOT), {
      withFileTypes: true
    });
  } catch (error: unknown) {
    if (!isMissingFile(error)) throw error;
    throw machineArtifactFailure("machine-artifact-root-missing", CURRENT_MACHINE_EXAMPLES_ROOT);
  }
}

function assertCurrentExampleDirectoryInventory(entries: readonly fs.Dirent[]): void {
  for (const entry of entries) {
    if (!entry.isDirectory() || entry.name !== CURRENT_MACHINE_EXAMPLE) {
      throw machineArtifactFailure(
        "machine-artifact-inventory-drift",
        `${CURRENT_MACHINE_EXAMPLES_ROOT}/${entry.name}`
      );
    }
  }
  if (entries.length === 0) {
    throw machineArtifactFailure(
      "machine-artifact-example-missing",
      `${CURRENT_MACHINE_EXAMPLES_ROOT}/${CURRENT_MACHINE_EXAMPLE}`
    );
  }
}

function assertCurrentExampleFileInventory(files: readonly fs.Dirent[], exampleRoot: string): void {
  const expectedFiles = new Set<string>(CURRENT_MACHINE_EXAMPLE_FILES);
  for (const entry of files) {
    if (!entry.isFile() || !expectedFiles.has(entry.name)) {
      throw machineArtifactFailure(
        "machine-artifact-inventory-drift",
        `${exampleRoot}/${entry.name}`
      );
    }
  }
  const presentFiles = new Set(files.map((entry) => entry.name));
  for (const fileName of CURRENT_MACHINE_EXAMPLE_FILES) {
    if (!presentFiles.has(fileName)) {
      throw machineArtifactFailure(
        "machine-artifact-example-missing",
        `${exampleRoot}/${fileName}`
      );
    }
  }
}

function readExampleDirectory(relativePath: string): fs.Dirent[] {
  try {
    return fs.readdirSync(toDocumentationAbsolutePath(relativePath), { withFileTypes: true });
  } catch (error: unknown) {
    if (!isMissingFile(error)) throw error;
    throw machineArtifactFailure("machine-artifact-example-directory-missing", relativePath);
  }
}

function readArtifactBytes(artifactRoot: string, logicalArtifact: string): Buffer {
  const relativePath = artifactPath(artifactRoot, logicalArtifact);
  try {
    return fs.readFileSync(toDocumentationAbsolutePath(relativePath));
  } catch (error: unknown) {
    if (!isMissingFile(error)) throw error;
    throw machineArtifactFailure("machine-artifact-example-missing", relativePath);
  }
}

function machineArtifactFailure(kind: string, path: string): Error {
  return expectedDocsValidationFailure([
    Object.freeze({
      data: Object.freeze({ kind, path }),
      id: `machine-artifact:${kind}:${encodeURIComponent(path)}`,
      presentation: `${path}: ${kind.replaceAll("-", " ")}.`
    })
  ]);
}

function isMissingFile(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as Readonly<{ readonly code?: unknown }>).code === "ENOENT"
  );
}

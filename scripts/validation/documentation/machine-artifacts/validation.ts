import fs from "node:fs";

import { toDocumentationAbsolutePath } from "../repository-paths.ts";
import { artifactPath, formatDiagnostic } from "./diagnostics.ts";
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
  if (!result.ok) throw new Error(formatDiagnostic(result.diagnostic));
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
  let entries: fs.Dirent[];
  try {
    entries = fs.readdirSync(toDocumentationAbsolutePath(CURRENT_MACHINE_EXAMPLES_ROOT), {
      withFileTypes: true
    });
  } catch {
    throw new Error(
      `current machine artifact example root is missing or unreadable: ${CURRENT_MACHINE_EXAMPLES_ROOT}`
    );
  }
  for (const entry of entries) {
    if (!entry.isDirectory() || entry.name !== CURRENT_MACHINE_EXAMPLE) {
      throw new Error(
        `unexpected current machine artifact example path: ${CURRENT_MACHINE_EXAMPLES_ROOT}/${entry.name}; expected exactly ${CURRENT_MACHINE_EXAMPLE}`
      );
    }
  }
  const example = entries.find(
    (entry) => entry.isDirectory() && entry.name === CURRENT_MACHINE_EXAMPLE
  );
  if (example === undefined) {
    throw new Error(
      `missing current machine artifact example directory: ${CURRENT_MACHINE_EXAMPLES_ROOT}/${CURRENT_MACHINE_EXAMPLE}`
    );
  }
  const exampleRoot = `${CURRENT_MACHINE_EXAMPLES_ROOT}/${CURRENT_MACHINE_EXAMPLE}`;
  const files = readExampleDirectory(exampleRoot);
  const expectedFiles = new Set<string>(CURRENT_MACHINE_EXAMPLE_FILES);
  for (const entry of files) {
    if (!entry.isFile() || !expectedFiles.has(entry.name)) {
      throw new Error(
        `unexpected current machine artifact example path: ${exampleRoot}/${entry.name}`
      );
    }
  }
  for (const fileName of CURRENT_MACHINE_EXAMPLE_FILES) {
    if (!files.some((entry) => entry.isFile() && entry.name === fileName)) {
      throw new Error(`missing current machine artifact example file: ${exampleRoot}/${fileName}`);
    }
  }
}

function readExampleDirectory(relativePath: string): fs.Dirent[] {
  try {
    return fs.readdirSync(toDocumentationAbsolutePath(relativePath), { withFileTypes: true });
  } catch {
    throw new Error(`current machine artifact example directory is unreadable: ${relativePath}`);
  }
}

function readArtifactBytes(artifactRoot: string, logicalArtifact: string): Buffer {
  const relativePath = artifactPath(artifactRoot, logicalArtifact);
  try {
    return fs.readFileSync(toDocumentationAbsolutePath(relativePath));
  } catch {
    throw new Error(`current machine artifact example is unreadable: ${relativePath}`);
  }
}

import fs from "node:fs";

import { toAbs } from "../repo/paths.ts";
import { artifactPath, formatDiagnostic } from "./diagnostics.ts";
import { validateArtifactSetInvariants } from "./invariants.ts";
import { createCurrentSchemaValidators, validateRecordStream, validateRun } from "./parsing.ts";
import {
  CURRENT_MACHINE_EXAMPLES_ROOT,
  CURRENT_MACHINE_OUTCOMES,
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
  assertExactOutcomeInventory();
  const schemas = createCurrentSchemaValidators();
  for (const outcome of CURRENT_MACHINE_OUTCOMES) {
    const artifactRoot = `${CURRENT_MACHINE_EXAMPLES_ROOT}/${outcome}`;
    const result = validateDocsMachineArtifactSetWithSchemas(
      {
        runJson: readArtifactBytes(artifactRoot, RUN_ARTIFACT),
        recordsNdjson: readArtifactBytes(artifactRoot, RECORDS_ARTIFACT)
      },
      artifactRoot,
      schemas
    );
    if (!result.ok) throw new Error(formatDiagnostic(result.diagnostic));
  }
  console.log(`current machine artifact examples ok: ${CURRENT_MACHINE_OUTCOMES.length} set(s)`);
  return CURRENT_MACHINE_OUTCOMES.length;
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

function assertExactOutcomeInventory(): void {
  let entries: fs.Dirent[];
  try {
    entries = fs.readdirSync(toAbs(CURRENT_MACHINE_EXAMPLES_ROOT), {
      withFileTypes: true
    });
  } catch {
    throw new Error(
      `current machine artifact example root is missing or unreadable: ${CURRENT_MACHINE_EXAMPLES_ROOT}`
    );
  }
  const expected = new Set<string>(CURRENT_MACHINE_OUTCOMES);
  for (const entry of entries) {
    if (!entry.isDirectory() || !expected.has(entry.name)) {
      throw new Error(
        `unexpected current machine artifact example path: ${CURRENT_MACHINE_EXAMPLES_ROOT}/${entry.name}; expected exactly ${CURRENT_MACHINE_OUTCOMES.join(", ")}`
      );
    }
  }
  for (const outcome of CURRENT_MACHINE_OUTCOMES) {
    if (!entries.some((entry) => entry.isDirectory() && entry.name === outcome)) {
      throw new Error(
        `missing current machine artifact example directory: ${CURRENT_MACHINE_EXAMPLES_ROOT}/${outcome}`
      );
    }
  }
}

function readArtifactBytes(artifactRoot: string, logicalArtifact: string): Buffer {
  const relativePath = artifactPath(artifactRoot, logicalArtifact);
  try {
    return fs.readFileSync(toAbs(relativePath));
  } catch {
    throw new Error(`current machine artifact example is unreadable: ${relativePath}`);
  }
}

import fs from "node:fs";

import { toAbs } from "../repo/paths.ts";
import {
  artifactPath,
  formatDiagnostic
} from "./machine-artifact-diagnostics.ts";
import { validateArtifactSetInvariants } from "./machine-artifact-invariants.ts";
import {
  validateMetrics,
  validateWarningStream
} from "./machine-artifact-parsing.ts";
import {
  CURRENT_MACHINE_EXAMPLES_ROOT,
  CURRENT_MACHINE_OUTCOMES,
  METRICS_ARTIFACT,
  WARNINGS_ALL_ARTIFACT,
  WARNINGS_ARTIFACT,
  type DocsMachineArtifactBytes,
  type DocsMachineValidationResult
} from "./machine-artifact-types.ts";

export type {
  DocsMachineArtifactBytes,
  DocsMachineSetRelationship,
  DocsMachineValidationCategory,
  DocsMachineValidationDiagnostic,
  DocsMachineValidationResult
} from "./machine-artifact-types.ts";

export function validatePublishedMachineArtifactExamples(): number {
  assertExactOutcomeInventory();
  for (const outcome of CURRENT_MACHINE_OUTCOMES) {
    const artifactRoot = `${CURRENT_MACHINE_EXAMPLES_ROOT}/${outcome}`;
    const result = validateDocsMachineArtifactSet({
      metricsJson: readArtifactBytes(artifactRoot, METRICS_ARTIFACT),
      warningsAllNdjson: readArtifactBytes(
        artifactRoot,
        WARNINGS_ALL_ARTIFACT
      ),
      warningsNdjson: readArtifactBytes(artifactRoot, WARNINGS_ARTIFACT)
    }, artifactRoot);
    if (!result.ok) throw new Error(formatDiagnostic(result.diagnostic));
  }
  console.log(
    `current machine artifact examples ok: ${CURRENT_MACHINE_OUTCOMES.length} set(s)`
  );
  return CURRENT_MACHINE_OUTCOMES.length;
}

export function validateDocsMachineArtifactSet(
  artifacts: DocsMachineArtifactBytes,
  artifactRoot: string
): DocsMachineValidationResult {
  const metricsResult = validateMetrics(artifacts.metricsJson, artifactRoot);
  if (!metricsResult.ok) return metricsResult;

  const warningsResult = validateWarningStream(
    artifacts.warningsNdjson,
    artifactRoot,
    WARNINGS_ARTIFACT
  );
  if (!warningsResult.ok) return warningsResult;

  const warningsAllResult = validateWarningStream(
    artifacts.warningsAllNdjson,
    artifactRoot,
    WARNINGS_ALL_ARTIFACT
  );
  if (!warningsAllResult.ok) return warningsAllResult;

  const metrics = metricsResult.value;
  const invariantFailure = validateArtifactSetInvariants(
    metrics,
    warningsResult.value,
    warningsAllResult.value,
    artifactRoot
  );
  if (invariantFailure) return invariantFailure;

  return {
    ok: true,
    value: {
      metrics,
      warnings: warningsResult.value,
      warningsAll: warningsAllResult.value
    }
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

function readArtifactBytes(
  artifactRoot: string,
  logicalArtifact: string
): Buffer {
  const relativePath = artifactPath(artifactRoot, logicalArtifact);
  try {
    return fs.readFileSync(toAbs(relativePath));
  } catch {
    throw new Error(`current machine artifact example is unreadable: ${relativePath}`);
  }
}

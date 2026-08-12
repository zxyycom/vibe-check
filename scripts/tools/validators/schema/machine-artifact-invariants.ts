import {
  catalogFingerprint,
  isCanonicalText,
  recordIdentity,
  sameText
} from "./machine-artifact-canonical.ts";
import { validateDecision } from "./machine-artifact-decision-invariants.ts";
import { setFailure } from "./machine-artifact-diagnostics.ts";
import { validateReferences } from "./machine-artifact-reference-invariants.ts";
import {
  RECORDS_ARTIFACT,
  RUN_ARTIFACT,
  type DocsMachineValidationFailure,
  type RecordShape,
  type RunShape
} from "./machine-artifact-types.ts";

export function validateArtifactSetInvariants(
  run: RunShape,
  records: readonly RecordShape[],
  artifactRoot: string
): DocsMachineValidationFailure | null {
  let failure = validateCatalogAndRuns(run, artifactRoot);
  if (failure !== null) return failure;
  failure = validateRecords(run, records, artifactRoot);
  if (failure !== null) return failure;
  failure = validateCompleteness(run, artifactRoot);
  if (failure !== null) return failure;
  failure = validateIntegrity(run, records, artifactRoot);
  if (failure !== null) return failure;
  failure = validateReferences(run, records, artifactRoot);
  if (failure !== null) return failure;
  return validateDecision(run, records, artifactRoot);
}

function validateCatalogAndRuns(
  run: RunShape,
  artifactRoot: string
): DocsMachineValidationFailure | null {
  if (catalogFingerprint(run.definitions) !== run.catalogFingerprint) {
    return setFailure(artifactRoot, RUN_ARTIFACT, {
      message: "Catalog fingerprint must match the published definitions.",
      pointer: "/catalogFingerprint",
      relationship: "catalog-fingerprint"
    });
  }
  const definitionIds = run.definitions.map(({ checkId }) => checkId);
  const runIds = run.runs.map(({ checkId }) => checkId);
  if (!isCanonicalText(definitionIds) || !sameText(definitionIds, runIds)) {
    return setFailure(artifactRoot, RUN_ARTIFACT, {
      message: "Every definition requires exactly one canonically ordered owned run.",
      pointer: "/runs",
      relationship: "catalog-run-membership"
    });
  }
  for (const checkRun of run.runs) {
    if (checkRun.coverage !== null && (
      checkRun.coverage.acknowledgedWorkCount > checkRun.coverage.plannedWorkCount
      || (checkRun.status === "completed"
        && checkRun.applicability === "applicable"
        && checkRun.coverage.acknowledgedWorkCount !== checkRun.coverage.plannedWorkCount)
    )) {
      return setFailure(artifactRoot, RUN_ARTIFACT, {
        message: "Run coverage must be manager-complete for completed applicable work.",
        pointer: "/runs",
        relationship: "catalog-run-membership"
      });
    }
  }
  return null;
}

function validateRecords(
  run: RunShape,
  records: readonly RecordShape[],
  artifactRoot: string
): DocsMachineValidationFailure | null {
  for (const [index, record] of records.entries()) {
    if (index > 0 && records[index - 1]!.recordId >= record.recordId) {
      return setFailure(artifactRoot, RECORDS_ARTIFACT, {
        index,
        line: index + 1,
        message: "Records must be uniquely sorted by recordId.",
        relationship: "record-canonical-order"
      });
    }
    const definition = run.definitions.find(({ checkId }) => checkId === record.checkId);
    const recordType = definition?.recordTypes.find(
      ({ recordTypeId }) => recordTypeId === record.recordTypeId
    );
    const owner = run.runs.find(({ checkId }) => checkId === record.checkId);
    if (
      recordType === undefined ||
      owner?.checkRunId !== record.checkRunId ||
      owner.applicability !== "applicable"
    ) {
      return setFailure(artifactRoot, RECORDS_ARTIFACT, {
        index,
        line: index + 1,
        message: "Record must belong to a published record type and applicable owning run.",
        relationship: "record-run-ownership"
      });
    }
    if (recordIdentity(record, recordType) !== record.recordId) {
      return setFailure(artifactRoot, RECORDS_ARTIFACT, {
        index,
        line: index + 1,
        message: "recordId must match the canonical semantic identity fields.",
        relationship: "record-identity"
      });
    }
  }
  return null;
}

function validateCompleteness(
  run: RunShape,
  artifactRoot: string
): DocsMachineValidationFailure | null {
  const selected = run.runs.filter(({ selection }) => selection === "selected");
  const expected = {
    status: selected.some(({ status }) => status === "failed") ? "incomplete" : "complete",
    selectedRunCount: selected.length,
    completedRunCount: selected.filter(({ status }) => status === "completed").length,
    failedRunCount: selected.filter(({ status }) => status === "failed").length,
    plannedWorkCount: selected.reduce((sum, item) => sum + item.coverage!.plannedWorkCount, 0),
    acknowledgedWorkCount: selected.reduce(
      (sum, item) => sum + item.coverage!.acknowledgedWorkCount,
      0
    )
  };
  if (Object.entries(expected).every(([key, value]) => (
    run.completeness[key as keyof typeof expected] === value
  ))) return null;
  return setFailure(artifactRoot, RUN_ARTIFACT, {
    message: "Completeness must equal the independent reduction of selected runs.",
    pointer: "/completeness",
    relationship: "completeness-reduction"
  });
}

function validateIntegrity(
  run: RunShape,
  records: readonly RecordShape[],
  artifactRoot: string
): DocsMachineValidationFailure | null {
  const expectedStatus = expectedIntegrityStatus(run);
  if (run.integrity.status !== expectedStatus) {
    return integrityFailure(artifactRoot, "Integrity status must match its evidence arrays.");
  }
  const recordIds = new Set(records.map(({ recordId }) => recordId));
  for (const evidence of [
    ...run.integrity.invalidRecords,
    ...run.integrity.conflicts
  ]) {
    const owner = run.runs.find(({ checkId }) => checkId === evidence.checkId);
    const definition = run.definitions.find(({ checkId }) => checkId === evidence.checkId);
    const ownsType = definition?.recordTypes.some(
      ({ recordTypeId }) => recordTypeId === evidence.recordTypeId
    );
    if (
      owner?.status !== "failed" ||
      owner.checkRunId !== evidence.checkRunId ||
      ownsType !== true ||
      (typeof evidence.recordId === "string" && recordIds.has(evidence.recordId))
    ) {
      return integrityFailure(
        artifactRoot,
        "Integrity evidence must belong to its failed run and record type."
      );
    }
  }
  return null;
}

function integrityFailure(artifactRoot: string, message: string) {
  return setFailure(artifactRoot, RUN_ARTIFACT, {
    message,
    pointer: "/integrity",
    relationship: "integrity-evidence"
  });
}

function expectedIntegrityStatus(run: RunShape): RunShape["integrity"]["status"] {
  if (run.integrity.conflicts.length > 0) return "conflicted";
  if (run.integrity.invalidRecords.length > 0) return "invalid";
  return "valid";
}

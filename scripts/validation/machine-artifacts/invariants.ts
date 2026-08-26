import { canonicalJsonText, isCanonicalText, recordsFingerprint } from "./canonical.ts";
import { setFailure } from "./diagnostics.ts";
import {
  RECORDS_ARTIFACT,
  RUN_ARTIFACT,
  type DocsMachineValidationFailure,
  type RecordShape,
  type RunShape
} from "./artifact-shapes.ts";

export function validateArtifactSetInvariants(
  run: RunShape,
  records: readonly RecordShape[],
  artifactRoot: string
): DocsMachineValidationFailure | null {
  if (!isCanonicalText(run.checks.map(({ checkId }) => checkId))) {
    return setFailure(artifactRoot, RUN_ARTIFACT, {
      message: "Checks must be uniquely sorted by checkId.",
      pointer: "/checks",
      relationship: "check-canonical-order"
    });
  }
  const recordOrderFailure = recordOrderFailureIndex(records);
  if (recordOrderFailure !== undefined) {
    return setFailure(artifactRoot, RECORDS_ARTIFACT, {
      index: recordOrderFailure,
      line: recordOrderFailure + 1,
      message: "Records must be uniquely sorted by the composite { checkId, id } identity.",
      relationship: "record-canonical-order"
    });
  }
  const checkIds = new Set(run.checks.map(({ checkId }) => checkId));
  const unknownIndex = records.findIndex(({ checkId }) => !checkIds.has(checkId));
  if (unknownIndex !== -1) {
    return setFailure(artifactRoot, RECORDS_ARTIFACT, {
      index: unknownIndex,
      line: unknownIndex + 1,
      message: "Every Record must name a published owning Check.",
      relationship: "record-check-ownership"
    });
  }
  const projectedCore = {
    checks: run.checks,
    records: records.map(({ schemaVersion: _schemaVersion, ...record }) => record)
  };
  const fingerprint = recordsFingerprint(records);
  if (fingerprint === undefined) {
    return setFailure(artifactRoot, RECORDS_ARTIFACT, {
      message: "Records must remain canonical JSON before fingerprinting.",
      relationship: "canonical-json"
    });
  }
  if (canonicalJsonText(projectedCore) === undefined) {
    return setFailure(artifactRoot, RUN_ARTIFACT, {
      message: "Published Check and Record data must remain canonical JSON.",
      relationship: "canonical-json"
    });
  }
  if (fingerprint !== run.recordsFingerprint) {
    return setFailure(artifactRoot, RECORDS_ARTIFACT, {
      message: "Records fingerprint must match the complete canonical Record row set.",
      relationship: "records-fingerprint"
    });
  }
  return null;
}

function recordOrderFailureIndex(records: readonly RecordShape[]): number | undefined {
  for (let index = 1; index < records.length; index += 1) {
    const previous = records[index - 1];
    const current = records[index];
    if (previous === undefined || current === undefined) {
      throw new Error("Record order index is outside the input array");
    }
    if (
      previous.checkId > current.checkId ||
      (previous.checkId === current.checkId && previous.id >= current.id)
    ) {
      return index;
    }
  }
  return undefined;
}

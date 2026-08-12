import { createHash } from "node:crypto";

import { setFailure } from "./machine-artifact-diagnostics.ts";
import {
  RECORDS_ARTIFACT,
  RUN_ARTIFACT,
  type DefinitionShape,
  type DocsMachineValidationFailure,
  type EvidenceRefShape,
  type JsonRecord,
  type RecordShape,
  type RecordTypeShape,
  type RunShape
} from "./machine-artifact-types.ts";

export function validateArtifactSetInvariants(
  run: RunShape,
  records: readonly RecordShape[],
  artifactRoot: string
): DocsMachineValidationFailure | null {
  return validateCatalogAndRuns(run, artifactRoot)
    ?? validateRecords(run, records, artifactRoot)
    ?? validateCompleteness(run, artifactRoot)
    ?? validateIntegrity(run, records, artifactRoot)
    ?? validateReferences(run, records, artifactRoot)
    ?? validateDecision(run, records, artifactRoot);
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

function validateReferences(
  run: RunShape,
  records: readonly RecordShape[],
  artifactRoot: string
): DocsMachineValidationFailure | null {
  const identities = run.references.identities;
  const evidence = run.references.evidence;
  const relations = run.references.relations;
  if (
    !isCanonical(identities, ({ referenceName }) => referenceName) ||
    !isCanonical(evidence, referenceEvidenceKey) ||
    !isCanonical(relations, relationKey)
  ) {
    return setFailure(artifactRoot, RUN_ARTIFACT, {
      message: "Reference arrays must use canonical unique order.",
      pointer: "/references",
      relationship: "reference-canonical-order"
    });
  }
  if (
    new Set(identities.map(({ referenceId }) => referenceId)).size !== identities.length
  ) {
    return setFailure(artifactRoot, RUN_ARTIFACT, {
      message: "Reference names and identities must both be unique.",
      pointer: "/references/identities",
      relationship: "reference-identity"
    });
  }
  const referenceNames = new Set(identities.map(({ referenceName }) => referenceName));
  const checkIds = new Set(run.definitions.map(({ checkId }) => checkId));
  if (evidence.some((item) => (
    !referenceNames.has(item.referenceName) || !checkIds.has(item.checkId)
  ))) {
    return setFailure(artifactRoot, RUN_ARTIFACT, {
      message: "Reference evidence requires a published Check/reference pair.",
      pointer: "/references/evidence",
      relationship: "reference-evidence"
    });
  }
  const evidencePairs = new Map(evidence.map((item) => [referenceEvidenceKey(item), item]));
  for (const relation of relations) {
    const record = records.find(({ recordId }) => recordId === relation.recordId);
    const recordType = run.definitions
      .find(({ checkId }) => checkId === record?.checkId)
      ?.recordTypes.find(({ recordTypeId }) => recordTypeId === record?.recordTypeId);
    const pair = record === undefined
      ? undefined
      : evidencePairs.get(`${record.checkId}\u0000${relation.referenceName}`);
    if (
      record === undefined ||
      pair?.status !== "complete" ||
      !recordType?.policy?.relations.includes(relation.relationId)
    ) {
      return setFailure(artifactRoot, RUN_ARTIFACT, {
        message: "Reference relation must bind a record to registered complete evidence.",
        pointer: "/references/relations",
        relationship: "reference-relation"
      });
    }
  }
  return null;
}

function validateDecision(
  run: RunShape,
  records: readonly RecordShape[],
  artifactRoot: string
): DocsMachineValidationFailure | null {
  const decision = run.decision;
  const recordIds = new Set(records.map(({ recordId }) => recordId));
  const runIds = new Set(run.runs.map(({ checkRunId }) => checkRunId));
  const viewIds = new Set(decision.views.map(({ viewId }) => viewId));
  const readinessIds = new Set(decision.readiness.map(({ readinessId }) => readinessId));
  const referenceByName = new Map(run.references.identities.map((identity) => [
    identity.referenceName,
    identity
  ]));
  const referencePairs = new Set(run.references.evidence.map(referenceEvidenceKey));
  const allRefs = [
    ...decision.readiness.flatMap(({ evidenceRefs }) => evidenceRefs),
    ...(decision.blockWhen?.evidenceRefs ?? []),
    ...(decision.gate.status === "disabled"
      ? []
      : decision.gate.evidenceRefs as readonly EvidenceRefShape[])
  ];
  for (const reference of allRefs) {
    const failure = validateEvidenceRef(
      reference,
      { recordIds, runIds, viewIds, readinessIds, referenceByName, referencePairs },
      artifactRoot
    );
    if (failure !== null) return failure;
  }
  const referencedRecordIds = [
    ...run.acceptance.map(({ recordId }) => recordId),
    ...run.references.relations.map(({ recordId }) => recordId),
    ...decision.views.flatMap(({ recordIds: ids }) => ids),
    ...(decision.blockWhen?.blockingRecordIds ?? []),
    ...((decision.gate.status === "passed" || decision.gate.status === "failed")
      ? decision.gate.blockingRecordIds as readonly string[]
      : [])
  ];
  if (referencedRecordIds.some((recordId) => !recordIds.has(recordId))) {
    return decisionFailure(
      artifactRoot,
      "decision-record-reference",
      "Decision references an unknown record."
    );
  }
  if (
    !isCanonical(run.acceptance, (item) => `${item.recordId}\u0000${item.acceptanceId}`) ||
    !isCanonical(decision.views, ({ viewId }) => viewId) ||
    decision.views.some(({ recordIds: ids }) => !isCanonicalText(ids)) ||
    !isCanonical(decision.readiness, ({ readinessId }) => readinessId) ||
    decision.readiness.some(({ evidenceRefs }) => !isCanonical(evidenceRefs, evidenceKey)) ||
    (decision.blockWhen !== null && (
      !isCanonical(decision.blockWhen.evidenceRefs, evidenceKey) ||
      !isCanonicalText(decision.blockWhen.blockingRecordIds)
    )) ||
    (decision.gate.status !== "disabled" &&
      !isCanonical(decision.gate.evidenceRefs as readonly EvidenceRefShape[], evidenceKey)) ||
    ((decision.gate.status === "passed" || decision.gate.status === "failed") &&
      !isCanonicalText(decision.gate.blockingRecordIds as readonly string[]))
  ) {
    return decisionFailure(
      artifactRoot,
      "decision-canonical-order",
      "Decision arrays must use canonical unique order."
    );
  }
  return validateDecisionState(run, artifactRoot);
}

function validateEvidenceRef(
  reference: EvidenceRefShape,
  sets: Readonly<{
    recordIds: ReadonlySet<string>;
    runIds: ReadonlySet<string>;
    viewIds: ReadonlySet<string>;
    readinessIds: ReadonlySet<string>;
    referenceByName: ReadonlyMap<string, { referenceId: string }>;
    referencePairs: ReadonlySet<string>;
  }>,
  artifactRoot: string
): DocsMachineValidationFailure | null {
  if (reference.kind === "record" && !sets.recordIds.has(reference.recordId as string)) {
    return decisionFailure(artifactRoot, "decision-record-reference", "Unknown record evidence ref.");
  }
  if (reference.kind === "run" && !sets.runIds.has(reference.checkRunId as string)) {
    return decisionFailure(artifactRoot, "decision-run-reference", "Unknown run evidence ref.");
  }
  if (reference.kind === "view" && !sets.viewIds.has(reference.viewId as string)) {
    return decisionFailure(artifactRoot, "decision-view-reference", "Unknown view evidence ref.");
  }
  if (
    reference.kind === "readiness" &&
    !sets.readinessIds.has(reference.readinessId as string)
  ) {
    return decisionFailure(
      artifactRoot,
      "decision-readiness-reference",
      "Unknown readiness evidence ref."
    );
  }
  if (reference.kind === "reference") {
    const referenceName = reference.referenceName as string;
    const identity = sets.referenceByName.get(referenceName);
    if (
      identity?.referenceId !== reference.referenceId ||
      !sets.referencePairs.has(`${String(reference.checkId)}\u0000${referenceName}`)
    ) {
      return decisionFailure(
        artifactRoot,
        "decision-reference-reference",
        "Unknown Check/reference evidence ref."
      );
    }
  }
  return null;
}

function validateDecisionState(
  run: RunShape,
  artifactRoot: string
): DocsMachineValidationFailure | null {
  const decision = run.decision;
  const gate = decision.gate;
  const failedReadiness = decision.readiness
    .map((evidence, index) => ({ evidence, index }))
    .filter(({ evidence }) => evidence.status === "failed");
  if (gate.status === "disabled") {
    return decision.policyId === null && decision.readiness.length === 0
      && decision.blockWhen === null && gate.policyId === null
      ? null
      : decisionFailure(artifactRoot, "decision-state", "Disabled decision is inconsistent.");
  }
  if (decision.policyId === null || gate.policyId !== decision.policyId) {
    return decisionFailure(artifactRoot, "decision-state", "Gate policy identity is inconsistent.");
  }
  if (gate.status === "not-evaluated") {
    const failed = failedReadiness[0];
    if (
      failedReadiness.length !== 1 ||
      failed === undefined ||
      failed.index !== decision.readiness.length - 1 ||
      decision.blockWhen !== null ||
      failed.evidence.reason !== gate.reason ||
      !sameEvidence(
        gate.evidenceRefs as readonly EvidenceRefShape[],
        readinessEvidencePrefix(decision.readiness.slice(0, failed.index + 1))
      )
    ) {
      return decisionFailure(
        artifactRoot,
        "decision-state",
        "Not-evaluated gate does not close readiness evidence."
      );
    }
    return null;
  }
  const blockWhen = decision.blockWhen;
  if (
    failedReadiness.length !== 0 ||
    blockWhen === null ||
    (gate.status === "failed") !== (blockWhen.status === "matched") ||
    !sameText(
      gate.blockingRecordIds as readonly string[],
      blockWhen.blockingRecordIds
    ) ||
    !sameEvidence(gate.evidenceRefs as readonly EvidenceRefShape[], [
      ...readinessEvidencePrefix(decision.readiness),
      ...blockWhen.evidenceRefs
    ])
  ) {
    return decisionFailure(
      artifactRoot,
      "decision-state",
      "Evaluated gate does not close readiness and blockWhen evidence."
    );
  }
  return null;
}

function decisionFailure(
  artifactRoot: string,
  relationship: Parameters<typeof setFailure>[2]["relationship"],
  message: string
): DocsMachineValidationFailure {
  return setFailure(artifactRoot, RUN_ARTIFACT, {
    message,
    pointer: "/decision",
    relationship
  });
}

function catalogFingerprint(definitions: readonly DefinitionShape[]): string {
  const canonical = definitions.map((definition) => ({
    checkId: definition.checkId,
    displayName: definition.displayName,
    recordTypes: definition.recordTypes.map((recordType) => ({
      fields: recordType.fields.map((field) => ({ ...field }))
        .sort((left, right) => compareText(left.fieldId, right.fieldId)),
      identityFields: [...recordType.identityFields].sort(),
      policy: {
        operands: [...(recordType.policy?.operands ?? [])]
          .sort((left, right) => compareText(String(left.operandId), String(right.operandId))),
        relations: [...(recordType.policy?.relations ?? [])].sort()
      },
      recordTypeId: recordType.recordTypeId
    })).sort((left, right) => compareText(left.recordTypeId, right.recordTypeId))
  })).sort((left, right) => compareText(left.checkId, right.checkId));
  return `check-record/v1/catalog/sha256:${digest(canonical)}`;
}

function recordIdentity(record: RecordShape, recordType: RecordTypeShape): string {
  const identityFields = Object.fromEntries(recordType.identityFields.map((fieldId) => [
    fieldId,
    record.fields[fieldId]
  ]));
  return `check-record/v1/record/sha256:${digest({
    checkId: record.checkId,
    identityFields,
    recordTypeId: record.recordTypeId,
    semanticSubject: record.semanticSubject
      .replaceAll("\r\n", "\n")
      .replaceAll("\r", "\n")
      .normalize("NFC")
  })}`;
}

function digest(value: unknown): string {
  return createHash("sha256").update(canonicalJson(value)).digest("hex");
}

function canonicalJson(value: unknown): string {
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(",")}]`;
  const object = value as JsonRecord;
  return `{${Object.keys(object).sort().map((key) => (
    `${JSON.stringify(key)}:${canonicalJson(object[key])}`
  )).join(",")}}`;
}

function evidenceKey(reference: EvidenceRefShape): string {
  if (reference.kind === "run") return `0\u0000${String(reference.checkRunId)}`;
  if (reference.kind === "record") return `1\u0000${String(reference.recordId)}`;
  if (reference.kind === "reference") {
    return `2\u0000${String(reference.checkId)}\u0000${String(reference.referenceName)}\u0000${String(reference.referenceId)}`;
  }
  if (reference.kind === "view") return `3\u0000${String(reference.viewId)}`;
  return `4\u0000${String(reference.readinessId)}`;
}

function referenceEvidenceKey(value: { checkId: string; referenceName: string }): string {
  return `${value.checkId}\u0000${value.referenceName}`;
}

function relationKey(value: { recordId: string; referenceName: string }): string {
  return `${value.recordId}\u0000${value.referenceName}`;
}

function readinessEvidencePrefix(readiness: RunShape["decision"]["readiness"]) {
  return canonicalEvidence(readiness.flatMap(({ evidenceRefs }) => evidenceRefs));
}

function canonicalEvidence(references: readonly EvidenceRefShape[]): readonly EvidenceRefShape[] {
  return [...new Map(references.map((reference) => [evidenceKey(reference), reference]))]
    .sort(([left], [right]) => compareText(left, right))
    .map(([, reference]) => reference);
}

function sameEvidence(
  left: readonly EvidenceRefShape[],
  right: readonly EvidenceRefShape[]
): boolean {
  return sameText(left.map(evidenceKey), canonicalEvidence(right).map(evidenceKey));
}

function sameText(left: readonly string[], right: readonly string[]): boolean {
  return left.length === right.length && left.every((value, index) => value === right[index]);
}

function isCanonicalText(values: readonly string[]): boolean {
  return isCanonical(values, (value) => value);
}

function isCanonical<Value>(values: readonly Value[], key: (value: Value) => string): boolean {
  return values.every((value, index) => index === 0 || key(values[index - 1]!) < key(value));
}

function compareText(left: string, right: string): number {
  if (left < right) return -1;
  if (left > right) return 1;
  return 0;
}

function expectedIntegrityStatus(run: RunShape): RunShape["integrity"]["status"] {
  if (run.integrity.conflicts.length > 0) return "conflicted";
  if (run.integrity.invalidRecords.length > 0) return "invalid";
  return "valid";
}

import type { EvidenceRef } from "../../check-record/policy-model.ts";
import {
  MACHINE_RECORD_V2_IDENTITY,
  MACHINE_RUN_V2_IDENTITY
} from "./schema-identities.ts";
import type { ValidatedPublicationModelV2 } from "./model.ts";
import type { MachineRecordV2, MachineRunV2 } from "./schema.ts";

export interface MachinePublicationV2 {
  readonly records: readonly MachineRecordV2[];
  readonly run: MachineRunV2;
}

export function projectMachinePublicationV2(
  model: ValidatedPublicationModelV2
): MachinePublicationV2 {
  const decision = model.decision;
  const run: MachineRunV2 = {
    schemaVersion: MACHINE_RUN_V2_IDENTITY,
    invocation: { ...model.invocation },
    catalogFingerprint: model.snapshot.catalogFingerprint,
    definitions: model.snapshot.definitions.map((definition) => ({
      checkId: definition.checkId,
      displayName: definition.displayName,
      recordTypes: definition.recordTypes.map((recordType) => ({
        recordTypeId: recordType.recordTypeId,
        fields: recordType.fields.map((field) => ({ ...field })),
        identityFields: [...recordType.identityFields],
        ...(recordType.policy === undefined ? {} : { policy: {
          operands: recordType.policy.operands.map((operand) => ({
            ...operand,
            source: { ...operand.source }
          })),
          relations: [...recordType.policy.relations]
        } })
      }))
    })),
    runs: model.snapshot.runs.map((checkRun) => structuredClone(checkRun)),
    integrity: {
      status: model.snapshot.integrity.status,
      invalidRecords: model.snapshot.integrity.invalidRecords.map((evidence) => ({ ...evidence })),
      conflicts: model.snapshot.integrity.conflicts.map((evidence) => ({
        ...evidence,
        bodyFingerprints: [...evidence.bodyFingerprints]
      }))
    },
    completeness: { ...model.snapshot.completeness },
    references: {
      identities: model.references.map((reference) => ({ ...reference })),
      evidence: model.referenceFacts.evidence.map((evidence) => ({ ...evidence })),
      relations: model.referenceFacts.relations.map((relation) => ({ ...relation }))
    },
    acceptance: decision.acceptance.map((evidence) => ({ ...evidence })),
    decision: {
      policyId: decision.policyId,
      views: decision.views.map((view) => ({
        viewId: view.viewId,
        recordIds: view.recordRefs.map((reference) => reference.recordId)
      })),
      readiness: decision.readiness.map((evidence) => evidence.status === "failed"
        ? {
          readinessId: evidence.readinessId,
          status: evidence.status,
          reason: evidence.reason,
          evidenceRefs: evidence.evidenceRefs.map(copyEvidenceRef)
        }
        : {
          readinessId: evidence.readinessId,
          status: evidence.status,
          reason: null,
          evidenceRefs: evidence.evidenceRefs.map(copyEvidenceRef)
        }),
      blockWhen: decision.blockWhen === null ? null : {
        status: decision.blockWhen.status,
        evidenceRefs: decision.blockWhen.evidenceRefs.map(copyEvidenceRef),
        blockingRecordIds: decision.blockWhen.blockingRecordRefs.map(
          (reference) => reference.recordId
        )
      },
      gate: projectGate(decision.gate)
    }
  };
  return Object.freeze({
    run: deepFreeze(run),
    records: Object.freeze(model.records.map((record): MachineRecordV2 => deepFreeze({
      schemaVersion: MACHINE_RECORD_V2_IDENTITY,
      recordId: record.recordId,
      checkId: record.checkId,
      checkRunId: record.checkRunId,
      recordTypeId: record.recordTypeId,
      level: record.level,
      semanticSubject: record.semanticSubject,
      message: record.message,
      fields: { ...record.fields },
      location: record.location === null ? null : { ...record.location }
    })))
  });
}

function projectGate(gate: ValidatedPublicationModelV2["decision"]["gate"]): MachineRunV2["decision"]["gate"] {
  if (gate.status === "disabled") {
    return { status: "disabled", policyId: null };
  }
  if (gate.status === "not-evaluated") {
    return {
      status: gate.status,
      policyId: gate.policyId,
      reason: gate.reason,
      evidenceRefs: gate.evidenceRefs.map(copyEvidenceRef)
    };
  }
  return {
    status: gate.status,
    policyId: gate.policyId,
    evidenceRefs: gate.evidenceRefs.map(copyEvidenceRef),
    blockingRecordIds: gate.blockingRecordRefs.map((reference) => reference.recordId)
  };
}

function copyEvidenceRef(reference: EvidenceRef): EvidenceRef {
  return { ...reference };
}

function deepFreeze<T>(value: T): T {
  if (value !== null && typeof value === "object" && !Object.isFrozen(value)) {
    Object.freeze(value);
    for (const child of Object.values(value)) deepFreeze(child);
  }
  return value;
}

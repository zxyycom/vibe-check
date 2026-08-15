import type { EvidenceRef } from "../../check-record/policy-model.ts";
import {
  MACHINE_RECORD_V3_IDENTITY,
  MACHINE_RUN_V3_IDENTITY
} from "./schema-identities.ts";
import type { ValidatedPublicationModelV3 } from "./model.ts";
import { createRecordsFingerprintV3 } from "./records-fingerprint.ts";
import type { MachineRecordV3, MachineRunV3 } from "./schema.ts";
import { freezePublicationValue } from "./freeze-publication-value.ts";

export interface MachinePublicationV3 {
  readonly records: readonly MachineRecordV3[];
  readonly run: MachineRunV3;
}

export function projectMachinePublicationV3(
  model: ValidatedPublicationModelV3
): MachinePublicationV3 {
  const decision = model.decision;
  const records = Object.freeze(model.records.map((record): MachineRecordV3 => freezePublicationValue({
    schemaVersion: MACHINE_RECORD_V3_IDENTITY,
    recordId: record.recordId,
    checkId: record.checkId,
    recordTypeId: record.recordTypeId,
    level: record.level,
    semanticSubject: record.semanticSubject,
    message: record.message,
    fields: { ...record.fields },
    location: record.location === null ? null : { ...record.location }
  })));
  const run: MachineRunV3 = {
    schemaVersion: MACHINE_RUN_V3_IDENTITY,
    invocation: { ...model.invocation },
    catalogFingerprint: model.catalogFingerprint,
    recordsFingerprint: createRecordsFingerprintV3(records),
    checks: model.snapshot.checks.map((check) => ({
      checkId: check.checkId,
      displayName: check.displayName,
      recordTypes: check.recordTypes.map((recordType) => ({
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
      })),
      outcome: structuredClone(check.outcome)
    })),
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
    run: freezePublicationValue(run),
    records
  });
}

function projectGate(gate: ValidatedPublicationModelV3["decision"]["gate"]): MachineRunV3["decision"]["gate"] {
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

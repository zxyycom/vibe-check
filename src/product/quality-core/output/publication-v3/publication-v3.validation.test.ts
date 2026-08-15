import { strict as assert } from "node:assert";
import { describe, it } from "node:test";

import { createCatalogFingerprint } from "../../check-record/identity.ts";
import {
  createPublicationModelV3,
  projectMachinePublicationV3,
  serializeMachinePublicationV3,
  validateMachinePublicationSetV3
} from "./index.ts";
import { assertSetFailure, encoder } from "./publication-test-assertions.ts";
import {
  emptyPublicationInput,
  richPublicationInput
} from "./publication-test-fixtures.ts";

type MachinePublication = ReturnType<typeof projectMachinePublicationV3>;
type MachineCandidates = ReturnType<typeof serializeMachinePublicationV3>;
type PublicationBytes = Parameters<typeof validateMachinePublicationSetV3>[0];
type MutableMachineRun = Mutable<MachinePublication["run"]>;

interface InvalidPublicationCase {
  readonly label: string;
  readonly expected: {
    readonly category: "framing" | "schema" | "set-invariant";
    readonly logicalArtifact: "records.ndjson" | "run.json";
    readonly pointer?: string;
    readonly relationship?: string;
  };
  readonly bytes: PublicationBytes;
}

type Mutable<Value> = Value extends readonly (infer Item)[]
  ? Mutable<Item>[]
  : Value extends object
    ? { -readonly [Key in keyof Value]: Mutable<Value[Key]> }
    : Value;

/** Test fixtures deliberately tamper with serialized data; production DTOs stay readonly. */
function mutableRun(run: MachinePublication["run"]): MutableMachineRun {
  return structuredClone(run) as MutableMachineRun;
}

describe("machine publication v3 contract", () => {
  it("rejects byte schema and cross-file invariant failures without a trusted prefix", async () => {
    const machine = projectMachinePublicationV3(
      createPublicationModelV3(await richPublicationInput())
    );
    const candidates = serializeMachinePublicationV3(machine);

    for (const failure of invalidPublicationCases(machine, candidates)) {
      const result = validateMachinePublicationSetV3(failure.bytes);
      assert.equal(result.ok, false, failure.label);
      if (result.ok) throw new Error(`Expected ${failure.label} failure`);
      assert.equal(result.diagnostic.category, failure.expected.category);
      assert.equal(result.diagnostic.logicalArtifact, failure.expected.logicalArtifact);
      if (failure.expected.pointer !== undefined) {
        assert.equal(result.diagnostic.pointer, failure.expected.pointer);
      }
      if (failure.expected.relationship !== undefined) {
        assert.equal(result.diagnostic.relationship, failure.expected.relationship);
      }
      assert.equal(Object.hasOwn(result, "value"), false);
    }
  });
});

describe("machine publication v3 contract", () => {
  it("rejects a mixed generation even when the old empty Record set fits the new catalog", async () => {
    const machine = projectMachinePublicationV3(
      createPublicationModelV3(await richPublicationInput())
    );
    const run = mutableRun(machine.run);
    run.acceptance = [];
    run.references = { identities: [], evidence: [], relations: [] };
    run.decision = {
      policyId: null,
      views: [],
      readiness: [],
      blockWhen: null,
      gate: { status: "disabled", policyId: null }
    };
    const result = validateMachinePublicationSetV3({
      runJson: encoder.encode(JSON.stringify(run)),
      recordsNdjson: new Uint8Array()
    });
    assert.equal(result.ok, false);
    if (result.ok) throw new Error("Expected mixed generation failure");
    assert.equal(result.diagnostic.category, "set-invariant");
    assert.equal(result.diagnostic.relationship, "records-fingerprint");
    assert.equal(result.diagnostic.logicalArtifact, "records.ndjson");
  });
});

describe("machine publication v3 contract", () => {
  it("reuses target Core validation for Check outcomes, record ownership, and canonical snapshot facts", async () => {
    const machine = projectMachinePublicationV3(
      createPublicationModelV3(await richPublicationInput())
    );
    const invalidRecordOwner = mutableRun(machine.run);
    invalidRecordOwner.checks[0]!.outcome = { kind: "not-applicable" };
    assertSetFailure(machine, invalidRecordOwner, "record-check-ownership");

    const nonCanonicalChecks = mutableRun(machine.run);
    nonCanonicalChecks.checks.push({
      ...structuredClone(nonCanonicalChecks.checks[0]!),
      checkId: "aaa-check"
    });
    nonCanonicalChecks.catalogFingerprint = createCatalogFingerprint(nonCanonicalChecks.checks)
      .catalogFingerprint;
    assertSetFailure(machine, nonCanonicalChecks, "core-snapshot");

    const changedCatalog = mutableRun(machine.run);
    changedCatalog.checks[0]!.displayName = "Changed check projection";
    assertSetFailure(machine, changedCatalog, "catalog-fingerprint");

    const emptyMachine = projectMachinePublicationV3(
      createPublicationModelV3(await emptyPublicationInput())
    );
    const nonCanonical = mutableRun(emptyMachine.run);
    const recordType = nonCanonical.checks[0]!.recordTypes[0]!;
    recordType.fields = [{ fieldId: "category", required: true, valueType: "string" }, ...recordType.fields];
    recordType.identityFields = ["value", "category"];
    nonCanonical.catalogFingerprint = createCatalogFingerprint(nonCanonical.checks).catalogFingerprint;

    assertSetFailure(emptyMachine, nonCanonical, "core-snapshot");
  });
});

describe("machine publication v3 contract", () => {
  it("closes named-reference identities evidence relations and canonical arrays", async () => {
    const machine = projectMachinePublicationV3(
      createPublicationModelV3(await richPublicationInput())
    );
    const referenceId = machine.run.references.identities[0]!.referenceId;

    const duplicateIdentity = mutableRun(machine.run);
    duplicateIdentity.references.identities.push({ referenceName: "comparison", referenceId });
    assertSetFailure(machine, duplicateIdentity, "reference-identity");

    const unknownEvidenceCheck = mutableRun(machine.run);
    unknownEvidenceCheck.references.evidence[0]!.checkId = "unknown-check";
    assertSetFailure(machine, unknownEvidenceCheck, "reference-evidence");

    const unregisteredRelation = mutableRun(machine.run);
    unregisteredRelation.references.relations[0]!.relationId = "unknown-relation";
    assertSetFailure(machine, unregisteredRelation, "reference-relation");

    const nonCanonicalFacts = mutableRun(machine.run);
    nonCanonicalFacts.references.identities.push({
      referenceName: "comparison",
      referenceId: "reference/v1/sha256:bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb"
    });
    nonCanonicalFacts.references.evidence.push({
      checkId: machine.run.checks[0]!.checkId,
      referenceName: "comparison",
      status: "complete"
    });
    nonCanonicalFacts.references.evidence.reverse();
    assertSetFailure(machine, nonCanonicalFacts, "reference-canonical-order");
  });
});

describe("machine publication v3 contract", () => {
  it("closes decision identity types canonical arrays and gate evidence state", async () => {
    const machine = projectMachinePublicationV3(
      createPublicationModelV3(await richPublicationInput())
    );

    const unknownViewRef = mutableRun(machine.run);
    if (unknownViewRef.decision.gate.status === "disabled") throw new Error("Expected gate");
    unknownViewRef.decision.gate.evidenceRefs = [{ kind: "view", viewId: "missing-view" }];
    assertSetFailure(machine, unknownViewRef, "decision-view-reference");

    const nonCanonicalEvidence = mutableRun(machine.run);
    if (nonCanonicalEvidence.decision.gate.status === "disabled") throw new Error("Expected gate");
    nonCanonicalEvidence.decision.gate.evidenceRefs.reverse();
    assertSetFailure(machine, nonCanonicalEvidence, "decision-canonical-order");

    const mismatchedGate = mutableRun(machine.run);
    if (mismatchedGate.decision.gate.status !== "failed") throw new Error("Expected failed gate");
    mismatchedGate.decision.gate.status = "passed";
    assertSetFailure(machine, mismatchedGate, "decision-state");

    const duplicateViewRecord = mutableRun(machine.run);
    duplicateViewRecord.decision.views[0]!.recordIds.push(
      duplicateViewRecord.decision.views[0]!.recordIds[0]!
    );
    assertSetFailure(machine, duplicateViewRecord, "decision-canonical-order");
  });
});

describe("machine publication v3 contract", () => {
  it("binds reference evidence refs to a published Check/reference evidence pair", async () => {
    const invalidModelInput = await richPublicationInput();
    if (invalidModelInput.decision.gate.status === "disabled") throw new Error("Expected gate");
    invalidModelInput.decision = {
      ...invalidModelInput.decision,
      gate: {
        ...invalidModelInput.decision.gate,
        evidenceRefs: [{
          kind: "reference",
          checkId: "unknown-check",
          referenceName: invalidModelInput.references[0]!.referenceName,
          referenceId: invalidModelInput.references[0]!.referenceId
        }]
      }
    };
    assert.throws(
      () => createPublicationModelV3(invalidModelInput),
      /unknown Check\/reference pair/
    );

    const machine = projectMachinePublicationV3(
      createPublicationModelV3(await richPublicationInput())
    );
    const tampered = mutableRun(machine.run);
    if (tampered.decision.gate.status === "disabled") throw new Error("Expected gate");
    tampered.decision.gate.evidenceRefs = [{
      kind: "reference",
      checkId: "unknown-check",
      referenceName: tampered.references.identities[0]!.referenceName,
      referenceId: tampered.references.identities[0]!.referenceId
    }];
    assertSetFailure(machine, tampered, "decision-reference-reference");
  });
});

describe("machine publication v3 contract", () => {
  it("requires not-evaluated readiness to stop at its unique first failure", async () => {
    const machine = projectMachinePublicationV3(
      createPublicationModelV3(await richPublicationInput())
    );
    const tampered = mutableRun(machine.run);
    const checkRef = { kind: "check" as const, checkId: tampered.checks[0]!.checkId };
    tampered.decision.readiness = [{
      readinessId: "first-readiness",
      status: "failed",
      reason: "scan-incomplete",
      evidenceRefs: [checkRef, { kind: "readiness", readinessId: "first-readiness" }]
    }, {
      readinessId: "second-readiness",
      status: "passed",
      reason: null,
      evidenceRefs: [checkRef, { kind: "readiness", readinessId: "second-readiness" }]
    }];
    tampered.decision.blockWhen = null;
    tampered.decision.gate = {
      status: "not-evaluated",
      policyId: "regressions",
      reason: "scan-incomplete",
      evidenceRefs: tampered.decision.readiness[0]!.evidenceRefs
    };
    assertSetFailure(machine, tampered, "decision-state");
  });
});

function invalidPublicationCases(
  machine: MachinePublication,
  candidates: MachineCandidates
): readonly InvalidPublicationCase[] {
  const validBytes: PublicationBytes = {
    runJson: encoder.encode(candidates.runJson),
    recordsNdjson: encoder.encode(candidates.recordsNdjson)
  };
  return [
    recordFramingFailure(validBytes, candidates),
    runSchemaFailure(validBytes, machine),
    recordOwnershipFailure(validBytes, machine),
    danglingDecisionFailure(validBytes, machine)
  ];
}

function recordFramingFailure(
  validBytes: PublicationBytes,
  candidates: MachineCandidates
): InvalidPublicationCase {
  return {
    label: "record framing",
    expected: { category: "framing", logicalArtifact: "records.ndjson" },
    bytes: { ...validBytes, recordsNdjson: encoder.encode(candidates.recordsNdjson.trimEnd()) }
  };
}

function runSchemaFailure(
  validBytes: PublicationBytes,
  machine: MachinePublication
): InvalidPublicationCase {
  return {
    label: "run schema",
    expected: { category: "schema", logicalArtifact: "run.json", pointer: "/schemaVersion" },
    bytes: {
      ...validBytes,
      runJson: encoder.encode(JSON.stringify({ ...machine.run, schemaVersion: "wrong" }))
    }
  };
}

function recordOwnershipFailure(
  validBytes: PublicationBytes,
  machine: MachinePublication
): InvalidPublicationCase {
  return {
    label: "record ownership",
    expected: {
      category: "set-invariant",
      logicalArtifact: "records.ndjson",
      relationship: "record-check-ownership"
    },
    bytes: {
      ...validBytes,
      recordsNdjson: encoder.encode(`${JSON.stringify({
        ...machine.records[0],
        checkId: "unknown-check"
      })}\n`)
    }
  };
}

function danglingDecisionFailure(
  validBytes: PublicationBytes,
  machine: MachinePublication
): InvalidPublicationCase {
  return {
    label: "dangling decision record",
    expected: {
      category: "set-invariant",
      logicalArtifact: "run.json",
      relationship: "decision-record-reference"
    },
    bytes: {
      ...validBytes,
      runJson: encoder.encode(JSON.stringify({
        ...machine.run,
        decision: {
          ...machine.run.decision,
          views: [{ viewId: "all-current", recordIds: [
            "check-record/v1/record/sha256:ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff"
          ] }]
        }
      }))
    }
  };
}

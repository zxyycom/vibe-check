import { strict as assert } from "node:assert";
import { describe, it } from "node:test";

import {
  createPublicationModelV2,
  projectMachinePublicationV2,
  serializeMachinePublicationV2,
  validateMachinePublicationSetV2
} from "./index.ts";
import { assertSetFailure, encoder } from "./publication-test-assertions.ts";
import { richPublicationInput } from "./publication-test-fixtures.ts";

type MachinePublication = ReturnType<typeof projectMachinePublicationV2>;
type MachineCandidates = ReturnType<typeof serializeMachinePublicationV2>;
type PublicationBytes = Parameters<typeof validateMachinePublicationSetV2>[0];

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

describe("machine publication v2 contract", () => {
  it("rejects byte schema and cross-file invariant failures without a trusted prefix", async () => {
    const machine = projectMachinePublicationV2(
      createPublicationModelV2(await richPublicationInput())
    );
    const candidates = serializeMachinePublicationV2(machine);

    for (const failure of invalidPublicationCases(machine, candidates)) {
      const result = validateMachinePublicationSetV2(failure.bytes);
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

describe("machine publication v2 contract", () => {
  it("reuses final Core validation for legal run coverage and canonical snapshot facts", async () => {
    const machine = projectMachinePublicationV2(
      createPublicationModelV2(await richPublicationInput())
    );
    const invalidCoverage = structuredClone(machine.run);
    invalidCoverage.runs[0]!.coverage = {
      acknowledgedWorkCount: 2,
      plannedWorkCount: 1
    };
    assertSetFailure(machine, invalidCoverage, "core-snapshot");

    const invalidCompleteness = structuredClone(machine.run);
    invalidCompleteness.completeness.acknowledgedWorkCount += 1;
    assertSetFailure(machine, invalidCompleteness, "core-snapshot");
  });
});

describe("machine publication v2 contract", () => {
  it("closes named-reference identities evidence relations and canonical arrays", async () => {
    const machine = projectMachinePublicationV2(
      createPublicationModelV2(await richPublicationInput())
    );
    const referenceId = machine.run.references.identities[0]!.referenceId;

    const duplicateIdentity = structuredClone(machine.run);
    duplicateIdentity.references.identities.push({ referenceName: "comparison", referenceId });
    assertSetFailure(machine, duplicateIdentity, "reference-identity");

    const unknownEvidenceCheck = structuredClone(machine.run);
    unknownEvidenceCheck.references.evidence[0]!.checkId = "unknown-check";
    assertSetFailure(machine, unknownEvidenceCheck, "reference-evidence");

    const unregisteredRelation = structuredClone(machine.run);
    unregisteredRelation.references.relations[0]!.relationId = "unknown-relation";
    assertSetFailure(machine, unregisteredRelation, "reference-relation");

    const nonCanonicalFacts = structuredClone(machine.run);
    nonCanonicalFacts.references.identities.push({
      referenceName: "comparison",
      referenceId: "reference/v1/sha256:bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb"
    });
    nonCanonicalFacts.references.evidence.push({
      checkId: machine.run.runs[0]!.checkId,
      referenceName: "comparison",
      status: "complete"
    });
    nonCanonicalFacts.references.evidence.reverse();
    assertSetFailure(machine, nonCanonicalFacts, "reference-canonical-order");
  });
});

describe("machine publication v2 contract", () => {
  it("closes decision identity types canonical arrays and gate evidence state", async () => {
    const machine = projectMachinePublicationV2(
      createPublicationModelV2(await richPublicationInput())
    );

    const unknownViewRef = structuredClone(machine.run);
    if (unknownViewRef.decision.gate.status === "disabled") throw new Error("Expected gate");
    unknownViewRef.decision.gate.evidenceRefs = [{ kind: "view", viewId: "missing-view" }];
    assertSetFailure(machine, unknownViewRef, "decision-view-reference");

    const nonCanonicalEvidence = structuredClone(machine.run);
    if (nonCanonicalEvidence.decision.gate.status === "disabled") throw new Error("Expected gate");
    nonCanonicalEvidence.decision.gate.evidenceRefs.reverse();
    assertSetFailure(machine, nonCanonicalEvidence, "decision-canonical-order");

    const mismatchedGate = structuredClone(machine.run);
    if (mismatchedGate.decision.gate.status !== "failed") throw new Error("Expected failed gate");
    mismatchedGate.decision.gate.status = "passed";
    assertSetFailure(machine, mismatchedGate, "decision-state");

    const duplicateViewRecord = structuredClone(machine.run);
    duplicateViewRecord.decision.views[0]!.recordIds.push(
      duplicateViewRecord.decision.views[0]!.recordIds[0]!
    );
    assertSetFailure(machine, duplicateViewRecord, "decision-canonical-order");
  });
});

describe("machine publication v2 contract", () => {
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
      () => createPublicationModelV2(invalidModelInput),
      /unknown Check\/reference pair/
    );

    const machine = projectMachinePublicationV2(
      createPublicationModelV2(await richPublicationInput())
    );
    const tampered = structuredClone(machine.run);
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

describe("machine publication v2 contract", () => {
  it("requires not-evaluated readiness to stop at its unique first failure", async () => {
    const machine = projectMachinePublicationV2(
      createPublicationModelV2(await richPublicationInput())
    );
    const tampered = structuredClone(machine.run);
    const runRef = { kind: "run" as const, checkRunId: tampered.runs[0]!.checkRunId };
    tampered.decision.readiness = [{
      readinessId: "first-readiness",
      status: "failed",
      reason: "scan-incomplete",
      evidenceRefs: [runRef, { kind: "readiness", readinessId: "first-readiness" }]
    }, {
      readinessId: "second-readiness",
      status: "passed",
      reason: null,
      evidenceRefs: [runRef, { kind: "readiness", readinessId: "second-readiness" }]
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
      relationship: "record-run-ownership"
    },
    bytes: {
      ...validBytes,
      recordsNdjson: encoder.encode(`${JSON.stringify({
        ...machine.records[0],
        checkRunId: machine.run.runs[1]?.checkRunId ?? `check-run/v1:${"f".repeat(64)}`
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

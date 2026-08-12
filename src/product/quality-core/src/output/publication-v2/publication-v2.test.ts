import { strict as assert } from "node:assert";
import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, it } from "node:test";

import { Ajv2020 } from "ajv/dist/2020.js";
import type { AnySchema } from "ajv";

import { TEST_QUALITY_CONFIG } from "../../../test/config.ts";
import {
  resolveCheckCatalog,
  type CheckExecutionBinding
} from "../../check-record/catalog.ts";
import { coordinateCheckRecords } from "../../check-record/coordinator.ts";
import { projectHumanStatus } from "../../check-record/human-status.ts";
import type { CheckDefinition, FinalCoreSnapshot } from "../../check-record/model.ts";
import type {
  DecisionEvidence,
  NamedReferenceIdentity,
  ReferenceFacts
} from "../../check-record/policy-model.ts";
import { validateCheckDefinition } from "../../check-record/validation.ts";
import {
  MACHINE_RECORD_V2_IDENTITY,
  MACHINE_RECORD_V2_SCHEMA,
  MACHINE_RECORD_V2_SCHEMA_ID,
  MACHINE_RECORD_V2_SCHEMA_PATH,
  MACHINE_RUN_V2_IDENTITY,
  MACHINE_RUN_V2_SCHEMA,
  MACHINE_RUN_V2_SCHEMA_ID,
  MACHINE_RUN_V2_SCHEMA_PATH,
  PUBLICATION_ANNOTATION_INPUT_V2,
  PUBLICATION_V2_FAILURE_STAGES,
  PUBLICATION_V2_LIFECYCLE,
  createPublicationModelV2,
  generatePublicationContractCandidatesV2,
  mapPublicationFailureV2,
  mapPublicationOutcomeV2,
  planPublicationCleanupV2,
  projectMachinePublicationV2,
  projectReadablePublicationV2,
  serializeMachinePublicationV2,
  validateMachinePublicationSetV2
} from "./index.ts";

const encoder = new TextEncoder();

describe("machine publication v2 contract", () => {
  it("derives exact closed DTOs from runtime schemas and one validated publication model", async () => {
    const input = await richPublicationInput();
    const model = createPublicationModelV2(input);
    const machine = projectMachinePublicationV2(model);

    assert.equal(schemaId(MACHINE_RUN_V2_SCHEMA), MACHINE_RUN_V2_SCHEMA_ID);
    assert.equal(MACHINE_RUN_V2_SCHEMA_PATH, "docs/schemas/vibe-check-run.schema.json");
    assert.equal(schemaId(MACHINE_RECORD_V2_SCHEMA), MACHINE_RECORD_V2_SCHEMA_ID);
    assert.equal(MACHINE_RECORD_V2_SCHEMA_PATH, "docs/schemas/vibe-check-record.schema.json");
    assert.deepEqual(Object.keys(MACHINE_RUN_V2_SCHEMA.properties).sort(), [
      "acceptance", "catalogFingerprint", "completeness", "decision", "definitions",
      "integrity", "invocation", "references", "runs", "schemaVersion"
    ]);
    assert.deepEqual(Object.keys(MACHINE_RECORD_V2_SCHEMA.properties).sort(), [
      "checkId", "checkRunId", "fields", "level", "location", "message", "recordId",
      "recordTypeId", "schemaVersion", "semanticSubject"
    ]);
    assert.equal(machine.run.schemaVersion, MACHINE_RUN_V2_IDENTITY);
    assert.ok(machine.records.every((record) => record.schemaVersion === MACHINE_RECORD_V2_IDENTITY));
    assert.deepEqual(machine.run.invocation, {
      invocationId: "invocation/v1:publication-contract",
      projectRoot: ".",
      timestamp: "2026-08-12T00:00:00.000Z"
    });
    assert.equal(JSON.stringify(machine).includes("private"), false);
    assert.equal(Object.isFrozen(model), true);
    assert.equal(Object.isFrozen(model.humanStatus), true);
    assert.equal(model.records, model.snapshot.records);

    const mismatched = await richPublicationInput();
    mismatched.humanStatus = { normal: "passed", selected: "passed", verification: "passed" };
    assert.throws(
      () => createPublicationModelV2(mismatched),
      /human status projection is invalid/
    );
    const invalidStatus = await richPublicationInput();
    assert.throws(
      () => createPublicationModelV2({
        ...invalidStatus,
        humanStatus: {
          normal: "unknown",
          selected: "warning",
          verification: "passed"
        }
      } as unknown as Parameters<typeof createPublicationModelV2>[0]),
      /human status projection is invalid/
    );
  });

  it("serializes canonical JSON and NDJSON and validates the complete two-file set", async () => {
    const model = createPublicationModelV2(await richPublicationInput());
    const machine = projectMachinePublicationV2(model);
    const candidates = serializeMachinePublicationV2(machine);

    assert.equal(candidates.runJson, JSON.stringify(machine.run, null, 2));
    assert.equal(candidates.runJson.endsWith("\n"), false);
    assert.equal(
      candidates.recordsNdjson,
      `${machine.records.map((record) => JSON.stringify(record)).join("\n")}\n`
    );
    const validation = validateMachinePublicationSetV2({
      runJson: encoder.encode(candidates.runJson),
      recordsNdjson: encoder.encode(candidates.recordsNdjson)
    });
    assert.equal(validation.ok, true);
    if (!validation.ok) throw new Error("Expected valid publication set");
    assert.deepEqual(validation.value, machine);

    const empty = await emptyPublicationInput();
    assert.equal(
      serializeMachinePublicationV2(projectMachinePublicationV2(createPublicationModelV2(empty)))
        .recordsNdjson,
      ""
    );
  });

  it("preserves an absent record policy and allows disabled decisions to retain acceptance and views", async () => {
    const noPolicy = await noPolicyPublicationInput();
    const noPolicyMachine = projectMachinePublicationV2(createPublicationModelV2(noPolicy));
    assert.equal(
      Object.hasOwn(noPolicyMachine.run.definitions[0]!.recordTypes[0]!, "policy"),
      false
    );
    assert.equal(noPolicyMachine.run.catalogFingerprint, noPolicy.snapshot.catalogFingerprint);
    assert.equal(validateCandidates(noPolicyMachine).ok, true);

    const omitted = await richPublicationInput();
    const recordId = omitted.snapshot.records[0]!.recordId;
    omitted.references = [];
    omitted.referenceFacts = { evidence: [], relations: [] };
    omitted.decision = {
      policyId: null,
      acceptance: [{ acceptanceId: "accepted-by-config", reason: "Reviewed", recordId }],
      views: [{ viewId: "all-current", recordRefs: [{ kind: "record", recordId }] }],
      readiness: [],
      blockWhen: null,
      gate: { status: "disabled", policyId: null }
    };
    const omittedMachine = projectMachinePublicationV2(createPublicationModelV2(omitted));
    assert.equal(omittedMachine.run.decision.policyId, null);
    assert.equal(omittedMachine.run.acceptance.length, 1);
    assert.deepEqual(omittedMachine.run.decision.views[0]!.recordIds, [recordId]);
    assert.equal(validateCandidates(omittedMachine).ok, true);
  });

  it("rejects byte schema and cross-file invariant failures without a trusted prefix", async () => {
    const model = createPublicationModelV2(await richPublicationInput());
    const machine = projectMachinePublicationV2(model);
    const candidates = serializeMachinePublicationV2(machine);
    const validBytes = {
      runJson: encoder.encode(candidates.runJson),
      recordsNdjson: encoder.encode(candidates.recordsNdjson)
    };
    const failures = [{
      label: "record framing",
      expected: { category: "framing", logicalArtifact: "records.ndjson" },
      bytes: { ...validBytes, recordsNdjson: encoder.encode(candidates.recordsNdjson.trimEnd()) }
    }, {
      label: "run schema",
      expected: { category: "schema", logicalArtifact: "run.json", pointer: "/schemaVersion" },
      bytes: {
        ...validBytes,
        runJson: encoder.encode(JSON.stringify({ ...machine.run, schemaVersion: "wrong" }))
      }
    }, {
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
          checkRunId: machine.run.runs[1]?.checkRunId
            ?? `check-run/v1:${"f".repeat(64)}`
        })}\n`)
      }
    }, {
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
    }] as const;

    for (const failure of failures) {
      const result = validateMachinePublicationSetV2(failure.bytes);
      assert.equal(result.ok, false, failure.label);
      if (result.ok) throw new Error(`Expected ${failure.label} failure`);
      assert.equal(result.diagnostic.category, failure.expected.category);
      assert.equal(result.diagnostic.logicalArtifact, failure.expected.logicalArtifact);
      if ("pointer" in failure.expected) {
        assert.equal(result.diagnostic.pointer, failure.expected.pointer);
      }
      if ("relationship" in failure.expected) {
        assert.equal(result.diagnostic.relationship, failure.expected.relationship);
      }
      assert.equal(Object.hasOwn(result, "value"), false);
    }
  });

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

  it("closes named-reference identities evidence relations and canonical arrays", async () => {
    const machine = projectMachinePublicationV2(
      createPublicationModelV2(await richPublicationInput())
    );
    const referenceId = machine.run.references.identities[0]!.referenceId;

    const duplicateIdentity = structuredClone(machine.run);
    duplicateIdentity.references.identities.push({
      referenceName: "comparison",
      referenceId
    });
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

  it("generates canonical schema and example candidates that validate independently", async () => {
    const publication = projectMachinePublicationV2(
      createPublicationModelV2(await richPublicationInput())
    );
    const candidates = generatePublicationContractCandidatesV2(publication);
    assert.equal(
      candidates.schemas[MACHINE_RUN_V2_SCHEMA_PATH],
      `${JSON.stringify(MACHINE_RUN_V2_SCHEMA, null, 2)}\n`
    );
    assert.equal(
      candidates.schemas[MACHINE_RECORD_V2_SCHEMA_PATH],
      `${JSON.stringify(MACHINE_RECORD_V2_SCHEMA, null, 2)}\n`
    );
    assert.deepEqual(candidates.example, serializeMachinePublicationV2(publication));

    const ajv = new Ajv2020({ allErrors: true, strict: true });
    const validateRun = ajv.compile(
      JSON.parse(candidates.schemas[MACHINE_RUN_V2_SCHEMA_PATH]) as AnySchema
    );
    const validateRecord = ajv.compile(
      JSON.parse(candidates.schemas[MACHINE_RECORD_V2_SCHEMA_PATH]) as AnySchema
    );
    const run = JSON.parse(candidates.example.runJson) as typeof publication.run;
    const records = candidates.example.recordsNdjson.trimEnd().split("\n")
      .filter((line) => line.length > 0)
      .map((line) => JSON.parse(line) as typeof publication.records[number]);
    assert.equal(validateRun(run), true, JSON.stringify(validateRun.errors));
    assert.equal(records.every((record) => validateRecord(record)), true,
      JSON.stringify(validateRecord.errors));
    assert.deepEqual(
      records.map((record) => record.recordId),
      [...records.map((record) => record.recordId)].sort()
    );
    assert.ok(records.every((record) => run.runs.some((checkRun) => (
      checkRun.checkId === record.checkId && checkRun.checkRunId === record.checkRunId
    ))));
  });

  it("locks shared readable previews annotation set input lifecycle and process mapping", async () => {
    const input = await richPublicationInput();
    const model = createPublicationModelV2(input);
    const presentation = {
      ...TEST_QUALITY_CONFIG.report,
      footerGeneratedBy: "Readable projection test",
      footerNotice: "Review the projected records.",
      nonBlockingNotice: "Projection-only notice.",
      timeZone: "Asia/Tokyo",
      title: "Configured readable report",
      topN: 1,
      watchlistMax: 1
    };
    const readable = projectReadablePublicationV2({
      model,
      report: { changedFiles: ["src/a.ts"], presentation }
    });
    assert.notEqual(readable.report, readable.console);
    assert.deepEqual(readable.report.statuses, {
      quality: { label: "Quality check status", status: "warning" },
      verification: { label: "Quality verification status", status: "passed" }
    });
    assert.deepEqual(readable.report.warningRecords, []);
    assert.deepEqual(readable.report.acceptedRecords, [{
      acceptance: [{ acceptanceId: "accepted-large-file", reason: "Reviewed" }],
      level: "warning",
      location: { path: "src/a.ts", line: 7, column: 1 },
      message: "Publication finding",
      recordId: model.records[0]!.recordId
    }]);
    assert.deepEqual(readable.report.presentation, presentation);
    assert.deepEqual(readable.report.watchlistRecords, readable.report.acceptedRecords);
    assert.deepEqual(readable.console.acceptedRecords, readable.report.acceptedRecords);

    const hiddenWatchlist = projectReadablePublicationV2({
      model,
      report: {
        changedFiles: ["src/a.ts"],
        presentation: { ...presentation, showWatchlist: false }
      }
    });
    assert.deepEqual(hiddenWatchlist.report.watchlistRecords, []);

    const projectionModel = createPublicationModelV2(await reportProjectionInput());
    const exactWatchlist = projectReadablePublicationV2({
      model: projectionModel,
      report: {
        changedFiles: ["src/a.ts"],
        presentation: { ...presentation, topN: 5, watchlistMax: 5 }
      }
    });
    assert.deepEqual(
      exactWatchlist.report.watchlistRecords.map((record) => record.location?.path),
      ["src/a.ts"]
    );
    const topOne = projectReadablePublicationV2({
      model: projectionModel,
      report: {
        changedFiles: ["src/b.ts", "src/c.ts"],
        presentation: { ...presentation, topN: 1, watchlistMax: 1 }
      }
    });
    const topThree = projectReadablePublicationV2({
      model: projectionModel,
      report: {
        changedFiles: ["src/b.ts", "src/c.ts"],
        presentation: { ...presentation, topN: 3, watchlistMax: 3 }
      }
    });
    assert.equal(topOne.console.warningRecords.length, 5);
    assert.equal(topThree.console.warningRecords.length, 5);
    assert.equal(topOne.report.warningRecords.length, 1);
    assert.equal(topThree.report.warningRecords.length, 3);
    assert.equal(topOne.report.watchlistRecords.length, 1);
    assert.equal(topThree.report.watchlistRecords.length, 2);

    assert.deepEqual(PUBLICATION_ANNOTATION_INPUT_V2, {
      argument: "artifact-directory",
      kind: "validated-machine-set",
      requiredFileNames: ["run.json", "records.ndjson"]
    });
    assert.deepEqual(PUBLICATION_V2_LIFECYCLE, {
      candidateStages: [
        "validate-publication-model", "serialize-machine-candidates",
        "render-report-candidate", "validate-machine-set"
      ],
      artifactStages: [
        "cleanup-prior-owned-artifacts", "write-same-directory-owned-temps",
        "rename-machine-files", "rename-report", "publish-trusted-paths"
      ]
    });
    assert.deepEqual(
      PUBLICATION_V2_FAILURE_STAGES.map((stage) => mapPublicationFailureV2(stage)),
      PUBLICATION_V2_FAILURE_STAGES.map((stage) => ({
        exitCode: 2,
        outcome: "failed",
        stage,
        trustedArtifactNames: []
      }))
    );
    const disabledModel = createPublicationModelV2(await emptyPublicationInput());
    const notEvaluatedInput = await emptyPublicationInput();
    notEvaluatedInput.decision = {
      ...notEvaluatedInput.decision,
      gate: {
        status: "not-evaluated",
        policyId: "regressions",
        reason: "scan-incomplete",
        evidenceRefs: []
      }
    };
    assert.deepEqual(mapPublicationOutcomeV2({
      model: disabledModel,
      publicationStatus: "succeeded"
    }), {
      exitCode: 0,
      outcome: "success",
      trustedArtifactNames: ["records.ndjson", "report.md", "run.json"]
    });
    assert.deepEqual(mapPublicationOutcomeV2({
      model,
      publicationStatus: "succeeded"
    }), {
      exitCode: 1,
      outcome: "gate-failed",
      trustedArtifactNames: ["records.ndjson", "report.md", "run.json"]
    });
    assert.deepEqual(mapPublicationOutcomeV2({
      model: createPublicationModelV2(notEvaluatedInput),
      publicationStatus: "succeeded"
    }), {
      exitCode: 2,
      outcome: "failed",
      trustedArtifactNames: ["records.ndjson", "report.md", "run.json"]
    });
    assert.deepEqual(mapPublicationOutcomeV2({
      model,
      publicationStatus: "failed"
    }), {
      exitCode: 2,
      outcome: "failed",
      trustedArtifactNames: []
    });
  });

  it("plans exact prior-v2 stale-v1 report and owned-temp cleanup without touching unrelated files", () => {
    const artifactDir = mkdtempSync(join(tmpdir(), "vibe-check-publication-v2-cleanup-"));
    const ownedTempDir = join(artifactDir, ".vibe-check-publication-prior");
    try {
      mkdirSync(ownedTempDir);
      for (const name of [
        "run.json", "records.ndjson", "report.md", "metrics.json", "warnings.ndjson",
        "warnings-all.ndjson", "unrelated.json"
      ]) {
        writeFileSync(join(artifactDir, name), name, "utf8");
      }
      writeFileSync(join(ownedTempDir, "run.json.tmp"), "temp", "utf8");

      const plan = planPublicationCleanupV2(artifactDir);
      assert.deepEqual(plan.canonicalPaths, [
        join(artifactDir, "records.ndjson"),
        join(artifactDir, "report.md"),
        join(artifactDir, "run.json")
      ]);
      assert.deepEqual(plan.retiredPaths, [
        join(artifactDir, "metrics.json"),
        join(artifactDir, "warnings-all.ndjson"),
        join(artifactDir, "warnings.ndjson")
      ]);
      assert.deepEqual(plan.ownedTempPaths, [ownedTempDir]);
      assert.equal(readFileSync(join(artifactDir, "unrelated.json"), "utf8"), "unrelated.json");
    } finally {
      rmSync(artifactDir, { force: true, recursive: true });
    }
  });
});

async function richPublicationInput() {
  const snapshot = await snapshotWithRecord();
  const recordId = snapshot.records[0]!.recordId;
  const run = snapshot.runs[0]!;
  const referenceId = "reference/v1/sha256:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa";
  const references: readonly NamedReferenceIdentity[] = [{
    referenceName: "baseline",
    referenceId
  }];
  const referenceFacts: ReferenceFacts = {
    evidence: [{ checkId: run.checkId, referenceName: "baseline", status: "complete" }],
    relations: [{ recordId, referenceName: "baseline", relationId: "regression" }]
  };
  const decision: DecisionEvidence = {
    policyId: "regressions",
    acceptance: [{ acceptanceId: "accepted-large-file", reason: "Reviewed", recordId }],
    views: [{ viewId: "all-current", recordRefs: [{ kind: "record", recordId }] }],
    readiness: [{
      readinessId: "current-complete",
      status: "passed",
      evidenceRefs: [{ kind: "run", checkRunId: run.checkRunId }, {
        kind: "readiness",
        readinessId: "current-complete"
      }]
    }],
    blockWhen: {
      status: "matched",
      evidenceRefs: [{ kind: "record", recordId }, { kind: "view", viewId: "all-current" }],
      blockingRecordRefs: [{ kind: "record", recordId }]
    },
    gate: {
      status: "failed",
      policyId: "regressions",
      evidenceRefs: [
        { kind: "run", checkRunId: run.checkRunId },
        { kind: "record", recordId },
        { kind: "view", viewId: "all-current" },
        { kind: "readiness", readinessId: "current-complete" }
      ],
      blockingRecordRefs: [{ kind: "record", recordId }]
    }
  };
  return {
    ...humanPublicationFields(snapshot, decision),
    invocation: {
      invocationId: "invocation/v1:publication-contract",
      projectRoot: "." as const,
      timestamp: "2026-08-12T00:00:00.000Z"
    },
    snapshot,
    references,
    referenceFacts,
    decision,
    privateInvocationMaterial: "must not cross publication"
  };
}

async function reportProjectionInput() {
  const snapshot = await snapshotWithRecords([
    "lib/src/a.ts",
    "src/a.ts",
    "src/a.tsx",
    "src/b.ts",
    "src/c.ts"
  ]);
  const decision: DecisionEvidence = {
    policyId: null,
    acceptance: [],
    views: [{
      viewId: "all-current",
      recordRefs: snapshot.records.map(({ recordId }) => ({ kind: "record", recordId }))
    }],
    readiness: [],
    blockWhen: null,
    gate: { status: "disabled", policyId: null }
  };
  return {
    ...humanPublicationFields(snapshot, decision),
    invocation: {
      invocationId: "invocation/v1:readable-projection",
      projectRoot: "." as const,
      timestamp: "2026-08-12T00:00:00.000Z"
    },
    snapshot,
    references: [] as readonly NamedReferenceIdentity[],
    referenceFacts: { evidence: [], relations: [] } satisfies ReferenceFacts,
    decision
  };
}

async function emptyPublicationInput() {
  const snapshot = await snapshotWithoutRecords();
  const decision: DecisionEvidence = {
    policyId: null,
    acceptance: [],
    views: [],
    readiness: [],
    blockWhen: null,
    gate: { status: "disabled", policyId: null }
  };
  return {
    ...humanPublicationFields(snapshot, decision),
    invocation: {
      invocationId: "invocation/v1:publication-empty",
      projectRoot: "." as const,
      timestamp: "2026-08-12T00:00:00.000Z"
    },
    snapshot,
    references: [] as readonly NamedReferenceIdentity[],
    referenceFacts: { evidence: [], relations: [] } satisfies ReferenceFacts,
    decision
  };
}

async function noPolicyPublicationInput() {
  const noPolicyDefinition: CheckDefinition = {
    checkId: "no-policy-check",
    displayName: "No Policy Check",
    recordTypes: [{
      recordTypeId: "no-policy-record",
      fields: [],
      identityFields: []
    }]
  };
  const snapshot = await coordinateCheckRecords(catalogFor(
    noPolicyDefinition,
    () => ({ verdict: "passed" }),
    true
  ));
  const decision = {
    policyId: null,
    acceptance: [],
    views: [],
    readiness: [],
    blockWhen: null,
    gate: { status: "disabled", policyId: null }
  } satisfies DecisionEvidence;
  return {
    ...humanPublicationFields(snapshot, decision),
    invocation: {
      invocationId: "invocation/v1:no-policy-publication",
      projectRoot: "." as const,
      timestamp: "2026-08-12T00:00:00.000Z"
    },
    snapshot,
    references: [] as readonly NamedReferenceIdentity[],
    referenceFacts: { evidence: [], relations: [] } satisfies ReferenceFacts,
    decision
  };
}

function humanPublicationFields(
  snapshot: FinalCoreSnapshot,
  decision: DecisionEvidence,
  verificationOutput = false
) {
  return {
    humanStatus: projectHumanStatus({ snapshot, decision, verificationOutput }),
    verificationOutput
  };
}

const definition = {
  checkId: "publication-check",
  displayName: "Publication Check",
  recordTypes: [{
    recordTypeId: "publication-record",
    fields: [{ fieldId: "value", valueType: "integer", required: true }],
    identityFields: ["value"],
    policy: {
      operands: [],
      relations: ["regression"]
    }
  }]
} as const;

async function snapshotWithRecord(): Promise<FinalCoreSnapshot> {
  return snapshotWithRecords(["src/a.ts"]);
}

async function snapshotWithRecords(paths: readonly string[]): Promise<FinalCoreSnapshot> {
  return coordinateCheckRecords(catalog(async (ports) => {
    for (const [index, path] of paths.entries()) {
      ports.submitRecord({
        recordTypeId: "publication-record",
        level: "warning",
        semanticSubject: path,
        message: paths.length === 1 ? "Publication finding" : `Publication finding ${path}`,
        fields: { value: index + 7 },
        location: { path, line: index + 7, column: 1 }
      });
    }
    ports.acknowledge(ports.workHandles[0]!);
    return { verdict: "failed" };
  }, true));
}

async function snapshotWithoutRecords(): Promise<FinalCoreSnapshot> {
  return coordinateCheckRecords(catalog(() => ({ verdict: "not-applicable" }), false));
}

function catalog(execute: CheckExecutionBinding, applicable: boolean) {
  return catalogFor(definition, execute, applicable);
}

function catalogFor(
  checkDefinition: CheckDefinition,
  execute: CheckExecutionBinding,
  applicable: boolean
) {
  assert.equal(validateCheckDefinition(checkDefinition).ok, true);
  const result = resolveCheckCatalog({
    invocationKey: `publication-${applicable}`,
    definitions: [checkDefinition],
    bindings: [{ checkId: checkDefinition.checkId, execute }],
    selectedCheckIds: [checkDefinition.checkId],
    resolveApplicability: () => applicable
      ? { status: "applicable", workHandles: ["work-handle/v1:publication-check"] }
      : { status: "not-applicable" }
  });
  if (!result.ok) throw new Error("Expected catalog");
  return result.value;
}

function schemaId(schema: object): string | undefined {
  return (schema as { readonly $id?: string }).$id;
}

function validateCandidates(machine: ReturnType<typeof projectMachinePublicationV2>) {
  const candidates = serializeMachinePublicationV2(machine);
  return validateMachinePublicationSetV2({
    runJson: encoder.encode(candidates.runJson),
    recordsNdjson: encoder.encode(candidates.recordsNdjson)
  });
}

function assertSetFailure(
  machine: ReturnType<typeof projectMachinePublicationV2>,
  run: ReturnType<typeof structuredClone<typeof machine.run>>,
  relationship: string
): void {
  const candidates = serializeMachinePublicationV2(machine);
  const result = validateMachinePublicationSetV2({
    runJson: encoder.encode(JSON.stringify(run)),
    recordsNdjson: encoder.encode(candidates.recordsNdjson)
  });
  assert.equal(result.ok, false);
  if (result.ok) throw new Error(`Expected ${relationship} failure`);
  assert.equal(result.diagnostic.category, "set-invariant");
  assert.equal(result.diagnostic.relationship, relationship);
  assert.equal(Object.hasOwn(result, "value"), false);
}

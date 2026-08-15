import { strict as assert } from "node:assert";
import { describe, it } from "node:test";

import {
  MACHINE_RECORD_V2_IDENTITY,
  MACHINE_RECORD_V2_SCHEMA,
  MACHINE_RECORD_V2_SCHEMA_ID,
  MACHINE_RECORD_V2_SCHEMA_PATH,
  MACHINE_RUN_V2_IDENTITY,
  MACHINE_RUN_V2_SCHEMA,
  MACHINE_RUN_V2_SCHEMA_ID,
  MACHINE_RUN_V2_SCHEMA_PATH,
  createPublicationModelV2,
  projectMachinePublicationV2,
  serializeMachinePublicationV2,
  validateMachinePublicationSetV2
} from "./index.ts";
import { encoder, validateCandidates } from "./publication-test-assertions.ts";
import {
  emptyPublicationInput,
  noPolicyPublicationInput,
  richPublicationInput
} from "./publication-test-fixtures.ts";

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
    assert.throws(() => createPublicationModelV2(mismatched), /human status projection is invalid/);
    const invalidStatus = await richPublicationInput();
    assert.throws(
      () => createPublicationModelV2({
        ...invalidStatus,
        humanStatus: { normal: "unknown", selected: "warning", verification: "passed" }
      } as unknown as Parameters<typeof createPublicationModelV2>[0]),
      /human status projection is invalid/
    );
  });
});

describe("machine publication v2 contract", () => {
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
});

describe("machine publication v2 contract", () => {
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
});

function schemaId(schema: object): string | undefined {
  return (schema as { readonly $id?: string }).$id;
}

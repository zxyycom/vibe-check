import { strict as assert } from "node:assert";
import { describe, it } from "node:test";

import { Ajv2020 } from "ajv/dist/2020.js";
import type { AnySchema } from "ajv";

import {
  MACHINE_RECORD_V3_SCHEMA,
  MACHINE_RECORD_V3_SCHEMA_PATH,
  MACHINE_RUN_V3_SCHEMA,
  MACHINE_RUN_V3_SCHEMA_PATH,
  createPublicationModelV3,
  generatePublicationContractCandidatesV3,
  projectMachinePublicationV3,
  serializeMachinePublicationV3
} from "./index.ts";
import { richPublicationInput } from "./publication-test-fixtures.ts";

describe("machine publication v3 contract", () => {
  it("generates canonical schema and example candidates that validate independently", async () => {
    const publication = projectMachinePublicationV3(
      createPublicationModelV3(await richPublicationInput())
    );
    const candidates = generatePublicationContractCandidatesV3(publication);
    assert.equal(
      candidates.schemas[MACHINE_RUN_V3_SCHEMA_PATH],
      `${JSON.stringify(MACHINE_RUN_V3_SCHEMA, null, 2)}\n`
    );
    assert.equal(
      candidates.schemas[MACHINE_RECORD_V3_SCHEMA_PATH],
      `${JSON.stringify(MACHINE_RECORD_V3_SCHEMA, null, 2)}\n`
    );
    assert.deepEqual(candidates.example, serializeMachinePublicationV3(publication));

    const ajv = new Ajv2020({ allErrors: true, strict: true });
    const validateRun = ajv.compile(
      JSON.parse(candidates.schemas[MACHINE_RUN_V3_SCHEMA_PATH]) as AnySchema
    );
    const validateRecord = ajv.compile(
      JSON.parse(candidates.schemas[MACHINE_RECORD_V3_SCHEMA_PATH]) as AnySchema
    );
    const run = JSON.parse(candidates.example.runJson) as typeof publication.run;
    const records = candidates.example.recordsNdjson.trimEnd().split("\n")
      .filter((line) => line.length > 0)
      .map((line) => JSON.parse(line) as typeof publication.records[number]);
    assert.equal(validateRun(run), true, JSON.stringify(validateRun.errors));
    assert.equal(
      records.every((record) => validateRecord(record)),
      true,
      JSON.stringify(validateRecord.errors)
    );
    assert.deepEqual(
      records.map((record) => record.recordId),
      [...records.map((record) => record.recordId)].sort()
    );
    assert.ok(records.every((record) => run.checks.some((check) => (
      check.checkId === record.checkId
      && check.recordTypes.some((recordType) => recordType.recordTypeId === record.recordTypeId)
    ))));
  });
});

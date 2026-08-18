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
      parseJsonSchema(candidates.schemas[MACHINE_RUN_V3_SCHEMA_PATH])
    );
    const validateRecord = ajv.compile(
      parseJsonSchema(candidates.schemas[MACHINE_RECORD_V3_SCHEMA_PATH])
    );
    const parsedRun = parseJsonValue(candidates.example.runJson);
    if (!validateRun(parsedRun)) {
      assert.fail(JSON.stringify(validateRun.errors));
    }
    const run = publicationRun(parsedRun);
    const records: PublishedRecord[] = [];
    for (const line of candidates.example.recordsNdjson
      .trimEnd()
      .split("\n")
      .filter((entry) => entry.length > 0)) {
      const record = parseJsonValue(line);
      if (!validateRecord(record)) {
        assert.fail(JSON.stringify(validateRecord.errors));
      }
      records.push(publicationRecord(record));
    }
    assert.deepEqual(
      records.map((record) => record.recordId),
      [...records.map((record) => record.recordId)].sort()
    );
    assert.ok(
      records.every((record) =>
        run.checks.some(
          (check) =>
            check.checkId === record.checkId &&
            check.recordTypes.some((recordType) => recordType.recordTypeId === record.recordTypeId)
        )
      )
    );
  });
});

function parseJsonSchema(source: string): AnySchema {
  const value = parseJsonValue(source);
  if (typeof value === "boolean") return value;
  if (value !== null && typeof value === "object" && !Array.isArray(value)) return value;
  throw new TypeError("Expected a JSON Schema object or boolean");
}

function parseJsonValue(source: string): unknown {
  const value: unknown = JSON.parse(source);
  return value;
}

interface PublishedRun {
  readonly checks: readonly PublishedCheck[];
}

interface PublishedCheck {
  readonly checkId: string;
  readonly recordTypes: readonly PublishedRecordType[];
}

interface PublishedRecordType {
  readonly recordTypeId: string;
}

interface PublishedRecord {
  readonly checkId: string;
  readonly recordId: string;
  readonly recordTypeId: string;
}

function publicationRun(value: unknown): PublishedRun {
  const run = jsonRecord(value, "published run");
  return {
    checks: arrayField(run, "checks").map((check, checkIndex) => {
      const checkRecord = jsonRecord(check, `checks[${checkIndex}]`);
      return {
        checkId: stringField(checkRecord, "checkId"),
        recordTypes: arrayField(checkRecord, "recordTypes").map((recordType, recordTypeIndex) => {
          const recordTypeRecord = jsonRecord(
            recordType,
            `checks[${checkIndex}].recordTypes[${recordTypeIndex}]`
          );
          return { recordTypeId: stringField(recordTypeRecord, "recordTypeId") };
        })
      };
    })
  };
}

function publicationRecord(value: unknown): PublishedRecord {
  const record = jsonRecord(value, "published record");
  return {
    checkId: stringField(record, "checkId"),
    recordId: stringField(record, "recordId"),
    recordTypeId: stringField(record, "recordTypeId")
  };
}

function jsonRecord(value: unknown, label: string): Record<string, unknown> {
  if (!isJsonRecord(value)) {
    throw new TypeError(`${label} must be a JSON object`);
  }
  return value;
}

function isJsonRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function arrayField(record: Record<string, unknown>, field: string): unknown[] {
  const value = record[field];
  if (!Array.isArray(value)) throw new TypeError(`${field} must be an array`);
  return value;
}

function stringField(record: Record<string, unknown>, field: string): string {
  const value = record[field];
  if (typeof value !== "string") throw new TypeError(`${field} must be a string`);
  return value;
}

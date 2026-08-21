import { strict as assert } from "node:assert";
import { describe, it } from "node:test";

import type { AnySchema } from "ajv";
import { Ajv2020 } from "ajv/dist/2020.js";

import {
  MACHINE_RECORD_V4_SCHEMA,
  MACHINE_RECORD_V4_SCHEMA_PATH,
  MACHINE_RUN_V4_SCHEMA,
  MACHINE_RUN_V4_SCHEMA_PATH,
  createPublicationModelV4,
  generatePublicationContractCandidatesV4,
  projectMachinePublicationV4
} from "./index.ts";
import { PUBLICATION_INVOCATION, publicationSnapshot } from "./publication-v4.test-support.ts";

describe("machine publication v4 materials", () => {
  it("generates current schemas and independently valid candidate bytes", () => {
    const publication = projectMachinePublicationV4(
      createPublicationModelV4({
        invocation: PUBLICATION_INVOCATION,
        snapshot: publicationSnapshot()
      })
    );
    const candidates = generatePublicationContractCandidatesV4(publication);
    assert.equal(
      candidates.schemas[MACHINE_RUN_V4_SCHEMA_PATH],
      `${JSON.stringify(MACHINE_RUN_V4_SCHEMA, null, 2)}\n`
    );
    assert.equal(
      candidates.schemas[MACHINE_RECORD_V4_SCHEMA_PATH],
      `${JSON.stringify(MACHINE_RECORD_V4_SCHEMA, null, 2)}\n`
    );
    const ajv = new Ajv2020({ allErrors: true, strict: true });
    const validateRun = ajv.compile(parseSchema(candidates.schemas[MACHINE_RUN_V4_SCHEMA_PATH]));
    const validateRecord = ajv.compile(
      parseSchema(candidates.schemas[MACHINE_RECORD_V4_SCHEMA_PATH])
    );
    assert.ok(validateRun(JSON.parse(candidates.example.runJson)));
    for (const line of candidates.example.recordsNdjson.trimEnd().split("\n").filter(Boolean)) {
      assert.ok(validateRecord(JSON.parse(line)));
    }
  });
});

function parseSchema(source: string): AnySchema {
  const value: unknown = JSON.parse(source);
  if (value === true || value === false) return value;
  if (value !== null && typeof value === "object" && !Array.isArray(value)) return value;
  throw new TypeError("Generated schema must be a JSON Schema object or boolean");
}

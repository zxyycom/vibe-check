import { strict as assert } from "node:assert";
import { describe, it } from "node:test";

import { Ajv2020 } from "ajv/dist/2020.js";

import { MACHINE_RECORD_V4_SCHEMA, MACHINE_RUN_V4_SCHEMA } from "./schema.ts";
import { createPublicationModelV4 } from "./publication-model.ts";
import { projectMachinePublicationV4 } from "./projection.ts";
import { serializeMachinePublicationV4 } from "./serializers.ts";
import { PUBLICATION_INVOCATION, publicationSnapshot } from "./publication.test-support.ts";

describe("machine publication v4 materials", () => {
  it("serializes candidate bytes accepted by the current schemas", () => {
    const publication = projectMachinePublicationV4(
      createPublicationModelV4({
        invocation: PUBLICATION_INVOCATION,
        snapshot: publicationSnapshot()
      })
    );
    const candidates = serializeMachinePublicationV4(publication);
    const ajv = new Ajv2020({ allErrors: true, strict: true });
    const validateRun = ajv.compile(MACHINE_RUN_V4_SCHEMA);
    const validateRecord = ajv.compile(MACHINE_RECORD_V4_SCHEMA);
    assert.ok(validateRun(JSON.parse(candidates.runJson)));
    for (const line of candidates.recordsNdjson.trimEnd().split("\n").filter(Boolean)) {
      assert.ok(validateRecord(JSON.parse(line)));
    }
  });
});

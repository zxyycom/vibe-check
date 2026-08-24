import { strict as assert } from "node:assert";
import { describe, it } from "node:test";

import { createCoreCheckSession } from "../../core/session.ts";
import { MACHINE_RECORDS_V4_FINGERPRINT_PREFIX } from "./records-fingerprint.ts";
import { createPublicationModelV4 } from "./publication-model.ts";
import { projectMachinePublicationV4 } from "./projection.ts";
import { serializeMachinePublicationV4 } from "./serializers.ts";
import { validateMachinePublicationSetV4 } from "./validation.ts";
import { PUBLICATION_INVOCATION, publicationSnapshot } from "./publication.test-support.ts";

describe("machine publication v4 contract", () => {
  it("projects four terminal Check outcomes and minimal supplemental Records", () => {
    const snapshot = publicationSnapshot();
    const model = createPublicationModelV4({
      invocation: PUBLICATION_INVOCATION,
      snapshot
    });
    const publication = projectMachinePublicationV4(model);
    assert.strictEqual(model.snapshot, snapshot);
    assert.deepEqual(
      publication.run.checks.map(({ checkId, outcome }) => [checkId, outcome.status]),
      [
        ["a-failed", "failed"],
        ["b-not-applicable", "not-applicable"],
        ["c-passed", "passed"],
        ["d-unavailable", "unavailable"]
      ]
    );
    assert.deepEqual(publication.records, [
      {
        checkId: "a-failed",
        data: { details: { count: 1 } },
        id: "sample:one",
        schemaVersion: "vibe-check.record.v4"
      }
    ]);
    assert.equal("decision" in publication.run, false);
    assert.equal("catalogFingerprint" in publication.run, false);
  });

  it("serializes a complete canonical two-file set that validates without a prefix", () => {
    const publication = projectMachinePublicationV4(
      createPublicationModelV4({
        invocation: PUBLICATION_INVOCATION,
        snapshot: publicationSnapshot()
      })
    );
    const candidates = serializeMachinePublicationV4(publication);
    const result = validateMachinePublicationSetV4({
      recordsNdjson: Buffer.from(candidates.recordsNdjson),
      runJson: Buffer.from(candidates.runJson)
    });
    assert.equal(result.ok, true, result.ok ? "" : result.diagnostic.message);
    if (!result.ok) return;
    assert.equal(Object.isFrozen(result.value.run), true);
    assert.equal(Object.isFrozen(result.value.records), true);

    const session = createCoreCheckSession([
      { definition: { checkId: "integer-check", displayName: "Integer check" } }
    ]);
    const integerCheck = session.openCheckScope("integer-check");
    integerCheck.records.report({ id: "integer" }, { "2": "two", "10": { "2": 2, "10": 10 } });
    integerCheck.settle({ status: "passed", data: { "2": "two", "10": 10 } });
    const integerPublication = projectMachinePublicationV4(
      createPublicationModelV4({ invocation: PUBLICATION_INVOCATION, snapshot: session.freeze() })
    );
    assert.equal(
      integerPublication.run.recordsFingerprint,
      `${MACHINE_RECORDS_V4_FINGERPRINT_PREFIX}050d6f6d2219611f981cf03e82844e4fcdf2e86d6855704ff23840bb41958e44`
    );
  });
});

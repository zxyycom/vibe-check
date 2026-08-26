import { strict as assert } from "node:assert";
import { describe, it } from "node:test";

import { createPublicationModelV4 } from "./publication-model.ts";
import { projectMachinePublicationV4 } from "./projection.ts";
import { serializeMachinePublicationV4 } from "./serializers.ts";
import { validateMachinePublicationSetV4 } from "./validation.ts";
import { PUBLICATION_INVOCATION, publicationSnapshot } from "./publication.test-support.ts";

function validCandidates() {
  return serializeMachinePublicationV4(
    projectMachinePublicationV4(
      createPublicationModelV4({
        invocation: PUBLICATION_INVOCATION,
        snapshot: publicationSnapshot()
      })
    )
  );
}

function assertFailure(
  bytes: Readonly<{ recordsNdjson: Uint8Array; runJson: Uint8Array }>,
  relationship?: string
): void {
  const result = validateMachinePublicationSetV4(bytes);
  assert.equal(result.ok, false);
  if (result.ok) return;
  if (relationship !== undefined) assert.equal(result.diagnostic.relationship, relationship);
}

function parseJsonObject(source: string, label: string): Record<string, unknown> {
  const value: unknown = JSON.parse(source);
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    throw new TypeError(`${label} must be a JSON object`);
  }
  const record: Record<string, unknown> = {};
  for (const [key, entry] of Object.entries(value)) record[key] = entry;
  return record;
}

function arrayField(record: Record<string, unknown>, field: string): unknown[] {
  const value = record[field];
  if (!Array.isArray(value)) throw new TypeError(`${field} must be an array`);
  return value;
}

describe("machine publication v4 validation", () => {
  it("rejects v3 identities and malformed v4 rows", () => {
    const candidates = validCandidates();
    const run = parseJsonObject(candidates.runJson, "run candidate");
    run.schemaVersion = "vibe-check.run.v3";
    assertFailure({
      recordsNdjson: Buffer.from(candidates.recordsNdjson),
      runJson: Buffer.from(JSON.stringify(run))
    });

    const record = parseJsonObject(candidates.recordsNdjson, "record candidate");
    record.schemaVersion = "vibe-check.record.v3";
    assertFailure({
      recordsNdjson: Buffer.from(`${JSON.stringify(record)}\n`),
      runJson: Buffer.from(candidates.runJson)
    });

    assertFailure(
      {
        recordsNdjson: Buffer.from(candidates.recordsNdjson),
        runJson: Buffer.from(
          candidates.runJson.replace('"summary": "found one"', '"summary": 1e400')
        )
      },
      "core-snapshot"
    );
  });

  it("rejects mixed generations, composite duplicates, and unknown owners", () => {
    const candidates = validCandidates();
    const run = parseJsonObject(candidates.runJson, "run candidate");
    const record = parseJsonObject(candidates.recordsNdjson, "record candidate");

    const altered = structuredClone(record);
    altered.data = { changed: true };
    assertFailure(
      {
        recordsNdjson: Buffer.from(`${JSON.stringify(altered)}\n`),
        runJson: Buffer.from(candidates.runJson)
      },
      "records-fingerprint"
    );

    assertFailure(
      {
        recordsNdjson: Buffer.from(`${JSON.stringify(record)}\n${JSON.stringify(record)}\n`),
        runJson: Buffer.from(candidates.runJson)
      },
      "record-canonical-order"
    );

    record.checkId = "unknown-check";
    assertFailure(
      {
        recordsNdjson: Buffer.from(`${JSON.stringify(record)}\n`),
        runJson: Buffer.from(candidates.runJson)
      },
      "record-check-ownership"
    );

    run.checks = [...arrayField(run, "checks")].reverse();
    assertFailure(
      {
        recordsNdjson: Buffer.from(candidates.recordsNdjson),
        runJson: Buffer.from(JSON.stringify(run))
      },
      "check-canonical-order"
    );
  });
});

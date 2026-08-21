import { strict as assert } from "node:assert";
import { describe, it } from "node:test";

import { validateCheckDefinition, validateCoreSnapshot } from "./validation.ts";

describe("check-record foundation runtime validation", () => {
  it("rejects Check definition accessors without executing them", () => {
    const definition = { checkId: "custom", displayName: "Custom" };
    Object.defineProperty(definition, "displayName", {
      enumerable: true,
      get: () => {
        throw new Error("must not execute");
      }
    });
    assert.equal(validateCheckDefinition(definition).ok, false);
  });

  it("creates detached frozen final and Record facts from canonical input", () => {
    const input = {
      checks: [
        {
          checkId: "custom",
          displayName: "Custom",
          outcome: { status: "passed", data: { nested: { value: true } } }
        }
      ],
      records: [{ checkId: "custom", id: "sample", data: { nested: { value: true } } }]
    };
    const validated = validateCoreSnapshot(input);

    assert.equal(validated.ok, true);
    if (!validated.ok) return;
    assert.notStrictEqual(validated.value.checks[0]?.outcome, input.checks[0]?.outcome);
    assert.notStrictEqual(validated.value.records[0]?.data, input.records[0]?.data);
    const outcome = validated.value.checks[0]?.outcome;
    assert.equal(
      outcome?.status === "passed" || outcome?.status === "failed"
        ? Object.isFrozen(outcome.data)
        : false,
      true
    );
    assert.equal(Object.isFrozen(validated.value.records[0]?.data), true);
  });

  it("rejects non-canonical final or Record data and invalid ownership", () => {
    const base = {
      checks: [
        {
          checkId: "custom",
          displayName: "Custom",
          outcome: { status: "passed", data: {} }
        }
      ],
      records: []
    };
    assert.equal(
      validateCoreSnapshot({
        ...base,
        checks: [{ ...base.checks[0], outcome: { status: "passed", data: [1] } }]
      }).ok,
      false
    );
    assert.equal(
      validateCoreSnapshot({
        ...base,
        records: [{ checkId: "missing", id: "sample", data: {} }]
      }).ok,
      false
    );
    assert.equal(
      validateCoreSnapshot({
        ...base,
        records: [{ checkId: "custom", id: "", data: {} }]
      }).ok,
      false
    );
  });
});

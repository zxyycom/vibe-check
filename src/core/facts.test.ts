import { strict as assert } from "node:assert";
import { describe, it } from "node:test";

import { canonicalizeJsonObject } from "../foundation/canonical-data.ts";
import { validateCheckDefinition, validateCoreSnapshot } from "./fact-validation.ts";

const definition = { checkId: "file-metrics", displayName: "File metrics" } as const;

describe("check-record foundation model", () => {
  it("accepts exactly one four-state terminal outcome for each Core Check", () => {
    const outcomes = [
      { status: "passed", data: { count: 1 } },
      { status: "failed", data: { count: 0 } },
      { status: "not-applicable" },
      { status: "not-applicable", reason: { code: "no-eligible-input" } },
      { status: "unavailable", reason: { code: "execution-threw" } },
      {
        status: "unavailable",
        reason: { code: "prerequisite-unavailable", checkIds: ["upstream-check"] }
      }
    ] as const;

    for (const outcome of outcomes) {
      assert.equal(
        validateCoreSnapshot({ checks: [{ ...definition, outcome }], records: [] }).ok,
        true
      );
    }
    for (const outcome of [
      { status: "passed", data: 1 },
      { status: "failed" },
      { status: "not-applicable", data: {} },
      { status: "unavailable", reason: { code: "" } },
      { status: "completed", verdict: "passed" }
    ]) {
      assert.equal(
        validateCoreSnapshot({ checks: [{ ...definition, outcome }], records: [] }).ok,
        false
      );
    }
  });

  it("validates an exact canonical two-entity snapshot with structural Record identity", () => {
    const snapshot = {
      checks: [
        {
          checkId: "alpha-check",
          displayName: "Alpha",
          outcome: { status: "passed", data: { result: true } }
        },
        {
          checkId: "beta-check",
          displayName: "Beta",
          outcome: { status: "not-applicable" }
        }
      ],
      records: [
        { checkId: "alpha-check", id: "a", data: { value: 1 } },
        { checkId: "beta-check", id: "a", data: { value: 2 } }
      ]
    };
    const validated = validateCoreSnapshot(snapshot);

    assert.equal(validated.ok, true);
    if (!validated.ok) return;
    assert.deepEqual(validated.value.records, snapshot.records);
    assert.equal(Object.isFrozen(validated.value.records[0]?.data), true);
    assert.equal(validateCoreSnapshot({ ...snapshot, definitions: [] }).ok, false);
    assert.equal(
      validateCoreSnapshot({
        ...snapshot,
        records: [
          { checkId: "alpha-check", id: "a", data: {} },
          { checkId: "alpha-check", id: "a", data: {} }
        ]
      }).ok,
      false
    );
  });

  it("materializes canonical final and Record data without evaluating author properties", () => {
    const data: Record<string, unknown> = {};
    Object.setPrototypeOf(data, null);
    Object.defineProperty(data, "z", { enumerable: true, value: -0 });
    Object.defineProperty(data, "__proto__", { enumerable: true, value: { nested: true } });
    Object.defineProperty(data, "a", { enumerable: true, value: [1, { b: false }] });
    const canonical = canonicalizeJsonObject(data);

    assert.deepEqual(Object.keys(canonical ?? {}), ["__proto__", "a", "z"]);
    assert.equal(canonical?.z, 0);
    assert.deepEqual(canonical?.__proto__, { nested: true });
    assert.equal(Object.getPrototypeOf(canonical ?? {}), null);
    assert.equal(Object.isFrozen(canonical), true);
    assert.equal(Object.isFrozen(canonical?.a), true);

    const accessor: Record<string, unknown> = {};
    Object.setPrototypeOf(accessor, null);
    Object.defineProperty(accessor, "value", {
      enumerable: true,
      get: () => {
        throw new Error("must not run");
      }
    });
    assert.equal(canonicalizeJsonObject(accessor), undefined);
    const sparse: unknown[] = [];
    sparse.length = 2;
    sparse[1] = 1;
    assert.equal(canonicalizeJsonObject({ sparse }), undefined);
    assert.equal(canonicalizeJsonObject({ number: Number.POSITIVE_INFINITY }), undefined);
    const namedArray: unknown[] = [1];
    Object.defineProperty(namedArray, "named", { enumerable: true, value: true });
    assert.equal(canonicalizeJsonObject({ namedArray }), undefined);
    const nonEnumerable = { visible: true };
    Object.defineProperty(nonEnumerable, "hidden", { enumerable: false, value: true });
    assert.equal(canonicalizeJsonObject(nonEnumerable), undefined);
    const unsupportedPrototype = { value: true };
    Object.setPrototypeOf(unsupportedPrototype, { inherited: true });
    assert.equal(canonicalizeJsonObject(unsupportedPrototype), undefined);
    let toJsonCalled = false;
    const toJson = {
      toJSON: () => {
        toJsonCalled = true;
        return {};
      }
    };
    assert.equal(canonicalizeJsonObject(toJson), undefined);
    assert.equal(toJsonCalled, false);
    const cyclic: Record<string, unknown> = {};
    cyclic.self = cyclic;
    assert.equal(canonicalizeJsonObject(cyclic), undefined);
  });

  it("accepts only closed Check definitions", () => {
    assert.deepEqual(validateCheckDefinition(definition), {
      ok: true,
      value: definition
    });
    assert.equal(validateCheckDefinition({ ...definition, recordTypes: [] }).ok, false);
    assert.equal(
      validateCheckDefinition({ checkId: "invalid id", displayName: "Invalid" }).ok,
      false
    );
  });
});

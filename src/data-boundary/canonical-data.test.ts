import { strict as assert } from "node:assert";
import { describe, it } from "node:test";

import {
  canonicalizeJsonObject,
  canonicalizeJsonValue,
  canonicalJsonBytes,
  canonicalJsonText
} from "./canonical-data.ts";
import type { CanonicalJsonPrimitive, CanonicalJsonValue } from "./canonical-data.ts";

describe("check-record canonical data", () => {
  it("emits detached deep-frozen canonical UTF-8 JSON for safe values", () => {
    const bytes = canonicalJsonBytes({ z: -0, a: { b: true }, list: [2, 1] });

    assert.equal(new TextDecoder().decode(bytes), '{"a":{"b":true},"list":[2,1],"z":0}');
    const numericKeys = canonicalizeJsonObject({ "2": "two", "10": { "2": "two", "10": "ten" } });
    assert.ok(numericKeys !== undefined);
    assert.equal(Object.getPrototypeOf(numericKeys), null);
    assert.equal(
      canonicalJsonText({ "2": "two", "10": { "2": "two", "10": "ten" } }),
      '{"10":{"10":"ten","2":"two"},"2":"two"}'
    );
    assert.equal(JSON.stringify(numericKeys), '{"2":"two","10":{"2":"two","10":"ten"}}');
    assert.equal(
      new TextDecoder().decode(
        canonicalJsonBytes({ "2": "two", "10": { "2": "two", "10": "ten" } })
      ),
      '{"10":{"10":"ten","2":"two"},"2":"two"}'
    );

    const inputNested = { stable: true };
    const inputListEntry = { retained: true };
    const input = { nested: inputNested, list: [inputListEntry] };
    const canonical = canonicalizeJsonObject(input);
    assert.ok(canonical !== undefined);
    const canonicalNested = canonical.nested;
    const canonicalList = canonical.list;
    assert.ok(
      canonicalNested !== null &&
        typeof canonicalNested === "object" &&
        !Array.isArray(canonicalNested)
    );
    assert.ok(canonicalList !== undefined);
    assert.ok(isCanonicalJsonArray(canonicalList));
    const canonicalListEntry = canonicalList[0];
    assert.ok(
      canonicalListEntry !== null &&
        typeof canonicalListEntry === "object" &&
        !Array.isArray(canonicalListEntry)
    );
    assert.notEqual(canonical, input);
    assert.notEqual(canonicalNested, inputNested);
    assert.notEqual(canonicalList, input.list);
    assert.notEqual(canonicalListEntry, inputListEntry);
    assert.equal(Object.getPrototypeOf(canonical), null);
    assert.equal(Object.getPrototypeOf(canonicalNested), null);
    assert.equal(Object.isFrozen(canonical), true);
    assert.equal(Object.isFrozen(canonicalNested), true);
    assert.equal(Object.isFrozen(canonicalList), true);
    assert.equal(Object.isFrozen(canonicalListEntry), true);
    inputNested.stable = false;
    inputListEntry.retained = false;
    assert.equal(
      canonicalJsonText(canonical),
      '{"list":[{"retained":true}],"nested":{"stable":true}}'
    );

    const staticallyExpressibleNaN: CanonicalJsonPrimitive = Number.NaN;
    assert.equal(canonicalizeJsonValue(staticallyExpressibleNaN), undefined);
    assert.throws(() => canonicalJsonBytes({ value: Number.POSITIVE_INFINITY }));
    assert.throws(() => canonicalJsonBytes({ value: undefined }));
  });

  it("rejects accessors, sparse arrays, and reflection failures without invoking author hooks", () => {
    let accessorRead = false;
    const accessor = {};
    Object.defineProperty(accessor, "value", {
      enumerable: true,
      get: () => {
        accessorRead = true;
        return "must not execute";
      }
    });
    assert.throws(() => canonicalJsonBytes(accessor), /Canonical JSON/);
    assert.equal(accessorRead, false);
    const sparse: unknown[] = [];
    sparse.length = 2;
    sparse[1] = 1;
    assert.throws(() => canonicalJsonBytes(sparse), /Canonical JSON/);
    const trapped = new Proxy(
      {},
      {
        ownKeys: () => {
          throw new Error("credential=hidden");
        }
      }
    );
    assert.throws(() => canonicalJsonBytes(trapped), /Canonical JSON/);
  });
});

function isCanonicalJsonArray(value: CanonicalJsonValue): value is readonly CanonicalJsonValue[] {
  return Array.isArray(value);
}

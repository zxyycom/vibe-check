import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { snapshotClosedArray, snapshotExactClosedRecord } from "./closed-values.ts";

describe("public closed data snapshots", () => {
  it("accepts only exact own data shapes without evaluating accessors or reflection failures", () => {
    const callback = () => "retained";
    const nested = { retained: true };
    const exact = snapshotExactClosedRecord(
      { callback, kind: "bundle", missing: undefined, nested },
      ["callback", "kind", "missing", "nested"] as const
    );
    assert.ok(exact !== undefined);
    assert.deepEqual(exact, { callback, kind: "bundle", missing: undefined, nested });
    assert.equal(Object.isFrozen(exact), true);
    assert.equal(exact.callback, callback);
    assert.equal(Object.hasOwn(exact, "missing"), true);
    assert.equal(exact.missing, undefined);
    assert.equal(exact.nested, nested);
    nested.retained = false;
    assert.deepEqual(exact.nested, { retained: false });

    assert.equal(snapshotExactClosedRecord({ kind: "bundle" }, ["kind", "version"]), undefined);
    assert.equal(snapshotExactClosedRecord({ extra: true, kind: "bundle" }, ["kind"]), undefined);

    for (const keyCount of [0, 1, 2, 16, 256, 1024]) {
      const keys = Array.from({ length: keyCount }, (_, index) => `field-${index}`);
      const input = Object.fromEntries(keys.map((key) => [key, nested]));
      const orders = [
        keys,
        [...keys].reverse(),
        [
          ...keys.filter((_, index) => index % 2 === 1),
          ...keys.filter((_, index) => index % 2 === 0)
        ],
        [...keys.slice(0, -2), ...keys.slice(-2).reverse()]
      ];
      for (const orderedKeys of orders) {
        const snapshot = snapshotExactClosedRecord(input, orderedKeys);
        assert.ok(snapshot !== undefined);
        assert.notEqual(snapshot, input);
        assert.deepEqual(snapshot, input);
        assert.equal(Object.getPrototypeOf(snapshot), Object.prototype);
        assert.equal(Object.isFrozen(snapshot), true);
        for (const key of keys) assert.equal(snapshot[key], nested);
      }
      assert.equal(snapshotExactClosedRecord(input, [...keys, "absent"]), undefined);
      if (keyCount > 0) {
        assert.equal(snapshotExactClosedRecord(input, keys.slice(1)), undefined);
        for (const missingIndex of [0, keyCount - 1]) {
          assert.equal(
            snapshotExactClosedRecord(
              input,
              keys.map((key, index) => (index === missingIndex ? "absent" : key))
            ),
            undefined
          );
        }
      }
      if (keyCount >= 2) {
        assert.equal(
          snapshotExactClosedRecord(
            input,
            keys.map((key, index) => (index === 1 ? "field-0" : key))
          ),
          undefined
        );
        assert.equal(
          snapshotExactClosedRecord(input, [...keys.slice(0, -1), `field-${keyCount - 2}`]),
          undefined
        );
      }
    }

    const special = Object.fromEntries<unknown>([
      ["__proto__", nested],
      ["constructor", callback],
      ["10", undefined],
      ["2", -0]
    ]);
    const nonIterableKeys = ["2", "__proto__", "10", "constructor"];
    Object.defineProperty(nonIterableKeys, Symbol.iterator, {
      value() {
        throw new Error("caller key iteration must not run");
      }
    });
    assert.deepEqual(snapshotExactClosedRecord(special, nonIterableKeys), special);
    const nullPrototype: unknown = Object.assign(Object.create(null), special);
    assert.deepEqual(snapshotExactClosedRecord(nullPrototype, Object.keys(special)), special);
    assert.equal(snapshotExactClosedRecord({ [Symbol("kind")]: "bundle" }, []), undefined);
    assert.equal(
      snapshotExactClosedRecord(Object.defineProperty({}, "kind", { value: "bundle" }), ["kind"]),
      undefined
    );

    let accessorRead = false;
    const accessor = { kind: "bundle" };
    Object.defineProperty(accessor, "version", {
      enumerable: true,
      get() {
        accessorRead = true;
        return 1;
      }
    });
    assert.equal(snapshotExactClosedRecord(accessor, ["kind", "version"]), undefined);
    assert.equal(accessorRead, false);

    const trapped = new Proxy(
      {},
      {
        ownKeys() {
          throw new Error("must remain contained");
        }
      }
    );
    assert.equal(snapshotExactClosedRecord(trapped, []), undefined);
  });

  it("accepts only dense standard arrays and keeps items as shallow references", () => {
    const callback = () => "retained";
    const nested = { retained: true };
    const snapshot = snapshotClosedArray([callback, undefined, nested]);
    assert.ok(snapshot !== undefined);
    assert.equal(Object.isFrozen(snapshot), true);
    assert.equal(snapshot[0], callback);
    assert.equal(Object.hasOwn(snapshot, "1"), true);
    assert.equal(snapshot[1], undefined);
    assert.equal(snapshot[2], nested);
    nested.retained = false;
    assert.deepEqual(snapshot[2], { retained: false });

    const sparse: unknown[] = [];
    sparse.length = 2;
    sparse[1] = "present";
    assert.equal(snapshotClosedArray(sparse), undefined);

    const named = ["item"];
    Object.defineProperty(named, "other", { enumerable: true, value: true });
    assert.equal(snapshotClosedArray(named), undefined);

    let accessorRead = false;
    const accessor = ["item"];
    Object.defineProperty(accessor, "0", {
      enumerable: true,
      get() {
        accessorRead = true;
        return "must not run";
      }
    });
    assert.equal(snapshotClosedArray(accessor), undefined);
    assert.equal(accessorRead, false);
  });
});

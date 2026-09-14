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

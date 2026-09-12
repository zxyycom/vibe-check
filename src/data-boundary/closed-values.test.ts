import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { snapshotClosedArray, snapshotExactClosedRecord } from "./closed-values.ts";

describe("public closed data snapshots", () => {
  it("accepts only exact own data shapes without evaluating accessors or reflection failures", () => {
    const nested = { retained: true };
    const exact = snapshotExactClosedRecord({ kind: "bundle", nested }, [
      "kind",
      "nested"
    ] as const);
    assert.deepEqual(exact, { kind: "bundle", nested });
    assert.equal(Object.isFrozen(exact), true);
    assert.equal(exact?.nested, nested);
    nested.retained = false;
    assert.deepEqual(exact?.nested, { retained: false });

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
    const nested = { retained: true };
    const snapshot = snapshotClosedArray([nested]);
    assert.equal(Object.isFrozen(snapshot), true);
    assert.equal(snapshot?.[0], nested);
    nested.retained = false;
    assert.deepEqual(snapshot?.[0], { retained: false });

    const sparse: unknown[] = [];
    sparse.length = 2;
    sparse[1] = "present";
    assert.equal(snapshotClosedArray(sparse), undefined);

    const named = ["item"];
    Object.defineProperty(named, "other", { enumerable: true, value: true });
    assert.equal(snapshotClosedArray(named), undefined);

    const accessor = ["item"];
    Object.defineProperty(accessor, "0", {
      enumerable: true,
      get() {
        throw new Error("must not run");
      }
    });
    assert.equal(snapshotClosedArray(accessor), undefined);
  });
});

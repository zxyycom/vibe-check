import { strict as assert } from "node:assert";
import { describe, it } from "node:test";

import { canonicalJsonBytes, normalizeSemanticSubject } from "./identity.ts";

describe("check-record foundation identity", () => {
  it("emits canonical UTF-8 JSON for safe detached values", () => {
    const bytes = canonicalJsonBytes({ z: -0, a: { b: true }, list: [2, 1] });

    assert.equal(new TextDecoder().decode(bytes), '{"a":{"b":true},"list":[2,1],"z":0}');
    assert.equal(
      new TextDecoder().decode(
        canonicalJsonBytes({ "2": "two", "10": { "2": "two", "10": "ten" } })
      ),
      '{"10":{"10":"ten","2":"two"},"2":"two"}'
    );
    assert.throws(() => canonicalJsonBytes({ value: Number.POSITIVE_INFINITY }));
    assert.throws(() => canonicalJsonBytes({ value: undefined }));
  });

  it("rejects accessors, sparse arrays, and reflection failures without invoking author hooks", () => {
    const accessor = {};
    Object.defineProperty(accessor, "value", {
      enumerable: true,
      get: () => {
        throw new Error("must not execute");
      }
    });
    assert.throws(() => canonicalJsonBytes(accessor), /Canonical JSON/);
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

  it("normalizes Check-local semantic subjects without creating Record identities", () => {
    assert.equal(normalizeSemanticSubject("a\r\nb\r"), "a\nb\n");
    assert.equal(normalizeSemanticSubject("Keep Case"), "Keep Case");
  });
});

import { strict as assert } from "node:assert";
import { describe, it } from "node:test";

import { fromNullable, none, some } from "./index.ts";

describe("product Option", () => {
  it("composes present values without entering absence branches", () => {
    const effects: string[] = [];
    const present = some(2);

    assert.equal(present.isSome(), true);
    assert.equal(present.isNone(), false);
    assert.equal(present.map((value) => value * 3).unwrapOr(0), 6);
    assert.equal(
      present.andThen((value) => some(`value:${value}`)).unwrapOr("missing"),
      "value:2"
    );
    assert.strictEqual(present.filter((value) => value > 1), present);
    assert.strictEqual(present.filter((value) => value > 2), none);
    assert.equal(present.match((value) => value + 1, () => 0), 3);
    assert.strictEqual(
      present.andDo((value) => effects.push(`some:${value}`)),
      present
    );
    assert.strictEqual(
      present.orDo(() => effects.push("none")),
      present
    );
    assert.strictEqual(present.or(some(9)), present);
    assert.strictEqual(
      present.orElse(() => {
        effects.push("fallback");
        return some(9);
      }),
      present
    );
    assert.equal(present.unwrapOr(0), 2);
    assert.deepEqual(effects, ["some:2"]);
  });

  it("keeps absence stable and evaluates only fallback branches", () => {
    const effects: string[] = [];
    const fallback = some("fallback");

    assert.equal(none.isSome(), false);
    assert.equal(none.isNone(), true);
    assert.strictEqual(none.map(() => "mapped"), none);
    assert.strictEqual(none.andThen(() => some("chained")), none);
    assert.strictEqual(
      none.andDo(() => effects.push("some")),
      none
    );
    assert.strictEqual(
      none.orDo(() => effects.push("none")),
      none
    );
    assert.strictEqual(none.filter(() => true), none);
    assert.strictEqual(none.or(fallback), fallback);
    assert.strictEqual(
      none.orElse(() => {
        effects.push("fallback");
        return fallback;
      }),
      fallback
    );
    assert.equal(none.unwrapOr("default"), "default");
    assert.equal(none.match(() => "some", () => "none"), "none");
    assert.deepEqual(effects, ["none", "fallback"]);
  });

  it("converts nullable inputs and Result boundaries without losing values or errors", () => {
    assert.strictEqual(fromNullable(null), none);
    assert.strictEqual(fromNullable(undefined), none);
    assert.equal(fromNullable(0).unwrapOr(1), 0);
    assert.deepEqual(
      some(2).toResult().match(
        (value) => ({ value }),
        (error) => ({ error })
      ),
      { value: 2 }
    );
    assert.deepEqual(
      none.toResult("missing").match(
        (value) => ({ value }),
        (error) => ({ error })
      ),
      { error: "missing" }
    );
    assert.deepEqual(
      none.toResult().match(
        (value) => ({ value }),
        (error) => ({ error })
      ),
      { error: "None.toResult called on None" }
    );
  });
});

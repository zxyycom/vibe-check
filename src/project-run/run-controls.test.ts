import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  assertBlockedPreflight,
  assertInvalidRunControlsAndDefinition
} from "./run.test-support.ts";

describe("Package Run", () => {
  it("rejects invalid closed controls while a blocked preflight settles unavailable before execution", async () => {
    let calls = 0;
    let preflightReceivedFrozenOptions = false;
    await assertInvalidRunControlsAndDefinition(() => ++calls);
    await assertBlockedPreflight(
      () => ++calls,
      (frozen) => {
        preflightReceivedFrozenOptions = frozen;
      }
    );
    assert.equal(preflightReceivedFrozenOptions, true);
    assert.equal(calls, 0);
  });
});

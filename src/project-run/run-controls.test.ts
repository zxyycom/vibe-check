import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  assertBlockedPreparation,
  assertInvalidRunControlsAndDefinition
} from "./run.test-support.ts";

describe("Package Run", () => {
  it("rejects invalid closed controls while a blocked preparation settles unavailable before execution", async () => {
    let calls = 0;
    let preparationReceivedFrozenOptions = false;
    await assertInvalidRunControlsAndDefinition(() => ++calls);
    await assertBlockedPreparation(
      () => ++calls,
      (frozen) => {
        preparationReceivedFrozenOptions = frozen;
      }
    );
    assert.equal(preparationReceivedFrozenOptions, true);
    assert.equal(calls, 0);
  });
});

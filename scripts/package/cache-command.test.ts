import assert from "node:assert/strict";
import test from "node:test";

import { runPackageCacheCommand } from "./cache-command.ts";

test("explicit package cache command validates arguments before online preparation and propagates failure", () => {
  let prepared = false;
  assert.throws(() => {
    runPackageCacheCommand(["--offline"], () => {
      prepared = true;
    });
  }, /usage:/);
  assert.equal(prepared, false);
  runPackageCacheCommand([], () => {
    prepared = true;
  });
  assert.equal(prepared, true);
  const failure = new Error("cache preparation unavailable");
  assert.throws(
    () => {
      runPackageCacheCommand([], () => {
        throw failure;
      });
    },
    (error: unknown) => error === failure
  );
});

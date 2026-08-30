import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { check, definition, deferred, PASSED } from "./run.test-support.ts";
import { run } from "./run.ts";

describe("Package Run", () => {
  it("returns the existing execution cancellation result when the preflight barrier aborts", async () => {
    const controller = new AbortController();
    const preflightEntered = deferred();
    let callbackCalls = 0;
    const cancelled = run(
      definition([
        {
          ...check({
            execution: () => {
              callbackCalls += 1;
              return PASSED;
            }
          }),
          options: {},
          preflight: async (_options, signal) => {
            assert.equal(signal, controller.signal);
            preflightEntered.resolve();
            await new Promise<void>((resolve) =>
              signal.addEventListener("abort", () => resolve(), { once: true })
            );
            return { status: "success", preparedOptions: {} };
          }
        }
      ]),
      { signal: controller.signal }
    );
    await preflightEntered.promise;
    controller.abort();
    const result = await cancelled;
    assert.equal(result.kind, "cancelled");
    if (result.kind === "cancelled") {
      assert.equal(result.phase, "execution");
      assert.deepEqual(result.snapshot.checks[0]?.outcome, {
        status: "unavailable",
        reason: { code: "execution-cancelled" }
      });
    }
    assert.equal(callbackCalls, 0);
  });
});

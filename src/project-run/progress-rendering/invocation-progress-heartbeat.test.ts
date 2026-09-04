import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { executeValidatedRun } from "../invocation.ts";
import {
  capturedProgressWriter,
  capturedRefreshScheduler,
  check,
  deferred,
  definition,
  PASSED
} from "./invocation.test-support.ts";

describe("Package Run progress rendering outputs", () => {
  it("schedules one 5-second TTY heartbeat and cancels it after the last Check settles", async () => {
    const output = capturedProgressWriter({ isTTY: true });
    const slow = deferred<void>();
    const slowStarted = deferred<void>();
    const refresh = capturedRefreshScheduler();
    let nowMs = 0;
    const running = executeValidatedRun(
      definition(
        [
          check({
            execution: async () => {
              slowStarted.resolve(undefined);
              await slow.promise;
              return PASSED;
            }
          })
        ],
        true
      ),
      {},
      [],
      {
        clock: { now: () => nowMs },
        progressRefreshScheduler: refresh.scheduler,
        progressWriterFactory: () => output.writer
      }
    );

    await slowStarted.promise;
    assert.equal(refresh.intervalMs(), 5_000);
    nowMs = 5_000;
    refresh.refresh();
    assert.equal(output.writes.at(-1), "  [1/1] Custom | running | 5s\n");
    slow.resolve(undefined);
    const result = await running;

    assert.equal(result.kind, "completed");
    assert.equal(result.outputs.progressRendering.status, "succeeded");
    assert.equal(refresh.cancellations(), 1);
  });
});

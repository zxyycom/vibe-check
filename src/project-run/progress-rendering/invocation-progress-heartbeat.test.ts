import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { defineConfig } from "../../project-definition/project-definition.ts";
import { executeValidatedRun } from "../invocation/run.ts";
import {
  capturedProgressWriter,
  capturedRefreshScheduler,
  check,
  deferred,
  PASSED
} from "./invocation.test-support.ts";

describe("Package Run progress rendering outputs", () => {
  it("schedules one 5-second TTY heartbeat and cancels it after the last Check settles", async () => {
    const output = capturedProgressWriter({ isTTY: true });
    const first = deferred<void>();
    const second = deferred<void>();
    const firstStarted = deferred<void>();
    const secondStarted = deferred<void>();
    const firstSettled = deferred<void>();
    const terminalStarted = deferred<void>();
    const terminal = deferred<void>();
    const refresh = capturedRefreshScheduler();
    let nowMs = 0;
    const running = executeValidatedRun(
      defineConfig({
        checks: [
          check({
            checkId: "first",
            execute: async () => {
              firstStarted.resolve(undefined);
              await first.promise;
              return PASSED;
            }
          }),
          check({
            checkId: "second",
            execute: async () => {
              secondStarted.resolve(undefined);
              await second.promise;
              return PASSED;
            }
          })
        ],
        outputs: {
          diagnosticLogging: { enabled: false },
          machinePublication: { enabled: false },
          progressRendering: { enabled: true }
        },
        scheduler: {
          maxParallel: 2,
          terminalEffects: [
            async () => {
              terminalStarted.resolve(undefined);
              await terminal.promise;
            }
          ]
        }
      }),
      {},
      [],
      {
        clock: { now: () => nowMs },
        progressRefreshScheduler: refresh.scheduler,
        progressWriterFactory: () => ({
          ...output.writer,
          write: (content) => {
            output.writer.write(content);
            if (content.startsWith("  [1/2] first | passed")) firstSettled.resolve(undefined);
          }
        })
      }
    );

    try {
      await firstStarted.promise;
      await secondStarted.promise;
      assert.equal(refresh.intervalMs(), 5_000);
      assert.equal(refresh.schedules(), 1);
      assert.equal(refresh.activeHandles(), 1);
      nowMs = 5_000;
      refresh.refresh();
      assert.deepEqual(output.writes.slice(-2), [
        "  [1/2] first | running | 5s\n",
        "  [2/2] second | running | 5s\n"
      ]);
      first.resolve(undefined);
      await firstSettled.promise;
      assert.equal(refresh.cancellations(), 0);
      assert.equal(refresh.activeHandles(), 1);
      nowMs = 10_000;
      refresh.refresh();
      assert.equal(output.writes.at(-1), "  [2/2] second | running | 10s\n");
      second.resolve(undefined);
      await terminalStarted.promise;
      // The last Check has settled, but final presentation and writer close are still gated.
      assert.equal(refresh.schedules(), 1);
      assert.equal(refresh.cancellations(), 1);
      assert.equal(refresh.activeHandles(), 0);
      terminal.resolve(undefined);
      const result = await running;

      assert.equal(result.kind, "completed");
      assert.equal(result.outputs.progressRendering.status, "succeeded");
      assert.equal(refresh.cancellations(), 1);
    } finally {
      first.resolve(undefined);
      second.resolve(undefined);
      terminal.resolve(undefined);
      await running;
    }
  });
});

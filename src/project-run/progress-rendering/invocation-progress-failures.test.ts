import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { executeValidatedRun } from "../invocation/run.ts";
import {
  capturedProgressWriter,
  capturedRefreshScheduler,
  check,
  deferred,
  definition,
  PASSED
} from "./invocation.test-support.ts";

describe("Package Run progress rendering outputs", () => {
  it("does not create or write a progress writer when Package Run progress is disabled", async () => {
    let factoryCalls = 0;
    const result = await executeValidatedRun(definition([check()]), {}, [], {
      progressWriterFactory: () => {
        factoryCalls += 1;
        return capturedProgressWriter().writer;
      }
    });

    assert.equal(result.kind, "completed");
    assert.equal(result.outputs.progressRendering.status, "disabled");
    assert.equal(factoryCalls, 0);
  });

  it("contains progress writer failures while preserving completed Check facts", async () => {
    const output = capturedProgressWriter({ throws: true });
    let calls = 0;
    const result = await executeValidatedRun(
      definition(
        [
          check({
            execution: () => {
              calls += 1;
              return PASSED;
            }
          })
        ],
        true
      ),
      {},
      [],
      { progressWriterFactory: () => output.writer }
    );

    assert.equal(calls, 1);
    assert.equal(result.kind, "output");
    if (result.kind !== "output") return;
    assert.deepEqual(result.diagnostic, { code: "progress-rendering-failed" });
    assert.equal(result.outputs.progressRendering.status, "failed");
    assert.deepEqual(result.snapshot.checks[0]?.outcome, PASSED);
  });

  it("contains a Record preview write failure while retaining accepted Check and Record facts", async () => {
    const output = capturedProgressWriter({ throwAtWrite: 2 });
    const result = await executeValidatedRun(
      definition(
        [
          check({
            execution: ({ records }) => {
              records.report({ id: "accepted" }, { source: "callback" });
              return PASSED;
            }
          })
        ],
        true
      ),
      {},
      [],
      { progressWriterFactory: () => output.writer }
    );

    assert.equal(result.kind, "output");
    if (result.kind !== "output") return;
    assert.deepEqual(result.diagnostic, { code: "progress-rendering-failed" });
    assert.equal(result.outputs.progressRendering.status, "failed");
    assert.match(output.attempts[1] ?? "", /\[record] accepted \| \{"source":"callback"}/);
    assert.deepEqual(result.snapshot.checks[0]?.outcome, PASSED);
    assert.deepEqual(result.snapshot.records, [
      { checkId: "custom", id: "accepted", data: { source: "callback" } }
    ]);
  });

  it("previews only accepted Records when Record misuse settles its Check unavailable", async () => {
    const output = capturedProgressWriter();
    const result = await executeValidatedRun(
      definition(
        [
          check({
            execution: ({ records }) => {
              records.report({ id: "accepted" }, { source: "callback" });
              const untypedReporter: Readonly<{
                report(identity: unknown, data: unknown): void;
              }> = records;
              untypedReporter.report({ extra: true, id: "rejected" }, { source: "invalid-record" });
              return PASSED;
            }
          })
        ],
        true
      ),
      {},
      [],
      { progressWriterFactory: () => output.writer }
    );

    assert.equal(result.kind, "completed");
    if (result.kind !== "completed") return;
    assert.deepEqual(result.snapshot.checks[0]?.outcome, {
      reason: { code: "record-invalid" },
      status: "unavailable"
    });
    assert.deepEqual(result.snapshot.records, [
      { checkId: "custom", id: "accepted", data: { source: "callback" } }
    ]);
    const transcript = output.writes.join("");
    assert.match(transcript, /\[record] accepted \| \{"source":"callback"}/);
    assert.doesNotMatch(transcript, /rejected|invalid-record/);
  });

  it("contains a TTY rewrite failure without leaving Check or Record facts open", async () => {
    const output = capturedProgressWriter({ isTTY: true, throwAtWrite: 3 });
    const slow = deferred<void>();
    const slowStarted = deferred<void>();
    const refresh = capturedRefreshScheduler();
    const running = executeValidatedRun(
      definition(
        [
          check({
            checkId: "slow",
            execution: async (context) => {
              context.records.report({ id: "sample" }, { metric: "score" });
              slowStarted.resolve(undefined);
              await slow.promise;
              return PASSED;
            },
            maxParallel: 2
          })
        ],
        true
      ),
      {},
      [],
      {
        progressRefreshScheduler: refresh.scheduler,
        progressWriterFactory: () => output.writer
      }
    );

    await slowStarted.promise;
    assert.equal(refresh.intervalMs(), 5_000);
    refresh.refresh();
    assert.equal(refresh.cancellations(), 1);
    slow.resolve(undefined);
    const result = await running;

    assert.equal(result.kind, "output");
    if (result.kind !== "output") return;
    assert.deepEqual(result.diagnostic, { code: "progress-rendering-failed" });
    assert.equal(result.outputs.progressRendering.status, "failed");
    assert.equal(output.attempts.length, 3);
    assert.equal(output.attempts[2], "\u001B[1A\u001B[2K");
    assert.equal(output.writes.length, 2);
    assert.equal(result.snapshot.checks.length, 1);
    assert.equal(result.snapshot.records.length, 1);
  });
});

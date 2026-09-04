import assert from "node:assert/strict";
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
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
  it("presents enabled Package Run progress through the injected plain writer", async () => {
    const output = capturedProgressWriter();
    const result = await executeValidatedRun(definition([check()], true), {}, [], {
      progressWriterFactory: () => output.writer
    });

    assert.equal(result.kind, "completed");
    assert.equal(result.outputs.progressRendering.status, "succeeded");
    assert.equal(output.writes[0], "Vibe Check\ntotal 1 checks\n\nChecks:\n");
    assert.match(output.writes[1] ?? "", /^ {2}\[1\/1] Custom \| passed \| \d+(?:\.\d+)?ms\n$/);
    assert.match(
      output.writes[2] ?? "",
      /^\nExecution summary:\n {2}execution: completed\n {2}total checks: 1\n {2}passed: 1\n {2}failed: 0\n {2}not applicable: 0\n {2}unavailable: 0\n {2}elapsed: \d+(?:\.\d+)?(?:ms|s)\n {2}check durations:\n {4}- custom: \d+(?:\.\d+)?(?:ms|s)\n$/
    );
  });

  it("tees one Run-selected progress log while retaining terminal output and every Check duration", async () => {
    const root = mkdtempSync(join(tmpdir(), "vibe-check-progress-log-"));
    try {
      const output = capturedProgressWriter();
      const result = await executeValidatedRun(
        definition(
          [
            check({ checkId: "executed" }),
            check({
              checkId: "not-run",
              enabledByFlags: { flags: ["selected"], mode: "all" }
            })
          ],
          true
        ),
        { progressLogFile: "evidence/progress.log", projectRoot: root },
        [],
        { progressWriterFactory: () => output.writer }
      );

      assert.equal(result.kind, "completed");
      assert.equal(result.outputs.progressRendering.status, "succeeded");
      const progressFile = join(root, "evidence", "progress.log");
      assert.equal(existsSync(progressFile), true);
      const transcript = readFileSync(progressFile, "utf8");
      assert.equal(transcript, output.writes.join(""));
      assert.match(
        transcript,
        /check durations:\n {4}- executed: \d+(?:\.\d+)?(?:ms|s)\n {4}- not-run: null\n/
      );
    } finally {
      rmSync(root, { force: true, recursive: true });
    }
  });

  it("keeps terminal progress when its selected file target cannot be opened", async () => {
    const root = mkdtempSync(join(tmpdir(), "vibe-check-progress-log-failure-"));
    try {
      writeFileSync(join(root, "not-a-directory"), "file", "utf8");
      const output = capturedProgressWriter();
      const result = await executeValidatedRun(
        definition([check()], true),
        { progressLogFile: "not-a-directory/progress.log", projectRoot: root },
        [],
        { progressWriterFactory: () => output.writer }
      );

      assert.equal(result.kind, "output");
      if (result.kind !== "output") return;
      assert.deepEqual(result.diagnostic, { code: "progress-rendering-failed" });
      assert.equal(result.outputs.progressRendering.status, "failed");
      assert.deepEqual(result.snapshot.checks[0]?.outcome, PASSED);
      assert.ok(output.writes.some((write) => write.includes("Execution summary:")));
    } finally {
      rmSync(root, { force: true, recursive: true });
    }
  });

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

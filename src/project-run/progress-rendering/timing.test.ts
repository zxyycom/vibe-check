import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { defineConfig } from "../../project-definition/project-definition.ts";
import type { Check, CheckExecution } from "../../check/check.ts";
import { deferred, scriptedClock } from "../execution-control.test-support.ts";
import type { ProgressWriter } from "./renderer.ts";
import { executeValidatedRun } from "../invocation.ts";

const PASSED = Object.freeze({ status: "passed" as const, data: Object.freeze({}) });

function check(
  overrides: Readonly<{
    readonly checkId: string;
    readonly execution: CheckExecution;
    readonly maxParallel: number;
  }>
): Check {
  return {
    checkId: overrides.checkId,
    displayName: overrides.checkId,
    execution: overrides.execution,
    maxParallel: overrides.maxParallel
  };
}

function capturedProgressWriter() {
  const writes: string[] = [];
  const writer: ProgressWriter = {
    color: false,
    isTTY: false,
    term: undefined,
    write: (content: string): void => {
      writes.push(content);
    }
  };
  return { writes, writer };
}

describe("Package Run progress timing", () => {
  it("uses the shared monotonic interval for elapsed progress rather than summing parallel Check durations", async () => {
    const output = capturedProgressWriter();
    const slow = deferred<void>();
    const fast = deferred<void>();
    const slowStarted = deferred<void>();
    const fastStarted = deferred<void>();
    const source = defineConfig({
      checks: [
        check({
          checkId: "slow",
          execution: async () => {
            slowStarted.resolve(undefined);
            await slow.promise;
            return PASSED;
          },
          maxParallel: 2
        }),
        check({
          checkId: "fast",
          execution: async () => {
            fastStarted.resolve(undefined);
            await fast.promise;
            return PASSED;
          },
          maxParallel: 2
        })
      ],
      outputs: {
        machinePublication: { enabled: false },
        progressRendering: { enabled: true }
      },
      scheduler: { maxParallel: 2 }
    });
    const running = executeValidatedRun(source, {}, [], {
      clock: scriptedClock([0, 5, 10, 30, 40, 40]),
      progressWriterFactory: () => output.writer
    });

    await slowStarted.promise;
    await fastStarted.promise;
    fast.resolve(undefined);
    await Promise.resolve();
    slow.resolve(undefined);
    const result = await running;

    assert.equal(result.kind, "completed");
    if (result.kind !== "completed") return;
    assert.deepEqual(result.checkDurations, [
      { checkId: "fast", durationMs: 20 },
      { checkId: "slow", durationMs: 35 }
    ]);
    assert.match(
      output.writes.at(-1) ?? "",
      / {2}elapsed: 40ms\n {2}check durations:\n {4}- fast: 20ms\n {4}- slow: 35ms\n$/
    );
  });
});

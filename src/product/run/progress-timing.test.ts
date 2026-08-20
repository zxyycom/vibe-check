import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { defineConfig, type Check, type CheckExecution } from "../definition/project.ts";
import type { CheckExecutionClock } from "./check-execution.ts";
import type { ProgressWriter } from "./progress.ts";
import { executeValidatedRun } from "./invocation.ts";

const COMPLETED = Object.freeze({ status: "completed" as const, verdict: "passed" as const });

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
    maxParallel: overrides.maxParallel,
    recordTypes: []
  };
}

function deferred<T>(): Readonly<{
  readonly promise: Promise<T>;
  readonly resolve: (value: T) => void;
}> {
  let resolvePromise: ((value: T) => void) | undefined;
  const promise = new Promise<T>((resolve) => {
    resolvePromise = resolve;
  });
  return Object.freeze({
    promise,
    resolve: (value: T): void => {
      if (resolvePromise === undefined) throw new Error("Deferred promise is not initialized");
      resolvePromise(value);
    }
  });
}

function scriptedClock(values: readonly number[]): CheckExecutionClock {
  const remaining = [...values];
  return Object.freeze({
    now: (): number => {
      const value = remaining.shift();
      if (value === undefined) throw new Error("Test clock received too many reads");
      return value;
    }
  });
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
            return COMPLETED;
          },
          maxParallel: 2
        }),
        check({
          checkId: "fast",
          execution: async () => {
            fastStarted.resolve(undefined);
            await fast.promise;
            return COMPLETED;
          },
          maxParallel: 2
        })
      ],
      effects: {
        cache: { enabled: false },
        logs: { enabled: false },
        output: { enabled: false },
        progress: { enabled: true }
      },
      scheduler: { maxParallel: 2 },
      selectedPolicy: null
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
    assert.match(output.writes.at(-1) ?? "", / {2}elapsed: 40ms\n$/);
  });
});

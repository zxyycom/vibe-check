import assert from "node:assert/strict";
import { existsSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, it } from "node:test";

import { defineConfig, type Check, type CheckExecution } from "../definition/project.ts";
import type { ProgressWriter } from "./progress.ts";
import { executeValidatedRun } from "./invocation.ts";

const PASSED = Object.freeze({ status: "passed" as const, data: Object.freeze({}) });

function check(
  overrides: Readonly<{
    readonly checkId?: string;
    readonly execution?: CheckExecution;
    readonly maxParallel?: number;
  }> = {}
): Check {
  return {
    checkId: overrides.checkId ?? "custom",
    displayName: overrides.checkId ?? "Custom",
    execution: overrides.execution ?? (() => PASSED),
    ...(overrides.maxParallel === undefined ? {} : { maxParallel: overrides.maxParallel })
  };
}

function definition(checks: readonly Check[], progress = false) {
  return defineConfig({
    checks,
    effects: {
      cache: { enabled: false },
      logs: { enabled: false },
      output: { enabled: false },
      progress: { enabled: progress }
    }
  });
}

function capturedProgressWriter(
  input: Readonly<{
    readonly isTTY?: boolean;
    readonly throwAtWrite?: number;
    readonly throws?: boolean;
  }> = {}
) {
  const attempts: string[] = [];
  const writes: string[] = [];
  const writer: ProgressWriter = {
    color: false,
    isTTY: input.isTTY ?? false,
    term: undefined,
    write: (content: string): void => {
      attempts.push(content);
      if (input.throws === true || input.throwAtWrite === attempts.length) {
        throw new Error("progress stream closed");
      }
      writes.push(content);
    }
  };
  return { attempts, writes, writer };
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

describe("Package Run progress effects", () => {
  it("presents enabled Package Run progress through the injected plain writer", async () => {
    const output = capturedProgressWriter();
    const result = await executeValidatedRun(definition([check()], true), {}, [], {
      progressWriterFactory: () => output.writer
    });

    assert.equal(result.kind, "completed");
    assert.equal(result.effects.progress.status, "succeeded");
    assert.equal(output.writes[0], "Vibe Check\ntotal 1 checks\n\nChecks:\n");
    assert.match(output.writes[1] ?? "", /^ {2}\[1\/1] Custom \| passed \| \d+(?:\.\d+)?ms\n$/);
    assert.match(
      output.writes[2] ?? "",
      /^\nExecution summary:\n {2}execution: completed\n {2}total checks: 1\n {2}passed: 1\n {2}failed: 0\n {2}not applicable: 0\n {2}unavailable: 0\n {2}elapsed: \d+(?:\.\d+)?(?:ms|s)\n$/
    );
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
    assert.equal(result.effects.progress.status, "disabled");
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
    assert.equal(result.kind, "effect");
    if (result.kind !== "effect") return;
    assert.deepEqual(result.diagnostic, { code: "effect-failed", effect: "progress" });
    assert.equal(result.effects.progress.status, "failed");
    assert.deepEqual(result.snapshot.checks[0]?.outcome, PASSED);
  });

  it("contains a TTY rewrite failure without leaving Check or Record facts open", async () => {
    const output = capturedProgressWriter({ isTTY: true, throwAtWrite: 3 });
    const slow = deferred<void>();
    const slowStarted = deferred<void>();
    const fastStarted = deferred<void>();
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
          }),
          check({
            checkId: "fast",
            execution: () => {
              fastStarted.resolve(undefined);
              return PASSED;
            },
            maxParallel: 2
          })
        ],
        true
      ),
      {},
      [],
      { progressWriterFactory: () => output.writer }
    );

    await slowStarted.promise;
    await fastStarted.promise;
    slow.resolve(undefined);
    const result = await running;

    assert.equal(result.kind, "effect");
    if (result.kind !== "effect") return;
    assert.deepEqual(result.diagnostic, { code: "effect-failed", effect: "progress" });
    assert.equal(result.effects.progress.status, "failed");
    assert.equal(output.attempts.length, 3);
    assert.equal(output.attempts[2], "\u001B[1A\u001B[2K");
    assert.equal(output.writes.length, 2);
    assert.equal(result.snapshot.checks.length, 2);
    assert.equal(result.snapshot.records.length, 1);
  });

  it("continues output publication after a progress writer failure", async () => {
    const output = capturedProgressWriter({ throws: true });
    const root = mkdtempSync(join(tmpdir(), "vibe-check-progress-output-"));
    try {
      const result = await executeValidatedRun(
        definition([check()], true),
        {
          effects: { output: { directory: "published", enabled: true } },
          projectRoot: root
        },
        [],
        { progressWriterFactory: () => output.writer }
      );

      assert.equal(result.kind, "effect");
      if (result.kind !== "effect") return;
      assert.deepEqual(result.diagnostic, { code: "effect-failed", effect: "progress" });
      assert.equal(result.effects.progress.status, "failed");
      assert.equal(result.effects.output.status, "succeeded");
      assert.equal(existsSync(join(root, "published", "run.json")), true);
      assert.equal(existsSync(join(root, "published", "records.ndjson")), true);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  it("selects cache before progress when both effects fail", async () => {
    const output = capturedProgressWriter({ throws: true });
    const result = await executeValidatedRun(
      definition(
        [
          check({
            execution: (context) => {
              context.project.cache.reportActivity("failed");
              return PASSED;
            }
          })
        ],
        true
      ),
      { effects: { cache: { enabled: true } } },
      [],
      { progressWriterFactory: () => output.writer }
    );

    assert.equal(result.kind, "effect");
    if (result.kind !== "effect") return;
    assert.deepEqual(result.diagnostic, { code: "effect-failed", effect: "cache" });
    assert.equal(result.effects.cache.status, "failed");
    assert.equal(result.effects.progress.status, "failed");
    assert.deepEqual(result.snapshot.checks[0]?.outcome, PASSED);
  });
});

import assert from "node:assert/strict";
import { existsSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, it } from "node:test";

import { defineConfig } from "../../project-definition/project-definition.ts";
import type { Check, CheckExecution } from "../../check/check.ts";
import type { ProgressWriter } from "./renderer.ts";
import { executeValidatedRun } from "../invocation.ts";

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
    outputs: {
      machinePublication: { enabled: false },
      progressRendering: { enabled: progress }
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

    assert.equal(result.kind, "output");
    if (result.kind !== "output") return;
    assert.deepEqual(result.diagnostic, { code: "progress-rendering-failed" });
    assert.equal(result.outputs.progressRendering.status, "failed");
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
          outputs: { machinePublication: { directory: "published", enabled: true } },
          projectRoot: root
        },
        [],
        { progressWriterFactory: () => output.writer }
      );

      assert.equal(result.kind, "output");
      if (result.kind !== "output") return;
      assert.deepEqual(result.diagnostic, { code: "progress-rendering-failed" });
      assert.equal(result.outputs.progressRendering.status, "failed");
      assert.equal(result.outputs.machinePublication.status, "succeeded");
      assert.equal(existsSync(join(root, "published", "run.json")), true);
      assert.equal(existsSync(join(root, "published", "records.ndjson")), true);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });
  it("returns output facts when machine publication alone fails", async () => {
    const root = mkdtempSync(join(tmpdir(), "vibe-check-machine-failure-"));
    try {
      writeFileSync(join(root, "blocked"), "not a directory");
      const result = await executeValidatedRun(
        definition([check()], false),
        {
          projectRoot: root,
          outputs: { machinePublication: { directory: "blocked", enabled: true } }
        },
        []
      );
      assert.equal(result.kind, "output");
      if (result.kind !== "output") return;
      assert.deepEqual(result.diagnostic, { code: "machine-publication-failed" });
      assert.equal(result.outputs.machinePublication.status, "failed");
      assert.equal(result.outputs.progressRendering.status, "disabled");
      assert.deepEqual(result.snapshot.checks[0]?.outcome, PASSED);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  it("keeps both failed outputs and prioritizes progress rendering", async () => {
    const root = mkdtempSync(join(tmpdir(), "vibe-check-output-failure-"));
    const output = capturedProgressWriter({ throws: true });
    try {
      writeFileSync(join(root, "blocked"), "not a directory");
      const result = await executeValidatedRun(
        definition([check()], true),
        {
          projectRoot: root,
          outputs: { machinePublication: { directory: "blocked", enabled: true } }
        },
        [],
        { progressWriterFactory: () => output.writer }
      );
      assert.equal(result.kind, "output");
      if (result.kind !== "output") return;
      assert.deepEqual(result.diagnostic, { code: "progress-rendering-failed" });
      assert.equal(result.outputs.progressRendering.status, "failed");
      assert.equal(result.outputs.machinePublication.status, "failed");
      assert.deepEqual(result.snapshot.checks[0]?.outcome, PASSED);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });
});

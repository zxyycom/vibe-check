import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, it } from "node:test";

import {
  assertCommandRunCancelsDuringExecution,
  createCommandCheckExecutionContext,
  createCommandCheckFixture,
  executeCommandCheckFixture
} from "./command-check.test-support.ts";
import { defineConfig } from "../../project-definition/project-definition.ts";
import { run } from "../../project-run/run.ts";
import type { CommandEnvironmentContext } from "./contract.ts";

describe("commandCheck terminal settlement", () => {
  it("does not invoke afterCommand for incomplete process results and delegates callback settlement to Core", async () => {
    const root = mkdtempSync(join(tmpdir(), "vibe-check-command-check-"));
    let callbackCalls = 0;
    try {
      const incomplete = createCommandCheckFixture({
        arguments: ["--eval", "setTimeout(() => {}, 1_000)"],
        afterCommand: {
          execute: () => {
            callbackCalls += 1;
            return { status: "passed", data: { unexpected: true } };
          }
        },
        timeoutMs: 20
      });
      assert.deepEqual(
        await incomplete.execute(createCommandCheckExecutionContext(incomplete.options, root)),
        {
          status: "unavailable",
          reason: { code: "command-timeout" }
        }
      );
      assert.equal(callbackCalls, 0);

      const thrown = createCommandCheckFixture({
        afterCommand: {
          execute: () => {
            throw new Error("after-command failure");
          }
        }
      });
      const result = await run(
        defineConfig({
          checks: [thrown],
          outputs: {
            diagnosticLogging: { enabled: false },
            machinePublication: { enabled: false },
            progressRendering: { enabled: false }
          }
        }),
        { projectRoot: root }
      );
      assert.equal(result.kind, "completed");
      if (result.kind !== "completed") return;
      assert.deepEqual(result.snapshot.checks[0]?.outcome, {
        status: "unavailable",
        reason: { code: "execution-threw" }
      });
    } finally {
      rmSync(root, { force: true, recursive: true });
    }
  });

  it("maps numeric exit, startup, timeout, output limit, and signal terminal branches", async () => {
    const root = mkdtempSync(join(tmpdir(), "vibe-check-command-check-"));
    try {
      assert.deepEqual(
        await executeCommandCheckFixture(
          createCommandCheckFixture({ arguments: ["--eval", "process.exit(23)"] }).options,
          root
        ),
        { status: "failed", data: { exitCode: 23 } }
      );
      assert.deepEqual(
        await executeCommandCheckFixture(
          createCommandCheckFixture({ executable: join(root, "does-not-exist") }).options,
          root
        ),
        { status: "unavailable", reason: { code: "command-start-failed" } }
      );
      assert.deepEqual(
        await executeCommandCheckFixture(
          createCommandCheckFixture({
            arguments: ["--eval", "setTimeout(() => {}, 1_000)"],
            timeoutMs: 20
          }).options,
          root
        ),
        { status: "unavailable", reason: { code: "command-timeout" } }
      );
      assert.deepEqual(
        await executeCommandCheckFixture(
          createCommandCheckFixture({
            arguments: ["--eval", "process.stdout.write('x'.repeat(1000))"],
            outputByteLimit: 32
          }).options,
          root
        ),
        { status: "unavailable", reason: { code: "command-output-limit-exceeded" } }
      );
      assert.deepEqual(
        await executeCommandCheckFixture(
          createCommandCheckFixture({
            arguments: ["--eval", "process.kill(process.pid, 'SIGTERM')"]
          }).options,
          root
        ),
        { status: "unavailable", reason: { code: "command-terminated-by-signal" } }
      );
    } finally {
      rmSync(root, { force: true, recursive: true });
    }
  });

  it("leaves caller cancellation to the ordinary Core execution outcome", async () => {
    const root = mkdtempSync(join(tmpdir(), "vibe-check-command-check-"));
    try {
      await assertCommandRunCancelsDuringExecution(
        createCommandCheckFixture({ arguments: ["--eval", "setTimeout(() => {}, 1_000)"] }),
        root,
        50
      );
    } finally {
      rmSync(root, { force: true, recursive: true });
    }
  });

  it("leaves resolver cancellation to the ordinary Core execution outcome", async () => {
    const root = mkdtempSync(join(tmpdir(), "vibe-check-command-check-"));
    try {
      await assertCommandRunCancelsDuringExecution(
        createCommandCheckFixture({
          resolveEnvironment: ({ signal }: CommandEnvironmentContext) =>
            new Promise((resolveEnvironment) => {
              signal.addEventListener(
                "abort",
                () => {
                  resolveEnvironment({ mode: "exact" });
                },
                { once: true }
              );
            })
        }),
        root,
        20
      );
    } finally {
      rmSync(root, { force: true, recursive: true });
    }
  });
});

import { defineContextCallback } from "../../package-tools/context-callback/define-context-callback.ts";
import assert from "node:assert/strict";
import { existsSync, mkdtempSync, rmSync } from "node:fs";
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

describe("commandCheck terminal settlement", () => {
  it("never publishes callback-derived data or Records from output-limited children", async () => {
    const root = mkdtempSync(join(tmpdir(), "vibe-check-command-incomplete-"));
    let callbackCalls = 0;
    try {
      const checks = [1, 2].flatMap((fd) =>
        [0, 23].map((exitCode) =>
          createCommandCheckFixture({
            checkId: `output-${fd}-exit-${exitCode}`,
            arguments: [
              "--eval",
              `require('node:fs').writeSync(${fd}, 'x'.repeat(4096)); setTimeout(() => process.exit(${exitCode}), 50)`
            ],
            outputByteLimit: 32,
            afterCommand: {
              execute: defineContextCallback("command.complete", {
                contextNeeds: ["records"],
                callback: (_input, { records }) => {
                  callbackCalls += 1;
                  records.report({ id: "partial-command" }, { unexpected: true });
                  return { status: "passed", data: { unexpected: true } };
                }
              })
            }
          })
        )
      );
      const result = await run(
        defineConfig({
          checks,
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
      assert.equal(callbackCalls, 0);
      assert.deepEqual(result.snapshot.records, []);
      for (const { outcome } of result.snapshot.checks) {
        // A racing numeric nonzero exit may retain its existing failed mapping.
        assert.equal(outcome.status === "failed" || outcome.status === "unavailable", true);
        if (outcome.status === "failed") assert.deepEqual(outcome.data, { exitCode: 23 });
        else {
          assert.deepEqual(outcome, {
            status: "unavailable",
            reason: { code: "command-output-limit-exceeded" }
          });
        }
      }
    } finally {
      rmSync(root, { force: true, recursive: true });
    }
  });

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
        await incomplete.execute.callback(
          incomplete.options,
          createCommandCheckExecutionContext(incomplete.options, root)
        ),
        {
          status: "unavailable",
          reason: { code: "command-timeout" }
        }
      );
      assert.equal(callbackCalls, 0);

      const thrown = createCommandCheckFixture({
        arguments: ["--eval", "process.exit(0)"],
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
      // Text capture uses Execa's approximate maxBuffer accounting, not a UTF-8 byte ceiling.
      assert.deepEqual(
        await executeCommandCheckFixture(
          createCommandCheckFixture({
            arguments: ["--eval", "process.stdout.write('中'.repeat(32))"],
            outputByteLimit: 64
          }).options,
          root
        ),
        { status: "passed", data: { exitCode: 0 } }
      );
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
    const readyPath = join(root, "cancellation-ready");
    const controller = new AbortController();
    let callbackCalls = 0;
    const command = createCommandCheckFixture({
      arguments: [
        "--eval",
        [
          "const fs = require('node:fs');",
          // Execa may close capture during cancellation; only that expected pipe failure is ignored.
          `process.on('SIGTERM', () => {
            try { fs.writeSync(1, 'x'.repeat(4096)); }
            catch (error) {
              if (!(error instanceof Error) || !('code' in error) || error.code !== 'EPIPE') throw error;
            }
            process.exit(23);
          });`,
          `fs.writeFileSync(${JSON.stringify(readyPath)}, 'ready');`,
          "setInterval(() => {}, 1_000);"
        ].join("\n")
      ],
      outputByteLimit: 32,
      timeoutMs: 5_000,
      afterCommand: {
        execute: defineContextCallback("command.complete", {
          contextNeeds: ["records"],
          callback: (_input, { records }) => {
            callbackCalls += 1;
            records.report({ id: "cancelled-command" }, { unexpected: true });
            return { status: "passed", data: { unexpected: true } };
          }
        })
      }
    });
    const running = run(
      defineConfig({
        checks: [command],
        outputs: {
          diagnosticLogging: { enabled: false },
          machinePublication: { enabled: false },
          progressRendering: { enabled: false }
        }
      }),
      { projectRoot: root, signal: controller.signal }
    );
    try {
      const deadline = Date.now() + 2_000;
      while (!existsSync(readyPath)) {
        assert.equal(Date.now() < deadline, true, "child did not signal cancellation readiness");
        await new Promise<void>((resolve) => {
          setTimeout(resolve, 10);
        });
      }
      controller.abort();
      const result = await running;
      assert.equal(result.kind, "cancelled");
      if (result.kind !== "cancelled") return;
      assert.equal(result.phase, "execution");
      if (result.phase !== "execution") return;
      assert.deepEqual(result.snapshot.checks[0]?.outcome, {
        status: "unavailable",
        reason: { code: "execution-cancelled" }
      });
      assert.equal(callbackCalls, 0);
      assert.deepEqual(result.snapshot.records, []);
    } finally {
      controller.abort();
      await running;
      rmSync(root, { force: true, recursive: true });
    }
  });

  it("leaves resolver cancellation to the ordinary Core execution outcome", async () => {
    const root = mkdtempSync(join(tmpdir(), "vibe-check-command-check-"));
    try {
      await assertCommandRunCancelsDuringExecution(
        createCommandCheckFixture({
          resolveEnvironment: defineContextCallback("command.environment", {
            contextNeeds: ["signal"],
            callback: (options, { signal }) =>
              new Promise<import("./contract.ts").CommandCheckEnvironment>((resolveEnvironment) => {
                signal.addEventListener(
                  "abort",
                  () => {
                    resolveEnvironment({ mode: "exact" });
                  },
                  { once: true }
                );
              })
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

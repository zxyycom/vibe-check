import assert from "node:assert/strict";
import { existsSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, it } from "node:test";

import { runProcess, runProcessSync } from "./runner.ts";

const forceKillBudget = { timeout: 12_000 };

describe("Product process runner", () => {
  it("forwards cancellation and preserves async terminal discriminants", async () => {
    const root = mkdtempSync(join(tmpdir(), "vibe-check-product-process-"));
    const startedPath = join(root, "started");
    const controller = new AbortController();
    const cancelledProcess = runProcess({
      args: ["-e", waitForCancellationSource(startedPath)],
      cancelSignal: controller.signal,
      command: process.execPath
    });

    try {
      await waitForPath(startedPath, 2_000);
      controller.abort();
      const cancelled = await cancelledProcess;
      assert.equal(cancelled.isCanceled, true);
      assert.equal(cancelled.timedOut, undefined);
      assert.equal(cancelled.isMaxBuffer, undefined);
      assert.equal(cancelled.status, null);

      const timedOut = await runProcess({
        args: ["-e", "setTimeout(() => process.exit(0), 5_000)"],
        command: process.execPath,
        timeout: 20
      });
      assert.equal(timedOut.isCanceled, undefined);
      assert.equal(timedOut.timedOut, true);
      assert.equal(timedOut.isMaxBuffer, undefined);

      const outputLimited = await runProcess({
        args: ["-e", maxBufferOutputSource()],
        command: process.execPath,
        maxBuffer: 32
      });
      assert.equal(outputLimited.isCanceled, undefined);
      assert.equal(outputLimited.timedOut, undefined);
      assert.equal(outputLimited.isMaxBuffer, true);
      assert.equal(outputLimited.isComplete, false);

      const signalled = await runProcess({
        args: ["-e", "process.kill(process.pid, 'SIGTERM')"],
        command: process.execPath
      });
      assert.equal(signalled.status, null);
      assert.equal(signalled.signal, "SIGTERM");
      assert.equal(signalled.isCanceled, undefined);
      assert.equal(signalled.timedOut, undefined);
      assert.equal(signalled.isMaxBuffer, undefined);
    } finally {
      controller.abort();
      await cancelledProcess;
      rmSync(root, { force: true, recursive: true });
    }
  });

  it("terminates output-limited children before execution timeout", forceKillBudget, async () => {
    const root = mkdtempSync(join(tmpdir(), "vibe-check-output-limit-"));
    try {
      for (const fd of [1, 2] as const) {
        for (const continuous of [false, true]) {
          await assertOutputLimitedChildExit(root, { continuous, fd, ignoreTermination: false });
        }
      }
      // Windows does not provide POSIX signal handlers or SIGKILL escalation semantics.
      if (process.platform !== "win32") {
        await assertOutputLimitedChildExit(root, {
          continuous: false,
          fd: 1,
          ignoreTermination: true
        });
      }
    } finally {
      rmSync(root, { force: true, recursive: true });
    }
  });

  it("retains synchronous numeric exits and captured output", () => {
    const result = runProcessSync({
      args: ["-e", "process.stdout.write('out');process.stderr.write('err');process.exit(7)"],
      command: process.execPath,
      encoding: "utf8",
      stdio: "pipe"
    });

    assert.equal(result.error, undefined);
    assert.equal(result.status, 7);
    assert.equal(result.stdout, "out");
    assert.equal(result.stderr, "err");
  });
});

async function assertOutputLimitedChildExit(
  root: string,
  options: Readonly<{ continuous: boolean; fd: 1 | 2; ignoreTermination: boolean }>
): Promise<void> {
  const name = `${options.fd}-${options.continuous}-${options.ignoreTermination}`;
  const pidPath = join(root, `${name}.pid`);
  const softTerminationPath = join(root, `${name}.sigterm`);
  const source = [
    "const fs = require('node:fs');",
    ...(options.ignoreTermination
      ? [
          `process.on('SIGTERM', () => fs.writeFileSync(${JSON.stringify(softTerminationPath)}, 'ignored'));`
        ]
      : []),
    `fs.writeFileSync(${JSON.stringify(pidPath)}, String(process.pid));`,
    // A closed capture pipe must not end this child before the executor terminates it.
    `const write = () => {
      try { fs.writeSync(${options.fd}, 'x'.repeat(4096)); }
      catch (error) {
        if (!(error instanceof Error) || !('code' in error) || error.code !== 'EPIPE') throw error;
      }
    };`,
    options.continuous ? "setInterval(write, 10);" : "write(); setInterval(() => {}, 1_000);"
  ].join("\n");
  let deadlineExpired = false;
  const controller = new AbortController();
  const running = runProcess({
    args: ["--eval", source],
    cancelSignal: controller.signal,
    command: process.execPath,
    maxBuffer: 32,
    timeout: 20_000
  });
  // A generous independent watchdog bounds a regression without lowering the command timeout.
  const watchdog = setTimeout(() => {
    deadlineExpired = true;
    controller.abort();
    killOwnedChild(pidPath);
  }, 9_000);
  try {
    await waitForPath(pidPath, 2_000);
    const result = await running;
    assert.equal(deadlineExpired, false, "overflow waited for the independent cleanup watchdog");
    assert.equal(result.isComplete, false);
    assert.equal(result.isMaxBuffer, true);
    assert.equal(result.timedOut, undefined);
    assert.equal(isOwnedChildAlive(pidPath), false, "resolved process still owns a live child PID");
    if (options.ignoreTermination) {
      assert.equal(existsSync(softTerminationPath), true, "child did not observe soft termination");
      assert.equal(result.signal, "SIGKILL");
    }
  } finally {
    clearTimeout(watchdog);
    controller.abort();
    killOwnedChild(pidPath);
    await running;
  }
}

function isOwnedChildAlive(pidPath: string): boolean {
  const pid = readOwnedChildPid(pidPath);
  if (pid === undefined) return false;
  try {
    process.kill(pid, 0);
    return true;
  } catch (error) {
    if (error instanceof Error && "code" in error && error.code === "ESRCH") return false;
    throw error;
  }
}

function killOwnedChild(pidPath: string): void {
  const pid = readOwnedChildPid(pidPath);
  if (pid === undefined) return;
  try {
    process.kill(pid, "SIGKILL");
  } catch (error) {
    // The child may exit between PID publication and cleanup; a liveness preflight cannot avoid it.
    if (error instanceof Error && "code" in error && error.code === "ESRCH") return;
    throw error;
  }
}

function readOwnedChildPid(pidPath: string): number | undefined {
  if (!existsSync(pidPath)) return undefined;
  const pid = Number(readFileSync(pidPath, "utf8"));
  assert.equal(Number.isSafeInteger(pid) && pid > 0, true, `invalid fixture PID: ${pidPath}`);
  return pid;
}

/** Writes more bytes than the configured buffer through synchronous fd output before the child exits. */
function maxBufferOutputSource(): string {
  return [
    "const { writeSync } = require('node:fs');",
    "for (let byte = 0; byte < 64; byte += 1) writeSync(1, 'x');"
  ].join("");
}

function waitForCancellationSource(startedPath: string): string {
  return [
    `require('node:fs').writeFileSync(${JSON.stringify(startedPath)}, 'started');`,
    "setInterval(() => undefined, 1_000);"
  ].join("");
}

async function waitForPath(filePath: string, timeoutMs: number): Promise<void> {
  const deadline = Date.now() + timeoutMs;
  while (!existsSync(filePath)) {
    if (Date.now() >= deadline) throw new Error(`child process did not create marker: ${filePath}`);
    await new Promise<void>((resolve) => {
      setTimeout(resolve, 10);
    });
  }
}

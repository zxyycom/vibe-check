import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import * as timers from "node:timers/promises";

export function isOwnedChildAlive(pidPath: string): boolean {
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

export function killOwnedChild(pidPath: string): void {
  const pid = readOwnedChildPid(pidPath);
  if (pid === undefined) return;
  try {
    process.kill(pid, "SIGKILL");
  } catch (error) {
    // The child may exit between PID publication and cleanup.
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

/** Runs only in an isolated Bun child: real signals and PID cleanup, a logical escalation clock. */
async function assertForceKill(root: string): Promise<void> {
  const pidPath = join(root, "force-kill.pid");
  const terminationPath = join(root, "force-kill.sigterm");
  const actualTimeout = timers.setTimeout;
  const clock: { advance?: () => void } = {};
  const bunTest = await import("bun:test");
  const mock: unknown = Reflect.get(bunTest, "mock");
  if (typeof mock !== "function") throw new Error("Bun mock unavailable");
  const mockModule: unknown = Reflect.get(mock, "module");
  if (typeof mockModule !== "function") throw new Error("Bun module mock unavailable");
  Reflect.apply(mockModule, mock, [
    "node:timers/promises",
    () => ({
      ...timers,
      setTimeout: (delay: number, value: unknown, options: Parameters<typeof actualTimeout>[2]) => {
        if (delay !== 5_000) return actualTimeout(delay, value, options);
        return new Promise((resolve) => {
          clock.advance = () => {
            resolve(value);
          };
        });
      }
    })
  ]);
  const { runProcess } = await import("./runner.ts");
  const controller = new AbortController();
  let isSettled = false;
  const running = runProcess({
    args: [
      "--eval",
      `const fs = require('node:fs');
       process.on('SIGTERM', () => fs.writeFileSync(${JSON.stringify(terminationPath)}, 'ignored'));
       fs.writeFileSync(${JSON.stringify(pidPath)}, String(process.pid));
       try { fs.writeSync(1, 'x'.repeat(4096)); }
       catch (error) { if (error.code !== 'EPIPE') throw error; }
       setInterval(() => {}, 1_000);`
    ],
    cancelSignal: controller.signal,
    command: process.execPath,
    maxBuffer: 32,
    timeout: 20_000
  }).then((result) => {
    isSettled = true;
    return result;
  });
  try {
    const acknowledgementDeadlineMs = performance.now() + 2_000;
    while (!existsSync(terminationPath)) {
      assert.ok(performance.now() < acknowledgementDeadlineMs, "child did not acknowledge SIGTERM");
      await timers.setImmediate();
    }
    assert.equal(isSettled, false);
    assert.equal(isOwnedChildAlive(pidPath), true);
    assert.ok(clock.advance, "executor did not request the default 5-second escalation timer");
    clock.advance();
    const result = await running;
    assert.equal(result.isComplete, false);
    assert.equal(result.isMaxBuffer, true);
    assert.equal(result.timedOut, undefined);
    assert.equal(result.signal, "SIGKILL");
    assert.equal(isOwnedChildAlive(pidPath), false);
  } finally {
    controller.abort();
    killOwnedChild(pidPath);
    clock.advance?.();
    await running;
  }
}

if (import.meta.main) {
  const root = process.argv[2];
  assert.ok(root, "expected a test-owned fixture root");
  await assertForceKill(root);
}

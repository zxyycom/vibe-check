import assert from "node:assert/strict";
import { existsSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, it } from "node:test";

import { runProcess, runProcessSync } from "./runner.ts";

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
      assert.equal(outputLimited.status, 0);

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

  it("retains synchronous numeric exits and captured output", () => {
    const result = runProcessSync({
      args: ["-e", "process.stdout.write('out');process.stderr.write('err');process.exit(7)"],
      command: process.execPath
    });

    assert.equal(result.error, undefined);
    assert.equal(result.status, 7);
    assert.equal(result.stdout, "out");
    assert.equal(result.stderr, "err");
  });
});

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

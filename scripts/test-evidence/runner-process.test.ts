import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

import { runBunCommand } from "./runner-process.ts";

const workspaceRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");

test("forwards cancellation to the Bun test discovery child", async () => {
  const temporaryRoot = fs.mkdtempSync(path.join(os.tmpdir(), "vibe-check-test-evidence-"));
  const startedPath = path.join(temporaryRoot, "started");
  const controller = new AbortController();
  const pending = runBunCommand({
    args: [
      "-e",
      `import { writeFileSync } from "node:fs"; writeFileSync(${JSON.stringify(startedPath)}, "started"); setTimeout(() => process.exit(0), 5000);`
    ],
    cancelSignal: controller.signal,
    label: "cancellation fixture",
    workspaceRoot
  });
  try {
    await waitForPath(startedPath, 2_000);
    controller.abort();
    const result = await pending;

    assert.equal(result.error instanceof Error, true);
    assert.equal(result.signal, "SIGTERM");
    assert.equal(result.status, null);
  } finally {
    controller.abort();
    await pending;
    fs.rmSync(temporaryRoot, { force: true, recursive: true });
  }
});

async function waitForPath(filePath: string, timeoutMs: number): Promise<void> {
  const deadline = Date.now() + timeoutMs;
  while (!fs.existsSync(filePath)) {
    if (Date.now() >= deadline) throw new Error(`child process did not create marker: ${filePath}`);
    await new Promise((resolve) => setTimeout(resolve, 10));
  }
}

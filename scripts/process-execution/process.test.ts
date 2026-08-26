import fs from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

import assert from "node:assert/strict";
import { test } from "node:test";

import { processFailed, runProcess, runProcessSync } from "./execution.ts";

test("detects failed process results", () => {
  assert.equal(processFailed({ status: 1 }), true);
  assert.equal(processFailed({ status: 0 }), false);
});

// @case AUX-WORKSPACE-PROCESS-001
test("runs child processes with plain text output environment", async () => {
  const env = colorEnabledEnv();
  const syncResult = runProcessSync({ args: childEnvProbeArgs(), command: process.execPath, env });
  assert.equal(syncResult.status, 0);
  assert.deepEqual(JSON.parse(syncResult.stdout), plainTextEnvValues());

  const asyncResult = await runProcess({
    command: process.execPath,
    args: childEnvProbeArgs(),
    env
  });
  assert.equal(asyncResult.status, 0);
  assert.deepEqual(JSON.parse(asyncResult.stdout), plainTextEnvValues());
});

test("cancels an already-started child process", async () => {
  const cancellationRoot = fs.mkdtempSync(path.join(tmpdir(), "vibe-check-process-execution-"));
  const startedPath = path.join(cancellationRoot, "started");
  const controller = new AbortController();
  const cancelledProcess = runProcess({
    args: [
      "-e",
      `require('node:fs').writeFileSync(${JSON.stringify(startedPath)}, 'started');setTimeout(() => process.exit(0), 5000)`
    ],
    cancelSignal: controller.signal,
    command: process.execPath
  });
  try {
    await waitForPath(startedPath, 2_000);
    controller.abort();
    const cancelledResult = await cancelledProcess;
    assert.equal(fs.existsSync(startedPath), true);
    assert.equal(cancelledResult.error instanceof Error, true);
    assert.equal(cancelledResult.signal, "SIGTERM");
    assert.equal(cancelledResult.status, null);
  } finally {
    controller.abort();
    await cancelledProcess;
    fs.rmSync(cancellationRoot, { force: true, recursive: true });
  }
});

async function waitForPath(filePath: string, timeoutMs: number): Promise<void> {
  const deadline = Date.now() + timeoutMs;
  while (!fs.existsSync(filePath)) {
    if (Date.now() >= deadline) throw new Error(`child process did not create marker: ${filePath}`);
    await new Promise((resolve) => setTimeout(resolve, 10));
  }
}
function childEnvProbeArgs(): string[] {
  const keys = Object.keys(plainTextEnvValues());
  return [
    "-e",
    [
      `const keys = ${JSON.stringify(keys)};`,
      "process.stdout.write(JSON.stringify(Object.fromEntries(keys.map((key) => [key, process.env[key] ?? null]))));"
    ].join(" ")
  ];
}
function colorEnabledEnv(): NodeJS.ProcessEnv {
  return {
    ...process.env,
    CARGO_TERM_COLOR: "always",
    CLICOLOR: "1",
    CLICOLOR_FORCE: "1",
    FORCE_COLOR: "1",
    NO_COLOR: "0",
    PNPM_CONFIG_COLOR: "true",
    PY_COLORS: "1",
    TERM: "xterm-256color",
    UV_NO_COLOR: "0",
    npm_config_color: "true"
  };
}
function plainTextEnvValues() {
  return {
    CARGO_TERM_COLOR: "never",
    CLICOLOR: "0",
    CLICOLOR_FORCE: "0",
    FORCE_COLOR: "0",
    NO_COLOR: "1",
    PNPM_CONFIG_COLOR: "false",
    PY_COLORS: "0",
    TERM: "dumb",
    UV_NO_COLOR: "1",
    npm_config_color: "false"
  };
}

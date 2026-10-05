import { quietControls, checkStatusesFor } from "../package-api-support/gate-example-acceptance.ts";

import assert from "node:assert/strict";

import { run } from "@zxyycom/vibe-check";

import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";

// #region package-api-example:gate-existing-command
import { commandCheck, defineConfig } from "@zxyycom/vibe-check";

const configCheck = commandCheck({
  checkId: "config",
  displayName: "Configuration",
  executable: process.execPath, // 复用启动 quality.ts 的运行时；本文使用 Node。
  arguments: ["tools/check-config.mjs"],
  environment: { mode: "exact" },
  timeoutMs: 30_000,
  outputByteLimit: 1024 * 1024
});

const definition = defineConfig({
  checks: [configCheck],
  outputs: { machinePublication: { enabled: false } }
});
// #endregion package-api-example:gate-existing-command

const statuses = checkStatusesFor(definition);
const fixtureRoot = mkdtempSync(join(tmpdir(), "vibe-check-gate-command-"));
function writeFixture(path: string, content: string) {
  const target = join(fixtureRoot, path);
  mkdirSync(dirname(target), { recursive: true });
  writeFileSync(target, content, "utf8");
}
try {
  writeFixture("tools/check-config.mjs", "process.exit(0);\n");
  const controls = { ...quietControls, projectRoot: fixtureRoot };
  assert.deepEqual(statuses(await run(definition, controls)), ["passed"]);
  writeFixture("tools/check-config.mjs", "process.exit(1);\n");
  assert.deepEqual(statuses(await run(definition, controls)), ["failed"]);
  writeFixture("tools/check-config.mjs", "setTimeout(() => process.exit(0), 60_000);\n");
  const bounded = defineConfig({
    checks: [
      commandCheck({
        checkId: "config",
        displayName: "Configuration",
        executable: process.execPath,
        arguments: ["tools/check-config.mjs"],
        environment: { mode: "exact" },
        timeoutMs: 50,
        outputByteLimit: 1024 * 1024
      })
    ],
    outputs: { machinePublication: { enabled: false } }
  });
  assert.deepEqual(statuses(await run(bounded, controls)), ["unavailable"]);
} finally {
  rmSync(fixtureRoot, { recursive: true, force: true });
}
